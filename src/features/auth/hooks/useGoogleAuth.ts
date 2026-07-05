import { useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { SESSION_KEYS } from "@/shared/lib/session";

export interface GoogleAuthOptions {
  role?: "student" | "teacher" | "parent";
  inviteToken?: string;
  schoolId?: string;
}

/**
 * Encapsulates the Google OAuth redirect flow.
 * Hints are written to sessionStorage AFTER a valid auth_url is received so that
 * a failed API call never leaves stale hints that corrupt the next OAuth attempt.
 *
 * `isPending` covers the gap between the click and the browser redirect so the
 * triggering button can disable itself and avoid a double-submit.
 */
export function useGoogleAuth() {
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = async (options: GoogleAuthOptions = {}) => {
    if (isPending) return;
    setIsPending(true);
    try {
      const { auth_url } = await authApi.googleLogin();
      if (options.role)
        sessionStorage.setItem(SESSION_KEYS.PENDING_ROLE, options.role);
      if (options.inviteToken)
        sessionStorage.setItem(
          SESSION_KEYS.PENDING_INVITE_TOKEN,
          options.inviteToken,
        );
      if (options.schoolId)
        sessionStorage.setItem(
          SESSION_KEYS.PENDING_SCHOOL_ID,
          options.schoolId,
        );
      window.location.href = auth_url;
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsPending(false); // only reset on failure — success unloads the page
    }
  };

  return { handleGoogleLogin, isPending };
}
