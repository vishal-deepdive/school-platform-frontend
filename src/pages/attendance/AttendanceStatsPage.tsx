import { useQuery } from '@tanstack/react-query'
import { Users, Building2, RefreshCw } from 'lucide-react'
import { attendanceApi } from '@/api/attendance'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function AttendanceStatsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['attendance', 'enrollment-stats'],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 2 * 60_000,
  })

  if (isLoading) return <PageSpinner />
  if (isError) return <Alert variant="error">Failed to load enrollment statistics.</Alert>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollment Statistics</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of student enrollments across schools.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Students"
          value={data?.total_students ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Schools"
          value={data?.by_school?.length ?? 0}
          icon={<Building2 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Avg per School"
          value={
            data && data.by_school?.length
              ? Math.round(data.total_students / data.by_school.length)
              : 0
          }
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
      </div>

      <Card padding="none">
        <CardHeader
          title="Breakdown by School"
          className="px-6 pt-6"
        />
        <div className="divide-y divide-gray-100">
          {data?.by_school?.map((school, i) => {
            const s = school as Record<string, unknown>
            const classes = s.classes as Record<string, unknown>[] | undefined
            return (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{String(s.school_name ?? '—')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Session: {String(s.session ?? '—')}</p>
                  </div>
                  <Badge variant="indigo">
                    {String(s.total ?? 0)} students
                  </Badge>
                </div>

                {classes && classes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls, j) => {
                      const c = cls as Record<string, unknown>
                      return (
                        <div
                          key={j}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs"
                        >
                          <span className="font-medium text-gray-700">
                            Class {String(c.class_name ?? '?')}
                          </span>
                          {!!c.section && (
                            <span className="text-gray-500"> - Sec {String(c.section)}</span>
                          )}
                          <span className="ml-2 text-indigo-600 font-semibold">
                            {String(c.total ?? 0)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
