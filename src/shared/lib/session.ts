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
  // Survives a page refresh so the verify-OTP / reset-password screens don't
  // dead-end when the router's in-memory location.state is lost.
  OTP_FLOW: "auth_otp_flow",
  RESET_FLOW: "auth_reset_flow",
} as const;

export type SessionKey = (typeof SESSION_KEYS)[keyof typeof SESSION_KEYS];

export interface GoogleSignupSession {
  google_token: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Context for the OTP verification screen (email + why we're verifying). */
export interface OtpFlowSession {
  email: string;
  purpose: "verify_email" | "reset_password";
}

/** Context for the set-new-password screen. The reset token cannot be re-typed,
 *  so losing it on refresh would force the user to restart the whole flow. */
export interface ResetFlowSession {
  email: string;
  resetToken: string;
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

// ─── OTP / password-reset flow persistence ────────────────────────────────────

export function writeOtpFlow(session: OtpFlowSession): void {
  writeSession(SESSION_KEYS.OTP_FLOW, session);
}

export function readOtpFlow(): OtpFlowSession | null {
  return readSession<OtpFlowSession>(SESSION_KEYS.OTP_FLOW);
}

export function clearOtpFlow(): void {
  removeSession(SESSION_KEYS.OTP_FLOW);
}

export function writeResetFlow(session: ResetFlowSession): void {
  writeSession(SESSION_KEYS.RESET_FLOW, session);
}

export function readResetFlow(): ResetFlowSession | null {
  return readSession<ResetFlowSession>(SESSION_KEYS.RESET_FLOW);
}

export function clearResetFlow(): void {
  removeSession(SESSION_KEYS.RESET_FLOW);
}
