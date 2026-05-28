import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'

const STATUS_COLORS: Record<string, string> = {
  pending_verification: 'bg-yellow-100 text-yellow-800',
  email_verified: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pending Email Verification',
  email_verified: 'Email Verified — Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500 sm:w-52 shrink-0">{label}</dt>
      <dd className="mt-1 sm:mt-0 text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  )
}

export function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: app, isLoading, error } = useQuery({
    queryKey: ['onboarding-application', applicationId],
    queryFn: () => adminApi.getApplication(applicationId!),
    enabled: !!applicationId,
  })

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveApplication(applicationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-applications'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-application', applicationId] })
      navigate('/admin/onboarding')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      adminApi.rejectApplication(applicationId!, {
        rejection_reason: rejectionReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-applications'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-application', applicationId] })
      setShowRejectModal(false)
      navigate('/admin/onboarding')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        Application not found.{' '}
        <Link to="/admin/onboarding" className="underline">
          Back to list
        </Link>
      </div>
    )
  }

  const canApprove = app.onboarding_status === 'email_verified'
  const canReject = app.onboarding_status !== 'approved' && app.onboarding_status !== 'rejected'

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
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{app.school_name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[app.onboarding_status] || 'bg-slate-100 text-slate-600'}`}
            >
              {STATUS_LABELS[app.onboarding_status] || app.onboarding_status}
            </span>
            <span className="text-xs text-slate-400">ID: {app.application_id}</span>
          </div>
        </div>

        {/* Action buttons */}
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
              {approveMutation.isPending ? 'Approving…' : 'Approve'}
            </button>
          )}
        </div>
      </div>

      {/* Error alerts */}
      {approveMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {(approveMutation.error as any)?.response?.data?.detail || 'Failed to approve application.'}
        </div>
      )}
      {app.rejection_reason && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">Rejection reason</p>
          <p className="mt-1 text-sm text-red-700">{app.rejection_reason}</p>
        </div>
      )}

      {/* School identity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">School Identity</h2>
        <dl>
          <InfoRow label="School Name" value={app.school_name} />
          <InfoRow
            label="Board"
            value={app.board === 'OTHER' ? app.other_board : app.board}
          />
          <InfoRow
            label="School Type"
            value={app.school_type === 'OTHER' ? app.other_school_type : app.school_type}
          />
          <InfoRow label="Established Year" value={app.established_year} />
          <InfoRow label="UDISE Code" value={app.udise_code} />
        </dl>
      </section>

      {/* Contact & address */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Contact & Address</h2>
        <dl>
          <InfoRow label="School Email" value={app.email} />
          <InfoRow label="Mobile" value={app.mobile} />
          <InfoRow label="Phone" value={app.phone} />
          <InfoRow
            label="Address"
            value={[app.address_line_1, app.address_line_2, app.city, app.state, app.pin_code]
              .filter(Boolean)
              .join(', ')}
          />
        </dl>
      </section>

      {/* Academic details */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Academic Details</h2>
        <dl>
          <InfoRow label="Student Count" value={app.student_count} />
          <InfoRow
            label="Medium of Instruction"
            value={
              app.medium_of_instruction === 'Other'
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
        <h2 className="text-base font-semibold text-slate-900 mb-4">Principal Account</h2>
        <dl>
          <InfoRow label="Name" value={app.principal_name} />
          <InfoRow label="Email" value={app.principal_email} />
        </dl>
      </section>

      {/* Certificate */}
      {app.certificate_url && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Registration Certificate</h2>
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
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Reject Application</h3>
            <p className="text-sm text-slate-600">
              Optionally provide a reason — it will be shown to the applicant.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            {rejectMutation.isError && (
              <p className="text-sm text-red-600">
                {(rejectMutation.error as any)?.response?.data?.detail || 'Failed to reject.'}
              </p>
            )}
            <div className="flex justify-end gap-3">
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
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
