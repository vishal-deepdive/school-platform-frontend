import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { OnboardingStatus } from '@/types/admin'

const STATUS_LABELS: Record<OnboardingStatus, string> = {
  pending_verification: 'Pending Verification',
  email_verified: 'Email Verified',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<OnboardingStatus, string> = {
  pending_verification: 'bg-yellow-100 text-yellow-800',
  email_verified: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'email_verified', label: 'Needs Review' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function OnboardingApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('email_verified')

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['onboarding-applications', statusFilter],
    queryFn: () => adminApi.listApplications(statusFilter || undefined),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve school onboarding applications
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          Failed to load applications. Please try again.
        </div>
      )}

      {!isLoading && applications && applications.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-500">No applications found for this filter.</p>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Applied At
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {applications.map((app) => (
                <tr key={app.application_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{app.school_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{app.principal_name}</p>
                    <p className="text-xs text-slate-500">{app.principal_email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {app.city}, {app.state}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[app.onboarding_status]}`}
                    >
                      {STATUS_LABELS[app.onboarding_status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {app.applied_at
                      ? new Date(app.applied_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/onboarding/${app.application_id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
