import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ─── localStorage helpers ─────────────────────────────────────────────────────

interface StoredAuthState {
  state?: { accessToken?: string; refreshToken?: string }
}

function parseAuthStorage(): StoredAuthState | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    return raw ? (JSON.parse(raw) as StoredAuthState) : null
  } catch {
    return null
  }
}

function getStoredToken(): string | null {
  return parseAuthStorage()?.state?.accessToken ?? null
}

function getStoredRefreshToken(): string | null {
  return parseAuthStorage()?.state?.refreshToken ?? null
}

function updateStoredTokens(accessToken: string, refreshToken: string): void {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return
    const current = JSON.parse(raw) as { state?: Record<string, unknown> }
    if (current.state) {
      current.state.accessToken = accessToken
      current.state.refreshToken = refreshToken
      localStorage.setItem('auth-storage', JSON.stringify(current))
    }
  } catch {
    // malformed storage — leave it alone
  }
}

function handleRefreshFailure(err: unknown): void {
  const isAuthError =
    axios.isAxiosError(err) &&
    err.response?.status != null &&
    [401, 403].includes(err.response.status)
  const isNoToken = err instanceof Error && err.message === 'No refresh token'

  if (isAuthError || isNoToken) {
    localStorage.removeItem('auth-storage')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
}

// ─── Auth-endpoint guard ──────────────────────────────────────────────────────

const AUTH_ENDPOINT_PATTERN =
  /\/auth\/(login|register|verify-otp|forgot-password|reset-password|resend-otp|refresh)/

// ─── Shared refresh state ─────────────────────────────────────────────────────
// Both clients share this so a concurrent 401 from a multipart upload doesn't
// race with a JSON request to refresh the token twice.

const refreshState = {
  isRefreshing: false,
  failedQueue: [] as Array<{
    resolve: (token: string) => void
    reject: (error: unknown) => void
  }>,
}

function processQueue(error: unknown, token: string | null): void {
  refreshState.failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  refreshState.failedQueue = []
}

// ─── HOF: attaches request auth + 401→refresh→retry to any axios instance ─────

function withAuthInterceptors(client: AxiosInstance): AxiosInstance {
  // Attach access token to every outgoing request
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Handle 401 → refresh → retry
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error)

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }
      const isAuthEndpoint = AUTH_ENDPOINT_PATTERN.test(originalRequest.url ?? '')

      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        isAuthEndpoint
      ) {
        return Promise.reject(error)
      }

      // Queue concurrent requests while a refresh is already in-flight
      if (refreshState.isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshState.failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      refreshState.isRefreshing = true

      try {
        const refreshToken = getStoredRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')

        // Dedicated axios instance with a short timeout prevents the browser
        // from hanging indefinitely when the backend is slow / unresponsive.
        const res = await axios.post<{
          access_token: string
          refresh_token: string
        }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { timeout: 10_000 },
        )

        const { access_token, refresh_token } = res.data
        updateStoredTokens(access_token, refresh_token)
        processQueue(null, access_token)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        handleRefreshFailure(refreshError)
        return Promise.reject(refreshError)
      } finally {
        refreshState.isRefreshing = false
      }
    },
  )

  return client
}

// ─── Exported clients ─────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 60_000,
    headers: { 'Content-Type': 'application/json' },
  }),
)

export const multipartClient: AxiosInstance = withAuthInterceptors(
  axios.create({
    baseURL: BASE_URL,
    timeout: 300_000,
  }),
)
