import { useEffect, useId, useRef } from "react";

/**
 * Cloudflare Turnstile widget, loaded on demand (no npm dependency — just the
 * one official script tag). Renders nothing when `siteKey` is empty, so pages
 * that mount this unconditionally are safe in local/dev where CAPTCHA is off.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export function CaptchaWidget({
  siteKey,
  onVerify,
  onExpire,
  resetKey = 0,
}: {
  siteKey: string | null | undefined;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /**
   * Turnstile tokens are single-use — bump this counter after consuming one
   * (e.g. after a resend/lookup call) to remove and re-render the widget so
   * the user can obtain a fresh token.
   */
  resetKey?: number;
}) {
  const containerId = `turnstile-${useId().replace(/:/g, "")}`;
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: siteKey,
          callback: onVerify,
          "expired-callback": onExpire,
          theme: "light",
        });
      })
      .catch(() => {
        // Fails soft — the submit button stays enabled; the backend will
        // reject with "captcha_required" and the user sees a clear toast.
      });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId, resetKey]);

  if (!siteKey) return null;

  return <div id={containerId} className="flex justify-center" />;
}
