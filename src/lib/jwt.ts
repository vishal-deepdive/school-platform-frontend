export interface DecodedToken {
  sub: string
  email: string
  school_id: string | null
  role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent' | 'viewer'
  iat: number
  exp: number
  roll_no?: string | null
  avatar_url?: string | null
}

export function decodeJwt(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT token', error)
    return null
  }
}
