import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download } from 'lucide-react'
import { toIndianDate } from '@/lib/utils'
import { attendanceApi } from '@/api/attendance'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'

interface DateFilters {
  school_name: string
  date: string
  class_name: string
  section: string
  subject: string
}

export function AttendanceDateView() {
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    school_name: '',
    date: toIndianDate(new Date()),
    class_name: '',
    section: '',
    subject: '',
  })
  const [queryDate, setQueryDate] = useState<DateFilters | null>(null)

  const { data: dateData, isLoading: dateLoading, isError: dateError } = useQuery({
    queryKey: ['attendance', 'date', queryDate],
    queryFn: () =>
      attendanceApi.getAttendanceOnDate(queryDate as unknown as Record<string, string>),
    enabled: !!queryDate?.school_name,
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

  return (
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
                {dateData.data.map((row: any, i: number) => {
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
  )
}
