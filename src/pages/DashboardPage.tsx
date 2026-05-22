import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  UserCheck,
  Mic2,
  BookOpen,
  BarChart2,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { attendanceApi } from '@/api/attendance'
import { surveyApi } from '@/api/survey'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const quickLinks = [
  {
    title: 'Enroll Students',
    desc: 'Upload face photos to register students for attendance',
    href: '/attendance/enroll',
    icon: <Users className="h-6 w-6" />,
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    title: 'Mark Attendance',
    desc: 'Upload classroom photos to auto-mark attendance',
    href: '/attendance/mark',
    icon: <UserCheck className="h-6 w-6" />,
    color: 'text-green-600 bg-green-50',
  },
  {
    title: 'Upload Recording',
    desc: 'Convert lecture audio into notes, questions, and summaries',
    href: '/recording/upload',
    icon: <Mic2 className="h-6 w-6" />,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    title: 'Ask a Question',
    desc: 'Query your textbooks with AI-powered semantic search',
    href: '/rag/qa',
    icon: <BookOpen className="h-6 w-6" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Survey Analytics',
    desc: 'Explore student feedback with AI-powered search',
    href: '/survey/search',
    icon: <BarChart2 className="h-6 w-6" />,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    title: 'Attendance Trends',
    desc: 'View attendance history and low-attendance alerts',
    href: '/attendance/view',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'text-red-600 bg-red-50',
  },
]

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 5 * 60_000,
  })

  const { data: surveyStatus } = useQuery({
    queryKey: ['survey', 'status'],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60_000,
  })

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening on your platform today.
          </p>
        </div>
        <Badge variant={user?.role === 'admin' ? 'purple' : user?.role === 'teacher' ? 'info' : 'default'}>
          {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students Enrolled"
          value={stats?.total_students ?? '—'}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Schools"
          value={stats?.by_school?.length ?? '—'}
          icon={<UserCheck className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Survey Records"
          value={surveyStatus?.total_records ?? '—'}
          icon={<BarChart2 className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="Platform Status"
          value="Healthy"
          icon={<Activity className="h-5 w-5" />}
          color="green"
        />
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Card key={link.href} className="group hover:shadow-md transition-shadow" padding="md">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 rounded-lg p-2.5 ${link.color}`}>{link.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{link.title}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{link.desc}</p>
                  <Link
                    to={link.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 group-hover:gap-2 transition-all"
                  >
                    Get started <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {stats?.by_school && stats.by_school.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Enrollment by School</h2>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
              <Link to="/attendance/stats">View all</Link>
            </Button>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.by_school.slice(0, 5).map((school, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <p className="text-sm text-gray-700">
                  {String((school as Record<string, unknown>).school_name ?? 'Unknown')}
                </p>
                <Badge variant="info">
                  {String((school as Record<string, unknown>).total ?? 0)} students
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
