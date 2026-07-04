import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/Button";

/** Dispatched by the API layer when a request dies without reaching the server. */
export const NETWORK_ERROR_EVENT = "app:network-error";

const RECHECK_INTERVAL_MS = 5_000;
const PING_TIMEOUT_MS = 4_000;

/**
 * Confirm real connectivity by fetching a tiny same-origin asset.
 * `navigator.onLine` only reflects the local link — a router with no internet
 * still reports `true` — so a failed API call triggers this deeper check.
 */
async function hasConnectivity(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    await fetch(`/favicon.png?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Renders the app as-is, and lays a full-screen "You're offline" page over it
 * whenever the connection drops. The page underneath stays mounted, so no form
 * state or navigation is lost; the overlay dismisses itself the moment the
 * connection returns (checked every few seconds and on the browser's `online`
 * event).
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [checking, setChecking] = useState(false);
  const verifying = useRef(false);

  const restore = useCallback(() => {
    setOffline((was) => {
      if (was) toast.success("You're back online.");
      return false;
    });
  }, []);

  /** Verify connectivity once; flip state in whichever direction is true. */
  const verify = useCallback(async () => {
    if (verifying.current) return;
    verifying.current = true;
    try {
      if (await hasConnectivity()) restore();
      else setOffline(true);
    } finally {
      verifying.current = false;
    }
  }, [restore]);

  // Browser-level signals.
  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => void verify();
    const onNetworkError = () => {
      // An API call failed at the transport level — confirm before alarming.
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

  // While offline, keep probing so the page recovers without user action.
  useEffect(() => {
    if (!offline) return;
    const id = setInterval(() => void verify(), RECHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [offline, verify]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      if (await hasConnectivity()) restore();
      else toast.error("Still no connection. We'll keep trying.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      {children}
      {offline && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="offline-title"
          aria-describedby="offline-description"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-6"
        >
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>

            <h1
              id="offline-title"
              className="mt-5 text-xl font-semibold tracking-tight text-foreground"
            >
              You're offline
            </h1>
            <p
              id="offline-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              Your device isn't connected to the internet. Nothing is lost —
              this page will pick up right where you left off once the
              connection returns.
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
                {checking ? "Checking…" : "Check again"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
