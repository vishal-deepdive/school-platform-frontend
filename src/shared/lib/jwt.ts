import type { User } from "@/features/auth/types";

export interface DecodedToken {
  sub: string;
  email: string;
  school_id: string | null;
  role: "admin" | "principal" | "teacher" | "student" | "parent";
  iat: number;
  exp: number;
  roll_no?: string | null;
  avatar_url?: string | null;
}

export function decodeJwt(token: string): DecodedToken | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const jsonPayload = decodeURIComponent(
      window
        .atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT token", error);
    return null;
  }
}

/** Build a User object from a decoded JWT. Applies safe fallbacks when decoding failed. */
export function buildUserFromJwt(
  decoded: DecodedToken | null,
  fallbackEmail: string,
  fullName: string | null = null,
): User {
  return {
    id: decoded?.sub ?? "",
    email: decoded?.email ?? fallbackEmail,
    full_name: fullName,
    // A valid backend access token always carries a role; this fallback only
    // fires if decoding failed outright (malformed token), in which case the
    // next API call 401s and the session is torn down anyway. Default to the
    // lowest-privilege consumer role rather than a bespoke sentinel.
    role: decoded?.role ?? "student",
    school_id: decoded?.school_id ?? null,
    is_active: true,
    is_email_verified: true,
    avatar_url: decoded?.avatar_url ?? null,
  };
}
