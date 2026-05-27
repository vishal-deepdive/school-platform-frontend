import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem('auth-storage')
  if (raw) {
    try {
      const state = JSON.parse(raw) as { state?: { accessToken?: string } }
      const token = state?.state?.accessToken
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // malformed storage — skip
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const raw = localStorage.getItem('auth-storage')
        const state = raw ? (JSON.parse(raw) as { state?: { refreshToken?: string } }) : null
        const refreshToken = state?.state?.refreshToken

        if (!refreshToken) throw new Error('No refresh token')

        // Use a dedicated axios instance with an explicit timeout so a slow or
        // unresponsive backend does not cause the refresh call to hang forever.
        // Previously this used bare axios.post() with no timeout (axios default = 0 = ∞),
        // which caused the browser to hang until the connection dropped, then clear
        // localStorage and redirect to /login — appearing as an unexpected "auto reload".
        const res = await axios.post<{ access_token: string; refresh_token: string }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { timeout: 10_000 },
        )

        const { access_token, refresh_token } = res.data

        const currentRaw = localStorage.getItem('auth-storage')
        if (currentRaw) {
          const current = JSON.parse(currentRaw) as { state?: Record<string, unknown> }
          if (current.state) {
            current.state.accessToken = access_token
            current.state.refreshToken = refresh_token
            localStorage.setItem('auth-storage', JSON.stringify(current))
          }
        }

        processQueue(null, access_token)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export const multipartClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000,
})

multipartClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem('auth-storage')
  if (raw) {
    try {
      const state = JSON.parse(raw) as { state?: { accessToken?: string } }
      const token = state?.state?.accessToken
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // skip
    }
  }
  return config
})

// multipartClient needs the same 401 → refresh → retry logic as apiClient.
// Without this, file uploads that hit an expired access token silently fail
// with a 401 and never attempt to renew the session.
multipartClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const raw = localStorage.getItem('auth-storage')
        const state = raw ? (JSON.parse(raw) as { state?: { refreshToken?: string } }) : null
        const refreshToken = state?.state?.refreshToken

        if (!refreshToken) throw new Error('No refresh token')

        const res = await axios.post<{ access_token: string; refresh_token: string }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { timeout: 10_000 },
        )

        const { access_token, refresh_token } = res.data

        const currentRaw = localStorage.getItem('auth-storage')
        if (currentRaw) {
          const current = JSON.parse(currentRaw) as { state?: Record<string, unknown> }
          if (current.state) {
            current.state.accessToken = access_token
            current.state.refreshToken = refresh_token
            localStorage.setItem('auth-storage', JSON.stringify(current))
          }
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return multipartClient(originalRequest)
      } catch {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)
