import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { API_BASE_URL } from "@/shared/config/env";
import { useAuthStore } from "@/features/auth/store/auth";
import { decodeJwt } from "@/shared/lib/jwt";

const BASE_URL = API_BASE_URL;
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;

// ─── Token helpers ────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  return useAuthStore.getState().accessToken;
}

/** Current access token, if any. Exposed for non-axios callers (e.g. SSE fetch). */
export function getAccessToken(): string | null {
  return getStoredToken();
}

/** True when a session exists to refresh (see hasSession). Exposed for SSE fetch. */
export function hasActiveSession(): boolean {
  return hasSession();
}

/**
 * The persisted `user` (role, school_id) lives in localStorage, so it is both
 * tamperable and can drift stale — a server-side role change or school move
 * lands in the next access token, not the stored user object. The signed access
 * token is authoritative, so on load and after every refresh we reconcile the
 * store's role/school_id to whatever the current token actually claims. This
 * defeats naive localStorage edits (the token the backend validates is
 * unchanged, so a forged `user.role` can no longer flip the UI) and keeps the
 * UI in sync after a promotion/scope change without forcing a re-login.
 */
export function reconcileUserFromToken(token?: string | null): void {
  const active = token ?? getStoredToken();
  if (!active) return;
  const decoded = decodeJwt(active);
  if (!decoded) return;

  const { user, updateUser } = useAuthStore.getState();
  if (!user) return;

  const patch: Partial<typeof user> = {};
  if (decoded.role && decoded.role !== user.role) patch.role = decoded.role;
  if (decoded.school_id !== user.school_id) patch.school_id = decoded.school_id;
  const mustChangePassword = decoded.must_change_password ?? false;
  if (mustChangePassword !== user.must_change_password) patch.must_change_password = mustChangePassword;
  if (Object.keys(patch).length > 0) updateUser(patch);
}

/**
 * There is no session to refresh when the store has no access token and the user
 * is not marked authenticated. The refresh token itself lives in an HttpOnly
 * cookie the browser attaches automatically, so JS can't inspect it directly —
 * we gate on the session flags instead.
 */
function hasSession(): boolean {
  const { accessToken, isAuthenticated } = useAuthStore.getState();
  return Boolean(accessToken) || isAuthenticated;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A refresh 429 comes with a Retry-After header (see the backend's
// rate_limit_headers()) — the actual seconds left in that rate-limit window,
// which is far more accurate than guessing with a flat per-attempt backoff.
// Capped so a misbehaving/looser tier can never wedge this loop (and every
// caller awaiting refreshAccessToken with it) for an unreasonable stretch.
const MAX_RETRY_AFTER_MS = 5_000;

/** Backoff for the next refresh attempt: the server's Retry-After on a 429
 * (capped), else the existing flat `attempt * 1s` for other transient errors. */
function retryDelayMs(err: unknown, attempt: number): number {
  if (axios.isAxiosError(err) && err.response?.status === 429) {
    const header = err.response.headers?.["retry-after"];
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
    }
  }
  return attempt * 1_000;
}

/**
 * Raised when there is genuinely no session to work with. Treated the same as a
 * 401/403 from the refresh endpoint: the session is unrecoverable.
 */
class RefreshAuthError extends Error {}

/**
 * A definitive rejection means the refresh token itself is invalid / expired /
 * revoked — only then is the session unrecoverable and the user must log in
 * again. Network errors, timeouts, 429 (rate limit) and 5xx are *transient*:
 * the refresh token is still good, so we must NOT log the user out for those.
 */
export function isDefinitiveAuthFailure(err: unknown): boolean {
  if (err instanceof RefreshAuthError) return true;
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === 401 || status === 403;
}

// ─── Auth-endpoint guard ──────────────────────────────────────────────────────
// A 401 from these endpoints must never trigger a token refresh (the refresh
// endpoint refreshing itself would loop; login/otp 401s are real credentials
// failures, not expired-session failures).

const AUTH_ENDPOINT_PATTERN =
  /\/auth\/(login|register|verify-otp|forgot-password|reset-password|resend-otp|refresh|oauth)/;

// ─── Single-flight refresh ────────────────────────────────────────────────────
// One in-flight refresh is shared by every caller — concurrent 401s, the
// proactive timer, and both axios instances (apiClient + multipartClient) all
// await the same promise instead of each hitting /refresh and rotating the
// token out from under one another (which would trip backend reuse detection).

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  if (!hasSession()) throw new RefreshAuthError("No session");

  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Bare axios (no interceptors) so the refresh call can never recurse.
      // withCredentials sends the HttpOnly refresh cookie; the rotated cookie
      // comes back in the response's Set-Cookie and the browser stores it. No
      // refresh token ever passes through JS.
      const res = await axios.post<{ access_token: string }>(
        `${NORMALIZED_BASE}/api/v1/auth/refresh`,
        {},
        { timeout: 15_000, withCredentials: true },
      );

      const { access_token } = res.data;
      // setTokens fires the store subscription below, which reschedules the
      // proactive refresh for the new token.
      useAuthStore.getState().setTokens({ access_token });
      // The rotated token is the freshest source of truth for role/school —
      // reconcile the persisted user so a server-side change takes effect now.
      reconcileUserFromToken(access_token);
      return access_token;
    } catch (err) {
      lastError = err;
      // A genuinely-rejected refresh token will never succeed on retry.
      if (isDefinitiveAuthFailure(err)) throw err;
      // Transient (network / timeout / 429 / 5xx) — back off and retry.
      if (attempt < MAX_ATTEMPTS) await delay(retryDelayMs(err, attempt));
    }
  }

  throw lastError;
}

