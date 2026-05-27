import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { AttendanceDateView, AttendanceRangeView } from '@/features/attendance/components'

const viewTabs = [
  { id: 'date', label: 'By Date' },
  { id: 'range', label: 'Date Range' },
]

export function ViewAttendancePage() {
  const [tab, setTab] = useState('date')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">View Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Query attendance records by date or date range.
        </p>
      </div>

      <Tabs tabs={viewTabs} active={tab} onChange={(id) => { setTab(id) }} />

      {tab === 'date' && <AttendanceDateView />}
      {tab === 'range' && <AttendanceRangeView />}
    </div>
  )
}
