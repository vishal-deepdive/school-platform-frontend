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
import { PageSpinner } from "@/shared/components/ui/Spinner";
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

  if (isLoading) return <PageSpinner />;

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

  const canApprove = app.onboarding_status === "email_verified";
  const canReject =
    app.onboarding_status !== "approved" &&
    app.onboarding_status !== "rejected";

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
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {app.school_name}
          </h1>
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
          <InfoRow label="UDISE Code" value={app.udise_code} />
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
        </dl>
      </section>

      {/* Certificate */}
      {app.certificate_url && (
        <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Registration Certificate
          </h2>
          <a
            href={app.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            📄 View Certificate
          </a>
        </section>
      )}

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
    </div>
  );
}
