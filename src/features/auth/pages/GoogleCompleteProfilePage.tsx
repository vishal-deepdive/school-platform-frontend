/**
 * GoogleCompleteProfilePage
 *
 * Phase 2 of the Google OAuth sign-up flow.
 * Shown only to new Google users who don't have an account yet.
 *
 * Session data is read from sessionStorage (never the URL) via session.ts helpers.
 * Key: SESSION_KEYS.GOOGLE_SIGNUP → { google_token, email, full_name, avatar_url }
 *
 * Optional hints for pre-filling (set before the Google redirect):
 *   - PENDING_ROLE         → pre-select a tab or trigger teacher-invite flow
 *   - PENDING_INVITE_TOKEN → invite token for teacher registration (hidden from UI)
 *   - PENDING_SCHOOL_ID    → pre-fill student school_id
 *
 * ── Teacher-invite via Google OAuth ──────────────────────────────────────────
 * When a teacher follows the principal's invite link (/register?token=xxx) and
 * clicks "Continue with Google", the invite token is stored in sessionStorage
 * before the OAuth redirect.  On this page we detect that case, show a minimal
 * teacher completion form (only full_name is collected), and inject the token
 * invisibly when calling the API.
 *
 * Edge cases handled:
 *   - PENDING_ROLE === 'teacher' but NO invite token  → error state
 *   - invite token present but invalid format         → error state
 *   - API rejects the token (expired / already used)  → toast error
 *   - GOOGLE_SIGNUP session missing                   → bounce to login
 *   - google_token expired                            → expiry banner + re-login link
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap,
  Users,
  Clock,
  AlertTriangle,
  School,
  MailOpen,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import { getErrorMessage } from "@/shared/lib/utils";
import {
  SESSION_KEYS,
  readSignupSession,
  clearSignupSession,
} from "@/shared/lib/session";
import { isValidInviteToken } from "@/shared/lib/validators";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import type { TokenResponse } from "@/features/auth/types";

import {
  GoogleIcon,
  TeacherInviteCompleteForm,
  StudentCompleteForm,
  ParentCompleteForm,
} from "@/features/auth/components";

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

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "parent", label: "Parent", icon: Users },
] as const;

type TabType = (typeof TABS)[number]["id"];

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

  const validTabs: TabType[] = ["student", "parent"];
  const initialTab: TabType =
    hintRole && validTabs.includes(hintRole as TabType)
      ? (hintRole as TabType)
      : "student";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

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

        <AuthButton
          type="button"
          className="w-full"
          onClick={async () => {
            try {
              const { auth_url } = await authApi.googleLogin();
              window.location.href = auth_url;
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }}
        >
          <GoogleIcon />
          Sign in with Google to complete profile
        </AuthButton>

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

  const handleParentPending = (message: string) => {
    clearSignupSession();
    toast.success(message, { duration: 6000 });
    navigate("/login", { replace: true });
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
              <MailOpen className="h-4.5 w-4.5 text-primary" />
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

  /* ── Normal flow: Student / Parent tabs ─────────────────────────────────── */
  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <IdentityBadge
          email={email}
          fullName={full_name}
          avatarUrl={avatar_url}
        />
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-4">
          Complete your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your role and fill in the details to finish setting up your
          account.
        </p>
      </div>

      <ExpiryBanner googleToken={google_token} />

      <div
        role="tablist"
        className="mb-6 flex gap-1 p-1.5 bg-muted rounded-xl border border-border/50"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-complete-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "text-primary bg-background shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/50 px-3 py-2.5 mb-5">
        <School className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">
            Are you a teacher?
          </span>{" "}
          Teachers register via an invite link sent by their school principal.
          Please use the invite link from your email.
        </p>
      </div>

      {/* Both panels always mounted; CSS toggles visibility to preserve form state */}
      <div className="relative min-h-[320px]">
        <div
          id="tabpanel-complete-student"
          role="tabpanel"
          className={activeTab !== "student" ? "hidden" : ""}
        >
          <StudentCompleteForm
            googleToken={google_token}
            prefillName={full_name ?? ""}
            onSuccess={handleTokenSuccess}
          />
        </div>
        <div
          id="tabpanel-complete-parent"
          role="tabpanel"
          className={activeTab !== "parent" ? "hidden" : ""}
        >
          <ParentCompleteForm
            googleToken={google_token}
            prefillName={full_name ?? ""}
            onPending={handleParentPending}
          />
        </div>
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
