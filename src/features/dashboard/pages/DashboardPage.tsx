import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  UserCheck,
  UserX,
  Mic2,
  BookOpen,
  BarChart2,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  CalendarClock,
  CalendarDays,
  NotebookText,
  Minus,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { SetupChecklist } from "@/features/dashboard/components/SetupChecklist";
import { AttendanceTrendChart } from "@/features/dashboard/components/AttendanceTrendChart";
import { NeedsAttention } from "@/features/dashboard/components/NeedsAttention";
import { roleCanAccess } from "@/shared/lib/permissions";

const quickLinks = [
  {
    title: "Mark Attendance",
    desc: "Upload classroom photos to auto-mark attendance",
    href: "/attendance/mark",
    icon: <UserCheck className="h-6 w-6" />,
    color: "text-green-600 dark:text-green-400 bg-green-500/10",
  },
  {
    title: "Enroll Students",
    desc: "Upload face photos to register students for attendance",
    href: "/attendance/enroll",
    icon: <Users className="h-6 w-6" />,
    color: "text-primary bg-primary/10",
  },
  {
    title: "Upload Recording",
    desc: "Convert lecture audio into notes, questions, and summaries",
    href: "/recording/upload",
    icon: <Mic2 className="h-6 w-6" />,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  },
  {
    title: "Ask a Question",
    desc: "Query your textbooks with AI-powered semantic search",
    href: "/rag/qa",
    icon: <BookOpen className="h-6 w-6" />,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  {
    title: "Survey Analytics",
    desc: "Explore student feedback with AI-powered search",
    href: "/survey/search",
    icon: <BarChart2 className="h-6 w-6" />,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    title: "Attendance Trends",
    desc: "View attendance history and low-attendance alerts",
    href: "/attendance/view",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "text-destructive bg-destructive/10",
  },
  // Student / parent surfaces — role filtering below picks what applies.
  {
    title: "Apply for Leave",
    desc: "Request leave and track the approval status",
    href: "/attendance/leave",
    icon: <CalendarDays className="h-6 w-6" />,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    title: "Class Recordings",
    desc: "Browse lecture notes and summaries from your classes",
    href: "/recording/list",
    icon: <NotebookText className="h-6 w-6" />,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  },
];

/** Week-over-week attendance delta, colored by direction. */
function WeekDelta({ week, prev }: { week: number | null; prev: number | null }) {
  if (week == null || prev == null) {
    return <span className="text-muted-foreground">vs last week: —</span>;
  }
  const diff = +(week - prev).toFixed(1);
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" /> same as last week
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={
        up
          ? "inline-flex items-center gap-1 font-semibold text-green-600 dark:text-green-400"
          : "inline-flex items-center gap-1 font-semibold text-destructive"
      }
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {diff}% vs last week
    </span>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  const isAdmin = role === "admin";
  // Principals and teachers get school/class analytics; admins keep the
  // platform-wide view; students and parents get their consumer shortcuts.
  const isSchoolStaff = role === "principal" || role === "teacher";

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["attendance", "analytics"],
    queryFn: () => attendanceApi.getAnalytics(),
    enabled: isSchoolStaff,
    staleTime: 5 * 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["attendance", "stats"],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });

  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const todayLine = (() => {
    const dateStr = format(new Date(), "EEEE, d MMMM");
    if (isSchoolStaff && analytics) {
      if (analytics.is_holiday_today) return `It's ${dateStr} — school holiday today.`;
      const t = analytics.today;
      if (t.total_marked > 0) {
        return `It's ${dateStr} — ${t.present} of ${t.total_marked} students marked present so far.`;
      }
      return `It's ${dateStr} — no attendance marked yet today.`;
    }
    if (isAdmin) return `It's ${dateStr} — here's what's happening on your platform.`;
    return `It's ${dateStr} — jump back into your learning tools.`;
  })();

  const visibleLinks = quickLinks
    .filter((link) => roleCanAccess(link.href, role))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] ?? "there"} 👋`}
        description={todayLine}
      />

      {/* Post-approval setup checklist — self-hides once the school is set up */}
      <SetupChecklist />

      {isSchoolStaff && (
        <>
          {analytics?.scope === "class" && analytics.classes_in_scope.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing your assigned {analytics.classes_in_scope.length === 1 ? "class" : "classes"}:{" "}
              <span className="font-medium text-foreground">
                {analytics.classes_in_scope.join(", ")}
              </span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : (
              <>
                <StatCard
                  label="Present Today"
                  value={analytics?.today.present ?? 0}
                  icon={<UserCheck className="h-5 w-5" />}
                  color="green"
                  description={
                    analytics && analytics.today.total_marked > 0
                      ? `of ${analytics.today.total_marked} marked`
                      : "no attendance marked yet"
                  }
                />
                <StatCard
                  label="Absent Today"
                  value={analytics?.today.absent ?? 0}
                  icon={<UserX className="h-5 w-5" />}
                  color="red"
                  description={
                    analytics && analytics.today.late > 0
                      ? `plus ${analytics.today.late} late`
                      : undefined
                  }
                />
                <StatCard
                  label="Attendance Today"
                  value={
                    analytics && analytics.today.total_marked > 0
                      ? `${Math.round(analytics.today.attendance_percentage)}%`
                      : "—"
                  }
                  icon={<Activity className="h-5 w-5" />}
                  color="primary"
                  description={
                    <WeekDelta
                      week={analytics?.week_percentage ?? null}
                      prev={analytics?.prev_week_percentage ?? null}
                    />
                  }
                />
                <StatCard
                  label="Pending Leaves"
                  value={analytics?.pending_leaves_total ?? 0}
                  icon={<CalendarClock className="h-5 w-5" />}
                  color="amber"
                  description="awaiting your review"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AttendanceTrendChart
              className="lg:col-span-2"
              points={analytics?.trend}
              loading={analyticsLoading}
              subtitle={
                analytics?.scope === "class"
                  ? "Share of your students marked present each school day"
                  : "Share of students marked present each school day"
              }
            />
            <NeedsAttention analytics={analytics} loading={analyticsLoading} />
          </div>
        </>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Students Enrolled"
            value={stats?.total_students ?? "—"}
            icon={<Users className="h-5 w-5" />}
            color="indigo"
          />
          <StatCard
            label="Schools"
            value={stats?.by_school?.length ?? "—"}
            icon={<UserCheck className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            label="Survey Records"
            value={surveyStatus?.total_records ?? "—"}
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
      )}

      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((link) => (
            <Link key={link.href} to={link.href} className="group block">
              <Card className="h-full overflow-hidden" padding="md" hoverable>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${link.color}`}
                  >
                    {link.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{link.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {link.desc}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:gap-2">
                      Get started{" "}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {isAdmin && stats?.by_school && stats.by_school.length > 0 && (
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Enrollment by School
            </h2>
            <Link
              to="/attendance/stats"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.by_school.slice(0, 5).map((school, i) => (
              <div
                key={school.school_name || i}
                className="flex items-center justify-between py-3"
              >
                <p className="text-sm text-foreground">
                  {school.school_name || "Unknown"}
                </p>
                <Badge variant="info">{school.total} students</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
