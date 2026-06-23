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

function getStoredRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Raised when there is genuinely no refresh token to work with. Treated the
 * same as a 401/403 from the refresh endpoint: the session is unrecoverable.
 */
class RefreshAuthError extends Error {}

/**
 * A definitive rejection means the refresh token itself is invalid / expired /
 * revoked — only then is the session unrecoverable and the user must log in
 * again. Network errors, timeouts, 429 (rate limit) and 5xx are *transient*:
 * the refresh token is still good, so we must NOT log the user out for those.
 */
function isDefinitiveAuthFailure(err: unknown): boolean {
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
  /\/auth\/(login|register|verify-otp|forgot-password|reset-password|resend-otp|refresh)/;

// ─── Single-flight refresh ────────────────────────────────────────────────────
// One in-flight refresh is shared by every caller — concurrent 401s, the
// proactive timer, and both axios instances (apiClient + multipartClient) all
// await the same promise instead of each hitting /refresh and rotating the
// token out from under one another (which would trip backend reuse detection).

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  if (!getStoredRefreshToken()) throw new RefreshAuthError("No refresh token");

  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Re-read on every attempt: another tab may have rotated the token while
    // we were retrying a transient failure.
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) throw new RefreshAuthError("No refresh token");

    try {
      // Bare axios (no interceptors) so the refresh call can never recurse.
      const res = await axios.post<{
        access_token: string;
        refresh_token: string;
      }>(
        `${NORMALIZED_BASE}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 15_000 },
      );

      const { access_token, refresh_token } = res.data;
      // setTokens fires the store subscription below, which reschedules the
      // proactive refresh for the new token.
      useAuthStore.getState().setTokens({ access_token, refresh_token });
      return access_token;
    } catch (err) {
      lastError = err;
      // A genuinely-rejected refresh token will never succeed on retry.
      if (isDefinitiveAuthFailure(err)) throw err;
      // Transient (network / timeout / 429 / 5xx) — back off and retry.
      if (attempt < MAX_ATTEMPTS) await delay(attempt * 1_000);
    }
  }

  throw lastError;
}

/** Returns the shared in-flight refresh, starting one if none is running. */
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function forceLogout(): void {
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
  if (!token || !getStoredRefreshToken()) return;

  const decoded = decodeJwt(token);
  if (!decoded?.exp) return;

  const fireInMs = decoded.exp * 1_000 - PROACTIVE_REFRESH_SKEW_MS - Date.now();
  // If the token is already within the skew window (or expired), refresh ASAP.
  const safeDelay = Math.max(0, fireInMs);

  proactiveTimer = setTimeout(() => {
    if (!getStoredRefreshToken()) return;
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

export const apiClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
  }),
);

export const multipartClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 300_000,
  }),
);
