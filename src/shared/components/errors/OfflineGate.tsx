import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Globe,
  RefreshCw,
  ServerCrash,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { API_BASE_URL } from "@/shared/config/env";

/** Dispatched by the API layer when a request fails at the infrastructure level. */
export const NETWORK_ERROR_EVENT = "app:network-error";

const RECHECK_INTERVAL_MS = 5_000;
const PING_TIMEOUT_MS = 4_000;

/**
 * The precise reason the app can't reach the backend right now. A dropped Wi-Fi
 * link, a dead internet uplink, our servers being down, and our servers being
 * temporarily unavailable are four different problems the user can do four
 * different things about — so each gets its own honest message instead of a
 * catch-all "you're offline".
 */
type ConnectionStatus =
  | "online"
  | "no-network" // the device isn't on any network (Wi-Fi off, airplane mode)
  | "no-internet" // on a network, but it can't reach the public internet
  | "server-down" // the connection is fine, but our servers aren't responding
  | "maintenance"; // our servers are up but temporarily refusing service (503)

type ServerState = "up" | "down" | "maintenance";

/**
 * Is the public internet reachable? Probes a couple of highly-available hosts.
 * `no-cors` means we can't read the response, but the fetch still *resolves* on
 * a successful round-trip and *rejects* on a transport failure — which is all we
 * need. Any one host reachable proves the uplink is alive.
 */
async function hasInternet(): Promise<boolean> {
  const probes = [
    "https://www.gstatic.com/generate_204",
    "https://cloudflare.com/cdn-cgi/trace",
  ];
  for (const url of probes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    try {
      await fetch(`${url}?ping=${Date.now()}`, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      return true;
    } catch {
      // Try the next probe before concluding the internet is down.
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

/**
 * Ask our backend's public `/health` endpoint how it's doing. This is the
 * authoritative signal for "is the platform up" — a single unconfigured-feature
 * 503 elsewhere won't flip it, so it cleanly separates a real outage from a
 * one-off failed request.
 */
async function checkServer(): Promise<ServerState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/health?ping=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    // 503 = up but deliberately refusing service (deploy / degraded dependency).
    if (res.status === 503) return "maintenance";
    // 502/504 = a gateway can't reach the app process behind it → effectively down.
    if (res.status === 502 || res.status === 504) return "down";
    // Any other response means the server answered us, so it's alive.
    return "up";
  } catch {
    // Never completed the round-trip — unreachable.
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Diagnose the exact connectivity problem, cheapest checks first:
 *   1. no local link at all             → no-network
 *   2. our server answers               → online / maintenance
 *   3. server unreachable, internet ok  → server-down
 *   4. server unreachable, no internet  → no-internet
 */
async function diagnose(): Promise<ConnectionStatus> {
  // `navigator.onLine === false` is a hard "no link" (Wi-Fi off, airplane mode);
  // `true` only means a local link exists, not that it reaches anything, so we
  // still probe below.
  if (!navigator.onLine) return "no-network";

  const server = await checkServer();
  if (server === "up") return "online";
  if (server === "maintenance") return "maintenance";

  // Server didn't answer — is the internet itself down, or just our servers?
  return (await hasInternet()) ? "server-down" : "no-internet";
}

/** Copy + iconography for each non-online state. */
const STATUS_UI: Record<
  Exclude<ConnectionStatus, "online">,
  { icon: LucideIcon; title: string; description: string }
> = {
  "no-network": {
    icon: WifiOff,
    title: "You're offline",
    description:
      "Your device isn't connected to Wi-Fi or a network. Reconnect and this page will pick up right where you left off.",
  },
  "no-internet": {
    icon: Globe,
    title: "No internet access",
    description:
      "You're connected to a network, but it can't reach the internet. Check your router or try another network — nothing here is lost.",
  },
  "server-down": {
    icon: ServerCrash,
    title: "We can't reach DeepDive",
    description:
      "Your connection looks fine, but our servers aren't responding right now. We're on it — this page will reconnect automatically.",
  },
  maintenance: {
    icon: Wrench,
    title: "Down for maintenance",
    description:
      "DeepDive is briefly unavailable while we make some updates. It'll be back shortly — this page will reconnect on its own.",
  },
};

/**
 * Renders the app as-is, and lays a full-screen status page over it whenever the
 * app can't reach the backend. The page underneath stays mounted, so no form
 * state or navigation is lost; the overlay names the *actual* problem (offline,
 * no internet, server down, or maintenance) and dismisses itself the moment
 * connectivity returns (re-checked every few seconds and on the browser's
 * `online` event).
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    navigator.onLine ? "online" : "no-network",
  );
  const [checking, setChecking] = useState(false);
  const verifying = useRef(false);

  /** Move to a new status; celebrate the transition back to online. */
  const apply = useCallback((next: ConnectionStatus) => {
    setStatus((prev) => {
      if (prev !== "online" && next === "online") {
        toast.success("You're back online.");
      }
      return next;
    });
  }, []);

  /** Diagnose once and reflect whatever we find. */
  const verify = useCallback(async () => {
    if (verifying.current) return;
    verifying.current = true;
    try {
      apply(await diagnose());
    } finally {
      verifying.current = false;
    }
  }, [apply]);

  // Browser-level signals.
  useEffect(() => {
    // The browser lost its link entirely — no need to probe to know that.
    const onOffline = () => setStatus("no-network");
    const onOnline = () => void verify();
    const onNetworkError = () => {
      // An API call failed at the transport/gateway level — confirm the cause
      // before alarming (it may be a transient blip that's already recovered).
      if (!verifying.current) void verify();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    };
  }, [verify]);

  const offline = status !== "online";

  // While something's wrong, keep probing so the app recovers without user action.
  useEffect(() => {
    if (!offline) return;
    const id = setInterval(() => void verify(), RECHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [offline, verify]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const next = await diagnose();
      apply(next);
      if (next !== "online") toast.error("Still no luck. We'll keep trying.");
    } finally {
      setChecking(false);
    }
  };

  const ui = status === "online" ? null : STATUS_UI[status];
  const Icon = ui?.icon;

  return (
    <>
      {children}
      {ui && Icon && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="offline-title"
          aria-describedby="offline-description"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-6"
        >
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>

            <h1
              id="offline-title"
              className="mt-5 text-xl font-semibold tracking-tight text-foreground"
            >
              {ui.title}
            </h1>
            <p
              id="offline-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {ui.description}
            </p>

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => void handleManualCheck()}
                disabled={checking}
                icon={
                  <RefreshCw
                    className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                }
              >
                {checking ? "Checking…" : "Try again"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
