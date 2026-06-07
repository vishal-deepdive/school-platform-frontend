import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from "@/features/admin/constants";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 sm:w-52 shrink-0">
        {label}
      </dt>
      <dd className="mt-1 sm:mt-0 text-sm text-slate-900">{value ?? "—"}</dd>
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
        Application not found.{" "}
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
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to applications
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {app.school_name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${APPLICATION_STATUS_COLORS[app.onboarding_status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {APPLICATION_STATUS_LABELS[app.onboarding_status] ??
                app.onboarding_status}
            </span>
            <span className="text-xs text-slate-400">
              ID: {app.application_id}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {canReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {approveMutation.isPending ? "Approving…" : "Approve"}
            </button>
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Principal Account
        </h2>
        <dl>
          <InfoRow label="Name" value={app.principal_name} />
          <InfoRow label="Email" value={app.principal_email} />
        </dl>
      </section>

      {/* Certificate */}
      {app.certificate_url && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Registration Certificate
          </h2>
          <a
            href={app.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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
        <p className="text-sm text-slate-600">
          Optionally provide a reason — it will be shown to the applicant.
        </p>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason for rejection (optional)…"
          rows={4}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
        {rejectMutation.isError && (
          <Alert variant="error" className="mt-3">
            {getErrorMessage(rejectMutation.error)}
          </Alert>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => setShowRejectModal(false)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
