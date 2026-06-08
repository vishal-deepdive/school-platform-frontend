/**
 * Centralised sessionStorage access.
 * All session key strings live here — no magic strings elsewhere in the codebase.
 */

export const SESSION_KEYS = {
  GOOGLE_SIGNUP: "google_signup_session",
  PENDING_ROLE: "google_pending_role",
  PENDING_INVITE_TOKEN: "google_pending_invite_token",
  PENDING_SCHOOL_ID: "google_pending_school_id",
  ONBOARDING_FORM: "onboarding_form_data",
  ONBOARDING_STEP: "onboarding_current_step",
} as const;

export type SessionKey = (typeof SESSION_KEYS)[keyof typeof SESSION_KEYS];

export interface GoogleSignupSession {
  google_token: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSession<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function removeSession(...keys: string[]): void {
  keys.forEach((k) => sessionStorage.removeItem(k));
}

export function readSignupSession(): GoogleSignupSession | null {
  return readSession<GoogleSignupSession>(SESSION_KEYS.GOOGLE_SIGNUP);
}

export function clearSignupSession(): void {
  removeSession(
    SESSION_KEYS.GOOGLE_SIGNUP,
    SESSION_KEYS.PENDING_ROLE,
    SESSION_KEYS.PENDING_INVITE_TOKEN,
    SESSION_KEYS.PENDING_SCHOOL_ID,
  );
}
