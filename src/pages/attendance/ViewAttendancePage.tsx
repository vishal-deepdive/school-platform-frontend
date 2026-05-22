import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, AlertTriangle } from 'lucide-react'
import { toIndianDate } from '@/lib/utils'
import { attendanceApi } from '@/api/attendance'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import type { AttendanceRangeStudent } from '@/types/attendance'

const viewTabs = [
  { id: 'date', label: 'By Date' },
  { id: 'range', label: 'Date Range' },
]

interface DateFilters {
  school_name: string
  date: string
  class_name: string
  section: string
  subject: string
}

interface RangeFilters {
  school_name: string
  start_date: string
  end_date: string
  class_name: string
  section: string
  subject: string
}

export function ViewAttendancePage() {
  const [tab, setTab] = useState('date')
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    school_name: '',
    date: toIndianDate(new Date()),
    class_name: '',
    section: '',
    subject: '',
  })
  const [rangeFilters, setRangeFilters] = useState<RangeFilters>({
    school_name: '',
    start_date: toIndianDate(new Date(Date.now() - 7 * 86400000)),
    end_date: toIndianDate(new Date()),
    class_name: '',
    section: '',
    subject: '',
  })
  const [queryDate, setQueryDate] = useState<DateFilters | null>(null)
  const [queryRange, setQueryRange] = useState<RangeFilters | null>(null)

  const { data: dateData, isLoading: dateLoading, isError: dateError } = useQuery({
    queryKey: ['attendance', 'date', queryDate],
    queryFn: () =>
      attendanceApi.getAttendanceOnDate(queryDate as unknown as Record<string, string>),
    enabled: !!queryDate?.school_name,
  })

  const { data: rangeData, isLoading: rangeLoading, isError: rangeError } = useQuery({
    queryKey: ['attendance', 'range', queryRange],
    queryFn: () =>
      attendanceApi.getAttendanceRange(queryRange as unknown as Record<string, string>),
    enabled: !!queryRange?.school_name,
  })

  const handleExportCSV = async () => {
    if (!queryDate?.school_name) return
    const blob = await attendanceApi.viewStudents(queryDate as unknown as Record<string, string>)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-${queryDate.school_name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lowAttendance = rangeData?.data?.filter(
    (s: AttendanceRangeStudent) => s.below_75_percent,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">View Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Query attendance records by date or date range.
        </p>
      </div>

      <Tabs tabs={viewTabs} active={tab} onChange={(id) => { setTab(id) }} />

      {tab === 'date' && (
        <Card>
          <CardHeader title="Attendance on a Date" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
            <Input
              label="School Name"
              value={dateFilters.school_name}
              onChange={(e) => setDateFilters((p) => ({ ...p, school_name: e.target.value }))}
              placeholder="Delhi Public School"
            />
            <Input
              label="Date (DD-MM-YYYY)"
              value={dateFilters.date}
              onChange={(e) => setDateFilters((p) => ({ ...p, date: e.target.value }))}
              placeholder="15-08-2025"
            />
            <Input
              label="Class"
              value={dateFilters.class_name}
              onChange={(e) => setDateFilters((p) => ({ ...p, class_name: e.target.value }))}
              placeholder="10"
            />
            <Input
              label="Section"
              value={dateFilters.section}
              onChange={(e) => setDateFilters((p) => ({ ...p, section: e.target.value }))}
              placeholder="A"
            />
            <Input
              label="Subject (optional)"
              value={dateFilters.subject}
              onChange={(e) => setDateFilters((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Mathematics"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setQueryDate({ ...dateFilters })}
              icon={<Search className="h-4 w-4" />}
            >
              Search
            </Button>
            <Button variant="outline" onClick={handleExportCSV} icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
          </div>

          {dateLoading && <PageSpinner />}
          {dateError && <Alert variant="error">Failed to fetch attendance records.</Alert>}
          {dateData && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">
                {dateData.total_records} record(s) on {dateData.date}
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Roll No', 'Name', 'Class', 'Section', 'Subject', 'Status', 'Time'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {dateData.data.map((row, i) => {
                      const r = row as Record<string, unknown>
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{String(r.roll_number ?? r.roll_no ?? '—')}</td>
                          <td className="px-4 py-3">{String(r.name ?? '—')}</td>
                          <td className="px-4 py-3">{String(r.class_name ?? r.class ?? '—')}</td>
                          <td className="px-4 py-3">{String(r.section ?? '—')}</td>
                          <td className="px-4 py-3">{String(r.subject ?? '—')}</td>
                          <td className="px-4 py-3">
                            <Badge variant={r.attendance_record === 'P' ? 'success' : 'danger'}>
                              {r.attendance_record === 'P' ? 'Present' : 'Absent'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{String(r.time ?? '—')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'range' && (
        <Card>
          <CardHeader title="Attendance Over Date Range" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
            <Input
              label="School Name"
              value={rangeFilters.school_name}
              onChange={(e) => setRangeFilters((p) => ({ ...p, school_name: e.target.value }))}
              placeholder="Delhi Public School"
            />
            <Input
              label="Start Date (DD-MM-YYYY)"
              value={rangeFilters.start_date}
              onChange={(e) => setRangeFilters((p) => ({ ...p, start_date: e.target.value }))}
            />
            <Input
              label="End Date (DD-MM-YYYY)"
              value={rangeFilters.end_date}
              onChange={(e) => setRangeFilters((p) => ({ ...p, end_date: e.target.value }))}
            />
            <Input
              label="Class"
              value={rangeFilters.class_name}
              onChange={(e) => setRangeFilters((p) => ({ ...p, class_name: e.target.value }))}
              placeholder="10"
            />
            <Input
              label="Section"
              value={rangeFilters.section}
              onChange={(e) => setRangeFilters((p) => ({ ...p, section: e.target.value }))}
              placeholder="A"
            />
          </div>
          <Button
            onClick={() => setQueryRange({ ...rangeFilters })}
            icon={<Search className="h-4 w-4" />}
          >
            Search
          </Button>

          {rangeLoading && <PageSpinner />}
          {rangeError && <Alert variant="error">Failed to fetch attendance range.</Alert>}

          {rangeData && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-500">
                {rangeData.total_students} student(s) · {rangeData.date_range}
              </p>

              {lowAttendance && lowAttendance.length > 0 && (
                <Alert variant="warning" title={`${lowAttendance.length} student(s) below 75% attendance`}>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lowAttendance.map((s: AttendanceRangeStudent) => (
                      <Badge key={s.roll_no} variant="warning">
                        {s.name} ({s.attendance_percentage.toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                </Alert>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        %
                      </th>
                      {rangeData.dates?.map((d) => (
                        <th key={d} className="px-2 py-3 text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rangeData.data?.map((student: AttendanceRangeStudent) => (
                      <tr key={student.roll_no} className="hover:bg-gray-50">
                        <td className="sticky left-0 bg-white px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {student.below_75_percent && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <div>
                              <p>{student.name}</p>
                              <p className="text-xs text-gray-400">#{student.roll_no}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              student.attendance_percentage >= 75 ? 'success' : 'danger'
                            }
                          >
                            {student.attendance_percentage.toFixed(0)}%
                          </Badge>
                        </td>
                        {rangeData.dates?.map((d) => (
                          <td key={d} className="px-2 py-3 text-center">
                            <span
                              className={
                                student.dates?.[d] === 'P'
                                  ? 'text-green-600 font-bold'
                                  : 'text-red-500'
                              }
                            >
                              {student.dates?.[d] ?? '—'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
