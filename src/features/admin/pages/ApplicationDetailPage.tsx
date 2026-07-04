import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
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
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border last:border-0">
      <dt className="text-sm font-medium text-muted-foreground sm:w-52 shrink-0">
        {label}
      </dt>
      <dd className="mt-1 sm:mt-0 text-sm text-foreground">{value ?? "—"}</dd>
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/admin/onboarding"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to applications
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <Badge
              variant={APPLICATION_STATUS_BADGE_VARIANTS[app.onboarding_status] ?? "default"}
            >
              {APPLICATION_STATUS_LABELS[app.onboarding_status] ??
                app.onboarding_status}
            </Badge>
            <span className="text-xs text-muted-foreground/70">
              ID: {app.application_id}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
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

      {/* School identity */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">
          School Identity
        </h2>
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
      </section>

      {/* Contact & address */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Contact &amp; Address
        </h2>
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
      </section>

      {/* Academic details */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Academic Details
        </h2>
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
      </section>

      {/* Principal account */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Principal Account
        </h2>
        <dl>
          <InfoRow label="Name" value={app.principal_name} />
          <InfoRow label="Email" value={app.principal_email} />
          {app.filled_by_email &&
            app.filled_by_email !== app.principal_email && (
              <InfoRow label="Form filled by" value={app.filled_by_email} />
            )}
        </dl>
      </section>

      {/* Certificate */}
      <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Registration Certificate
        </h2>
        {app.certificate_status === "upload_failed" ? (
          <Alert variant="error" title="Certificate upload failed">
            The applicant attached a certificate but it failed to store (a system
            issue — not the school&apos;s fault). Ask them to re-upload before
            approving, rather than rejecting.
          </Alert>
        ) : app.certificate_url ? (
          <a
            href={app.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            📄 View Certificate
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            No certificate was provided (optional at submission).
          </p>
        )}
      </section>

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
