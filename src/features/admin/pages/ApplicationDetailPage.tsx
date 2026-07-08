import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  MapPin,
  GraduationCap,
  UserCircle,
  FileText,
} from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { Textarea } from "@/shared/components/ui/Textarea";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_VARIANTS,
} from "@/features/admin/constants";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm font-medium text-muted-foreground sm:w-52">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

// ── Canned review reasons ─────────────────────────────────────────────────────
// The vast majority of decisions repeat a handful of reasons — templates keep
// applicant communication consistent while staying editable before sending.
const REJECTION_TEMPLATES = [
  "We could not verify the school's registration with the details provided.",
  "This school already appears to be registered on the platform (duplicate application).",
  "The UDISE code provided does not match the school details submitted.",
  "The application is incomplete or contains information we could not validate.",
];

const CHANGE_REQUEST_TEMPLATES = [
  "The uploaded certificate is illegible — please re-upload a clearer scan.",
  "Please add your school's registration certificate so we can verify the school.",
  "Please provide your school's 11-digit UDISE code so we can verify the school.",
  "The school address appears incomplete — please provide the full registered address.",
];

function TemplatePicker({
  templates,
  onPick,
}: {
  templates: string[];
  onPick: (text: string) => void;
}) {
  return (
    <select
      className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
        e.target.value = "";
      }}
      aria-label="Insert a common reason"
    >
      <option value="" disabled>
        Insert a common reason…
      </option>
      {templates.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

// ── Inline certificate preview ────────────────────────────────────────────────
function certificateKind(url: string): "pdf" | "image" | "other" {
  try {
    const path = new URL(url, window.location.origin).pathname.toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (/\.(jpe?g|png)$/.test(path)) return "image";
  } catch {
    // Malformed URL — fall through to link-only.
  }
  return "other";
}

function CertificatePreview({ url }: { url: string }) {
  const kind = certificateKind(url);
  return (
    <div className="grid gap-3">
      {kind === "pdf" && (
        <iframe
          src={url}
          title="Certificate preview"
          className="h-[480px] w-full rounded-lg border border-border bg-muted/20"
        />
      )}
      {kind === "image" && (
        <img
          src={url}
          alt="Registration certificate"
          className="max-h-[480px] w-auto max-w-full rounded-lg border border-border object-contain"
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        <FileText className="h-4 w-4" />
        Open certificate in a new tab
      </a>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesMessage, setChangesMessage] = useState("");

  const {
    data: app,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["onboarding-application", applicationId],
    queryFn: () => adminApi.getApplication(applicationId!),
    enabled: !!applicationId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-applications"] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-stats"] });
    queryClient.invalidateQueries({
      queryKey: ["onboarding-application", applicationId],
    });
  };

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveApplication(applicationId!),
    onSuccess: () => {
      invalidateAll();
      navigate("/admin/onboarding");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      adminApi.rejectApplication(applicationId!, {
        rejection_reason: rejectionReason || undefined,
      }),
    onSuccess: () => {
      invalidateAll();
      setShowRejectModal(false);
      navigate("/admin/onboarding");
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: () =>
      adminApi.requestApplicationChanges(applicationId!, {
        message: changesMessage,
      }),
    onSuccess: () => {
      invalidateAll();
      setShowChangesModal(false);
      setChangesMessage("");
    },
  });

  if (isLoading) return <PageSkeleton showStats={false} />;

  if (error || !app) {
    return (
      <Alert variant="error">
        {getErrorMessage(error) || "Application not found."}{" "}
        <Link to="/admin/onboarding" className="underline">
          Back to list
        </Link>
      </Alert>
    );
  }

  const canApprove =
    app.onboarding_status === "email_verified" ||
    app.onboarding_status === "changes_requested";
  const canReject =
    app.onboarding_status !== "approved" &&
    app.onboarding_status !== "rejected";
  const canRequestChanges = canReject; // same guard: anything non-terminal

  return (
    <div className="max-w-auto space-y-6">
      <Link
        to="/admin/onboarding"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>

      {/* Header */}
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={app.school_name}
              seed={app.application_id}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">
                {app.school_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    APPLICATION_STATUS_BADGE_VARIANTS[app.onboarding_status] ??
                    "default"
                  }
                >
                  {APPLICATION_STATUS_LABELS[app.onboarding_status] ??
                    app.onboarding_status}
                </Badge>
                <span className="text-xs text-muted-foreground/70">
                  ID: {app.application_id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canReject && (
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(true)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Reject
              </Button>
            )}
            {canRequestChanges && (
              <Button
                variant="outline"
                onClick={() => setShowChangesModal(true)}
                className="border-purple-400/40 text-purple-600 hover:bg-purple-500/10 hover:text-purple-600"
              >
                Request Changes
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={() => approveMutation.mutate()}
                loading={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {approveMutation.isError && (
        <Alert variant="error">{getErrorMessage(approveMutation.error)}</Alert>
      )}
      {app.rejection_reason && (
        <Alert variant="error" title="Rejection reason">
          {app.rejection_reason}
        </Alert>
      )}
      {app.admin_message && app.onboarding_status === "changes_requested" && (
        <Alert variant="warning" title="Changes requested — waiting on applicant">
          {app.admin_message}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* School identity */}
        <Panel title="School Identity" icon={<Building2 className="h-4 w-4" />}>
          <dl>
            <InfoRow label="School Name" value={app.school_name} />
            <InfoRow
              label="Board"
              value={app.board === "OTHER" ? app.other_board : app.board}
            />
            <InfoRow
              label="School Type"
              value={
                app.school_type === "OTHER"
                  ? app.other_school_type
                  : app.school_type
              }
            />
            <InfoRow label="Established Year" value={app.established_year} />
            <InfoRow
              label="UDISE Code"
              value={
                app.udise_code
                  ? `${app.udise_code}${app.udise_verified ? "  ✓ verified" : "  (unverified)"}`
                  : undefined
              }
            />
          </dl>
        </Panel>

        {/* Contact & address */}
        <Panel title="Contact & Address" icon={<MapPin className="h-4 w-4" />}>
          <dl>
            <InfoRow label="School Email" value={app.email} />
            <InfoRow label="Mobile" value={app.mobile} />
            <InfoRow label="Phone" value={app.phone} />
            <InfoRow
              label="Address"
              value={[
                app.address_line_1,
                app.address_line_2,
                app.city,
                app.state,
                app.pin_code,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </dl>
        </Panel>

        {/* Academic details */}
        <Panel
          title="Academic Details"
          icon={<GraduationCap className="h-4 w-4" />}
        >
          <dl>
            <InfoRow label="Student Count" value={app.student_count} />
            <InfoRow
              label="Medium of Instruction"
              value={
                app.medium_of_instruction === "Other"
                  ? app.other_medium_of_instruction
                  : app.medium_of_instruction
              }
            />
            <InfoRow
              label="Classes"
              value={
                app.classes_from && app.classes_to
                  ? `Class ${app.classes_from} to ${app.classes_to}`
                  : undefined
              }
            />
          </dl>
        </Panel>

        {/* Principal account */}
        <Panel
          title="Principal Account"
          icon={<UserCircle className="h-4 w-4" />}
        >
          <dl>
            <InfoRow label="Name" value={app.principal_name} />
            <InfoRow label="Email" value={app.principal_email} />
            {app.filled_by_email &&
              app.filled_by_email !== app.principal_email && (
                <InfoRow label="Form filled by" value={app.filled_by_email} />
              )}
          </dl>
        </Panel>
      </div>

      {/* Certificate */}
      <Panel
        title="Registration Certificate"
        icon={<FileText className="h-4 w-4" />}
      >
        {app.certificate_status === "upload_failed" ? (
          <Alert variant="error" title="Certificate upload failed">
            The applicant attached a certificate but it failed to store (a system
            issue — not the school&apos;s fault). Ask them to re-upload before
            approving, rather than rejecting.
          </Alert>
        ) : app.certificate_url ? (
          <CertificatePreview url={app.certificate_url} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No certificate was provided (optional at submission).
          </p>
        )}
      </Panel>

      {/* Reject modal */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Optionally provide a reason — it will be shown to the applicant.
        </p>
        <TemplatePicker
          templates={REJECTION_TEMPLATES}
          onPick={(t) =>
            setRejectionReason((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))
          }
        />
        <Textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason for rejection (optional)…"
          rows={4}
          className="mt-3"
        />
        {rejectMutation.isError && (
          <Alert variant="error" className="mt-3">
            {getErrorMessage(rejectMutation.error)}
          </Alert>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => rejectMutation.mutate()}
            loading={rejectMutation.isPending}
          >
            Confirm Rejection
          </Button>
        </div>
      </Modal>

      {/* Request-changes modal */}
      <Modal
        open={showChangesModal}
        onClose={() => setShowChangesModal(false)}
        title="Request Changes"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          The application stays open under the same ID — the applicant edits and
          resubmits instead of starting over. Describe what needs to change.
        </p>
        <TemplatePicker
          templates={CHANGE_REQUEST_TEMPLATES}
          onPick={(t) =>
            setChangesMessage((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))
          }
        />
        <Textarea
          value={changesMessage}
          onChange={(e) => setChangesMessage(e.target.value)}
          placeholder="e.g. The uploaded certificate is illegible — please re-upload a clearer scan."
          rows={4}
          className="mt-3"
        />
        {requestChangesMutation.isError && (
          <Alert variant="error" className="mt-3">
            {getErrorMessage(requestChangesMutation.error)}
          </Alert>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowChangesModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => requestChangesMutation.mutate()}
            loading={requestChangesMutation.isPending}
            disabled={changesMessage.trim().length < 3}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Send Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