/** Returns the shared in-flight refresh, starting one if none is running. */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function forceLogout(): void {
  cancelProactiveRefresh();
  useAuthStore.getState().logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ─── Proactive refresh scheduler ──────────────────────────────────────────────
// Refresh the access token in the background slightly before it expires, so a
// real request almost never has to eat a 401 first. This is both more efficient
// (no per-cycle "401 → refresh → retry" round trip) and far more robust (a
// background refresh that hits a transient blip just retries later instead of
// failing a user-facing request).

const PROACTIVE_REFRESH_SKEW_MS = 60_000; // renew 60s before the token expires
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

export function cancelProactiveRefresh(): void {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

export function scheduleProactiveRefresh(accessToken?: string | null): void {
  if (typeof window === "undefined") return;
  cancelProactiveRefresh();

  const token = accessToken ?? getStoredToken();
  if (!token || !hasSession()) return;

  const decoded = decodeJwt(token);
  if (!decoded?.exp) return;

  const fireInMs = decoded.exp * 1_000 - PROACTIVE_REFRESH_SKEW_MS - Date.now();
  // If the token is already within the skew window (or expired), refresh ASAP.
  const safeDelay = Math.max(0, fireInMs);

  proactiveTimer = setTimeout(() => {
    if (!hasSession()) return;
    refreshAccessToken().catch((err) => {
      // Only a definitive rejection ends the session. Transient failures are
      // swallowed here — the next request's 401 (or the next timer) recovers.
      if (isDefinitiveAuthFailure(err)) forceLogout();
    });
  }, safeDelay);
}

/**
 * Start proactive refresh from whatever token is already persisted (page load,
 * new tab) and keep it in sync as the token changes (login, refresh, logout,
 * and cross-tab rehydration all flow through the store).
 */
export function initAuthRefresh(): void {
  if (typeof window === "undefined") return;
  // Trust the persisted access token over the persisted user object on boot,
  // in case localStorage was tampered with or the stored role went stale.
  reconcileUserFromToken();
  scheduleProactiveRefresh();
}

// Reschedule (or cancel) whenever the access token changes — covers login,
// rotation, manual logout, and cross-tab `persist.rehydrate()`.
useAuthStore.subscribe((state, prev) => {
  if (state.accessToken === prev.accessToken) return;
  if (state.accessToken) scheduleProactiveRefresh(state.accessToken);
  else cancelProactiveRefresh();
});

// ─── HOF: attaches request auth + 401→refresh→retry to any axios instance ─────

function withAuthInterceptors(client: AxiosInstance): AxiosInstance {
  // Attach access token to every outgoing request.
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 → refresh → retry (single attempt per request).
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error);

      // Infrastructure-level failure: the request either never reached the
      // server (ERR_NETWORK) or died at a gateway (502/504) or the server is
      // temporarily refusing service (503). Signal the OfflineGate, which
      // diagnoses the exact cause and takes over the screen if the whole app is
      // unreachable. A 503 from a single unconfigured feature is harmless here —
      // the gate re-checks /health (which stays 200) and dismisses itself.
      const infraStatus = error.response?.status;
      const isInfraFailure =
        error.code === "ERR_NETWORK" ||
        infraStatus === 502 ||
        infraStatus === 503 ||
        infraStatus === 504;
      // String literal (not the exported constant) to keep OfflineGate's React
      // module out of the API client's import graph — see NETWORK_ERROR_EVENT.
      if (isInfraFailure && typeof window !== "undefined") {
        window.dispatchEvent(new Event("app:network-error"));
      }

      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      const isAuthEndpoint = AUTH_ENDPOINT_PATTERN.test(originalRequest?.url ?? "");

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        isAuthEndpoint
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Shared single-flight refresh — concurrent 401s coalesce into one.
        const token = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        if (isDefinitiveAuthFailure(refreshError)) {
          // Session is genuinely dead — log out.
          forceLogout();
          return Promise.reject(
            new Error("Session expired. Please log in again."),
          );
        }
        // Transient refresh failure: keep the session intact and surface the
        // original error so the caller (e.g. React Query) can retry later.
        return Promise.reject(error);
      }
    },
  );

  return client;
}

// ─── Exported clients ─────────────────────────────────────────────────────────

// withCredentials so the browser stores the refresh cookie from login/refresh
// responses and returns it on /refresh & /logout. The cookie is path-scoped to
// /api/v1/auth, so it is only ever sent to those endpoints.
export const apiClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  }),
);

export const multipartClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 300_000,
    withCredentials: true,
  }),
);
