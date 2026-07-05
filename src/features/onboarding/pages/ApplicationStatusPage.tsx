/**
 * ApplicationStatusPage — public page to check onboarding application status.
 *
 * Route:  /onboarding/status
 * Query:  ?id=<application_id>    (pre-populates and auto-fetches when present)
 *
 * Status progression:
 *   pending_verification → email_verified → approved
 *                                         ↘ rejected  (with reason)
 */
import { useState, useEffect, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  AlertCircle,
  Building2,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { getErrorMessage, formatDateTime, cn } from "@/shared/lib/utils";
import { AuthInput, AuthButton } from "@/shared/components/ui/auth-fuse";
import type {
  OnboardingStatus,
  OnboardingStatusResponse,
} from "@/features/onboarding/types";

// ── Status display configuration ─────────────────────────────────────────────
type StatusCfg = {
  Icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  title: string;
  description: string;
};

const STATUS_CFG: Record<OnboardingStatus, StatusCfg> = {
  pending_verification: {
    Icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    title: "Pending Email Verification",
    description:
      "Please verify your email address to speed up the admin review.",
  },
  email_verified: {
    Icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    title: "Under Admin Review",
    description:
      "Email verified. The platform admin is reviewing your application — usually within 1–2 business days.",
  },
  changes_requested: {
    Icon: AlertCircle,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    title: "Changes Requested",
    description:
      "The admin needs a correction before approving — see the note below, then update and resubmit.",
  },
  approved: {
    Icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    title: "Application Approved!",
    description:
      "Your school is now live on DeepDive. Check your email for a one-time code to set your principal password, then sign in.",
  },
  rejected: {
    Icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    title: "Application Rejected",
    description:
      "Your application was not approved. See the reason below and consider reapplying.",
  },
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  );
}

// ── Status Result Card ────────────────────────────────────────────────────────
function StatusCard({ data }: { data: OnboardingStatusResponse }) {
  const cfg = STATUS_CFG[data.onboarding_status];
  const { Icon } = cfg;

  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      {/* Status banner */}
      <div
        className={cn(
          "rounded-xl border p-4 flex items-start gap-3",
          cfg.bg,
          cfg.border,
        )}
      >
        <Icon className={cn("h-6 w-6 shrink-0 mt-0.5", cfg.color)} />
        <div>
          <p className={cn("text-sm font-semibold", cfg.color)}>{cfg.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {cfg.description}
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 grid gap-2.5 divide-y divide-border/50">
        <div className="pb-2">
          <DetailRow
            label="School"
            value={
              <span className="font-medium text-foreground">
                {data.school_name}
              </span>
            }
          />
        </div>
        <div className="pt-2 pb-2">
          <DetailRow
            label="Status"
            value={
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  cfg.badgeBg,
                  cfg.badgeText,
                )}
              >
                {formatStatus(data.onboarding_status)}
              </span>
            }
          />
        </div>
        {data.applied_at && (
          <div className="pt-2 pb-2">
            <DetailRow
              label="Applied On"
              value={formatDateTime(data.applied_at)}
            />
          </div>
        )}
        <div className="pt-2">
          <DetailRow
            label="Application ID"
            value={
              <code className="text-xs font-mono break-all text-foreground">
                {data.application_id}
              </code>
            }
          />
        </div>
      </div>

      {/* Rejection reason */}
      {data.onboarding_status === "rejected" && data.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700 mb-1.5">
            Rejection Reason
          </p>
          <p className="text-xs text-red-600 leading-relaxed">
            {data.rejection_reason}
          </p>
        </div>
      )}

      {/* Changes requested */}
      {data.onboarding_status === "changes_requested" && data.admin_message && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
          <p className="text-xs font-semibold text-purple-700 mb-1.5">
            What needs to change
          </p>
          <p className="text-xs text-purple-700 leading-relaxed">
            {data.admin_message}
          </p>
        </div>
      )}

      {/* Contextual CTA */}
      {data.onboarding_status === "pending_verification" && (
        <AuthButton variant="outline" asChild className="w-full">
          <Link
            to="/onboarding/verify"
            state={{ applicationId: data.application_id }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Verify Email
          </Link>
        </AuthButton>
      )}
      {data.onboarding_status === "approved" && (
        <AuthButton asChild className="w-full">
          <Link to="/login">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Go to Login
          </Link>
        </AuthButton>
      )}
      {(data.onboarding_status === "rejected" ||
        data.onboarding_status === "changes_requested") && (
        <AuthButton variant="outline" asChild className="w-full">
          <Link
            to={`/onboarding/apply?resubmit=${encodeURIComponent(data.application_id)}`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {data.onboarding_status === "changes_requested"
              ? "Update & Resubmit"
              : "Edit & Resubmit"}
          </Link>
        </AuthButton>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ApplicationStatusPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  const [inputId, setInputId] = useState(initialId);
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Application-ID recovery by email
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSent, setLookupSent] = useState(false);

  const handleLookup = async () => {
    const email = lookupEmail.trim();
    if (!email) {
      toast.error("Enter the email you applied with");
      return;
    }
    setLookupLoading(true);
    try {
      const { message } = await onboardingApi.lookupByEmail(email);
      setLookupSent(true);
      toast.success(message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLookupLoading(false);
    }
  };

  // Auto-fetch when arriving from the success screen with ?id=
  useEffect(() => {
    if (initialId.trim()) {
      fetchStatus(initialId.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setFetchError("Please enter an application ID");
      return;
    }
    setLoading(true);
    setFetchError("");
    setStatusData(null);
    try {
      const data = await onboardingApi.getStatus(trimmed);
      setStatusData(data);
      // Sync input to the fetched ID (e.g. user came via URL, input was empty)
      setInputId(trimmed);
    } catch (err) {
      const msg = getErrorMessage(err);
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = () => fetchStatus(inputId);

  return (
    <div className="mx-auto grid w-full max-w-[420px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Search className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Application Status
        </h1>
        <p className="text-sm text-muted-foreground text-balance">
          Check the status of your school onboarding application
        </p>
      </div>

      {/* ── ID lookup ── */}
      <div className="grid gap-3">
        <AuthInput
          label="Application ID"
          type="text"
          placeholder="Paste your application ID here"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCheck();
          }}
          error={fetchError}
        />
        <AuthButton
          className="w-full"
          onClick={handleCheck}
          disabled={loading || !inputId.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Checking…
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Check Status
            </>
          )}
        </AuthButton>
      </div>

      {/* ── Lost-ID recovery by email (before first search) ── */}
      {!statusData && !loading && (
        <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lost your Application ID? Enter the email you applied with and
              we&apos;ll send your application details.
            </p>
          </div>
          {lookupSent ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <Mail className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700">
                If an application exists for that email, we&apos;ve sent its
                details. Check your inbox (and spam).
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <AuthInput
                type="email"
                placeholder="you@yourschool.edu.in"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup();
                }}
              />
              <AuthButton
                variant="outline"
                className="w-full"
                onClick={handleLookup}
                disabled={lookupLoading || !lookupEmail.trim()}
              >
                {lookupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Email me my Application ID
              </AuthButton>
            </div>
          )}
        </div>
      )}

      {/* ── Status result ── */}
      {statusData && <StatusCard data={statusData} />}

      {/* ── Footer links ── */}
      <p className="text-center text-sm text-muted-foreground">
        <Link
          to="/onboarding/apply"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Apply for a new school
        </Link>
        {" · "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
