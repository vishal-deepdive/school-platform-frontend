/**
 * GoogleCompleteProfilePage
 *
 * Phase 2 of the Google OAuth sign-up flow — teacher/co-principal invite
 * claim only. Students and parents don't self-register (they use the
 * school-code/admission-number and mobile-OTP login tabs respectively), so
 * this page has no role selection: it either completes a pending teacher
 * invite or tells the visitor Google sign-in is staff-only.
 *
 * Session data is read from sessionStorage (never the URL) via session.ts helpers.
 * Key: SESSION_KEYS.GOOGLE_SIGNUP → { google_token, email, full_name, avatar_url }
 *
 * ── Teacher-invite via Google OAuth ──────────────────────────────────────────
 * When a teacher follows the principal's invite link (/register?token=xxx) and
 * clicks "Continue with Google", the invite token is stored in sessionStorage
 * before the OAuth redirect.  On this page we detect that case, show a minimal
 * teacher completion form (only full_name is collected), and inject the token
 * invisibly when calling the API.
 *
 * Edge cases handled:
 *   - no PENDING_INVITE_TOKEN at all                  → staff-only message
 *   - invite token present but invalid format         → error state
 *   - API rejects the token (expired / already used)  → toast error
 *   - GOOGLE_SIGNUP session missing                    → bounce to login
 *   - google_token expired                             → expiry banner + re-login link
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  School,
  MailOpen,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import toast from "@/shared/lib/toast";

import { useAuthStore } from "@/features/auth/store/auth";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import {
  SESSION_KEYS,
  readSignupSession,
  clearSignupSession,
} from "@/shared/lib/session";
import { isValidInviteToken } from "@/shared/lib/validators";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import type { TokenResponse } from "@/features/auth/types";

import { GoogleButton, TeacherInviteCompleteForm } from "@/features/auth/components";

// ─── Token expiry countdown ───────────────────────────────────────────────────

function useTokenExpiry(googleToken: string): {
  secondsLeft: number;
  expired: boolean;
} {
  const decoded = decodeJwt(googleToken);
  const expTimestamp = decoded?.exp ?? 0;

  const getSecondsLeft = useCallback(
    () => Math.max(0, Math.floor(expTimestamp - Date.now() / 1000)),
    [expTimestamp],
  );

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);

  useEffect(() => {
    if (!expTimestamp) return;
    const id = setInterval(() => {
      const remaining = getSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expTimestamp, getSecondsLeft]);

  return { secondsLeft, expired: secondsLeft === 0 };
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function GoogleCompleteProfilePage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const session = readSignupSession();

  const hintRole = sessionStorage.getItem(SESSION_KEYS.PENDING_ROLE);
  const hintInviteToken = sessionStorage.getItem(
    SESSION_KEYS.PENDING_INVITE_TOKEN,
  );

  const isTeacherInviteFlow = hintRole === "teacher";

  /* ── Guard: no signup session ───────────────────────────────────────────── */
  if (!session) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Profile not yet complete
          </h2>
          <p className="text-sm text-muted-foreground text-balance">
            Your account needs a role and school before you can use the
            platform. Sign in with Google to continue where you left off.
          </p>
        </div>

        <GoogleButton
          variant="default"
          label="Sign in with Google to complete profile"
        />

        <p className="text-sm text-muted-foreground">
          Wrong account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Return to login
          </Link>
        </p>
      </div>
    );
  }

  const { google_token, email, full_name, avatar_url } = session;

  const handleTokenSuccess = (tokens: TokenResponse) => {
    login(
      tokens,
      buildUserFromJwt(
        decodeJwt(tokens.access_token),
        email,
        full_name ?? null,
      ),
    );
    clearSignupSession();
    toast.success("Account created! Welcome 🎉");
    navigate("/dashboard", { replace: true });
  };

  /* ── Teacher-invite via Google OAuth ────────────────────────────────────── */
  if (isTeacherInviteFlow) {
    if (!hintInviteToken || !isValidInviteToken(hintInviteToken)) {
      return (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <IdentityBadge
            email={email}
            fullName={full_name}
            avatarUrl={avatar_url}
          />
          <div className="flex flex-col items-center gap-3 text-center mt-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Invite Token Missing
            </h2>
            <p className="text-sm text-muted-foreground text-balance">
              Your teacher registration requires a valid invite link from your
              school principal. The invite token was not found in this session.
            </p>
            <p className="text-sm text-muted-foreground text-balance">
              Please return to the invite link in your email and try again.
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <AuthButton asChild variant="outline" className="w-full">
              <Link to="/login">Return to Login</Link>
            </AuthButton>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <IdentityBadge
          email={email}
          fullName={full_name}
          avatarUrl={avatar_url}
        />
        <div className="mt-4 mb-3">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MailOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                Teacher Invite
              </h1>
              <p className="text-xs text-muted-foreground">
                Complete your teacher registration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <School className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Invite verified.
              </span>{" "}
              Your invite token will be checked automatically on submission.
            </p>
          </div>
        </div>
        <ExpiryBanner googleToken={google_token} />
        <TeacherInviteCompleteForm
          googleToken={google_token}
          prefillName={full_name ?? ""}
          inviteToken={hintInviteToken}
          onSuccess={handleTokenSuccess}
        />
      </div>
    );
  }

  /* ── No invite hint: Google sign-in is staff-only ───────────────────────── */
  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <IdentityBadge email={email} fullName={full_name} avatarUrl={avatar_url} />

      <div className="flex flex-col items-center gap-3 text-center mt-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Google sign-in is for staff accounts
        </h2>
        <p className="text-sm text-muted-foreground text-balance">
          Teachers and principals register via an invite link from their
          school. Students sign in with their school code and admission
          number; parents sign in with their registered mobile number — no
          account to create.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/50 px-3 py-2.5 mt-5 mb-6">
        <Smartphone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">
            Are you a parent or student?
          </span>{" "}
          Use the dedicated Parent / Student tabs on the sign-in page instead
          of Google.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <AuthButton asChild className="w-full">
          <Link to="/login">Go to Sign In</Link>
        </AuthButton>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExpiryBanner({ googleToken }: { googleToken: string }) {
  const { secondsLeft, expired } = useTokenExpiry(googleToken);

  if (expired) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Session expired.{" "}
          <Link
            to="/login"
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Sign in with Google again
          </Link>{" "}
          to restart.
        </span>
      </div>
    );
  }

  const isWarning = secondsLeft < 5 * 60;
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
        isWarning
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border/50 bg-muted text-muted-foreground"
      }`}
    >
      <Clock
        className={`h-3.5 w-3.5 shrink-0 ${isWarning ? "text-amber-500" : ""}`}
      />
      <span>
        Session expires in{" "}
        <span
          className={`font-mono font-bold ${isWarning ? "text-amber-600 dark:text-amber-400" : ""}`}
        >
          {formatCountdown(secondsLeft)}
        </span>
      </span>
    </div>
  );
}

function IdentityBadge({
  email,
  fullName,
  avatarUrl,
}: {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-3 mb-2 p-3 bg-muted rounded-xl border border-border/50">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={fullName ?? "Google profile"}
          className="h-10 w-10 rounded-full ring-2 ring-primary/30 shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-lg">
            {(fullName ?? email)[0]?.toUpperCase() ?? "G"}
          </span>
        </div>
      )}
      <div className="min-w-0">
        {fullName && (
          <p className="text-sm font-semibold text-foreground truncate">
            {fullName}
          </p>
        )}
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
    </div>
  );
}
