import { useState, useMemo } from "react";
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
  ClipboardList,
  NotebookText,
  Minus,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { SetupChecklist } from "@/features/dashboard/components/SetupChecklist";
import { AttendanceTrendChart } from "@/features/dashboard/components/AttendanceTrendChart";
import { NeedsAttention } from "@/features/dashboard/components/NeedsAttention";
import { StatusDonut } from "@/features/dashboard/components/StatusDonut";
import { ClassBreakdownChart } from "@/features/dashboard/components/ClassBreakdownChart";
import { WeekdayPatternChart } from "@/features/dashboard/components/WeekdayPatternChart";
import { AttendanceHeatmap } from "@/features/dashboard/components/AttendanceHeatmap";
import { AdminDashboard } from "@/features/dashboard/components/AdminDashboard";
import { MyDashboard } from "@/features/dashboard/components/MyDashboard";
import { RecordingAnalyticsSection } from "@/features/dashboard/components/RecordingAnalyticsSection";
import { LibraryAnalyticsSection } from "@/features/dashboard/components/LibraryAnalyticsSection";
import { SurveyAnalyticsSection } from "@/features/dashboard/components/SurveyAnalyticsSection";
import { SchoolSwitcherPill } from "@/app/layouts/SchoolSwitcher";
import { roleCanAccess } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { toast } from "@/shared/lib/toast";

const quickLinks = [
  {
    title: "Mark Attendance",
    desc: "Upload classroom photos to auto-mark attendance",
    href: "/attendance/mark",
    icon: <UserCheck className="h-5 w-5" />,
    color: "text-green-600 dark:text-green-400 bg-green-500/10",
  },
  {
    title: "Enroll Students",
    desc: "Upload face photos to register students for attendance",
    href: "/attendance/enroll",
    icon: <Users className="h-5 w-5" />,
    color: "text-primary bg-primary/10",
  },
  {
    title: "Upload Recording",
    desc: "Convert lecture audio into notes, questions, and summaries",
    href: "/recording/upload",
    icon: <Mic2 className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  },
  {
    title: "Ask a Question",
    desc: "Query your textbooks with AI-powered semantic search",
    href: "/rag/qa",
    icon: <BookOpen className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  {
    title: "Survey Analytics",
    desc: "Explore student feedback with AI-powered search",
    href: "/survey/search",
    icon: <BarChart2 className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    title: "Attendance Trends",
    desc: "View attendance history and low-attendance alerts",
    href: "/attendance/view",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-destructive bg-destructive/10",
  },
  // Student / parent surfaces — role filtering below picks what applies.
  {
    title: "Apply for Leave",
    desc: "Request leave and track the approval status",
    href: "/attendance/leave",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    title: "Class Recordings",
    desc: "Browse lecture notes and summaries from your classes",
    href: "/recording/list",
    icon: <NotebookText className="h-5 w-5" />,
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

/** School/class analytics for principals and teachers. */
function StaffDashboard() {
  const [trendDays, setTrendDays] = useState(14);
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["attendance", "analytics", trendDays],
    queryFn: () => attendanceApi.getAnalytics({ days: String(trendDays) }),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const unmarkedCount = analytics?.unmarked_classes?.length ?? 0;

  return (
    <div className="animate-slide-up space-y-6">
      {analytics?.scope === "class" && analytics.classes_in_scope.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing your assigned {analytics.classes_in_scope.length === 1 ? "class" : "classes"}:{" "}
          <span className="font-medium text-foreground">
            {analytics.classes_in_scope.join(", ")}
          </span>
        </p>
      )}

      {/* Most common action of the day, surfaced before the numbers */}
      {!isLoading && unmarkedCount > 0 && (
        <Link
          to="/attendance/roll-call"
          className="group flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10"
        >
          <ClipboardList className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 flex-1 text-sm text-foreground">
            <span className="font-semibold">
              {unmarkedCount} {unmarkedCount === 1 ? "class hasn't" : "classes haven't"} been
              marked today
            </span>
            <span className="text-muted-foreground"> — take roll call to catch up.</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            Take roll call
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        ) : (
          <>
            <Link to="/attendance/view" className="block h-full">
              <StatCard
                hoverable
                label="Present Today"
                value={analytics?.today.present ?? 0}
                icon={<UserCheck className="h-5 w-5" />}
                color="success"
                description={
                  analytics && analytics.today.total_marked > 0
                    ? `of ${analytics.today.total_marked} marked`
                    : "no attendance marked yet"
                }
              />
            </Link>
            <Link to="/attendance/view" className="block h-full">
              <StatCard
                hoverable
                label="Absent Today"
                value={analytics?.today.absent ?? 0}
                icon={<UserX className="h-5 w-5" />}
                color="danger"
                description={
                  analytics && analytics.today.late > 0
                    ? `plus ${analytics.today.late} late`
                    : undefined
                }
              />
            </Link>
            <Link to="/attendance/stats" className="block h-full">
              <StatCard
                hoverable
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
            </Link>
            <Link to="/attendance/leave" className="block h-full">
              <StatCard
                hoverable
                label="Pending Leaves"
                value={analytics?.pending_leaves_total ?? 0}
                icon={<CalendarClock className="h-5 w-5" />}
                color="warning"
                description="awaiting your review"
              />
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AttendanceTrendChart
          className="lg:col-span-2"
          points={analytics?.trend}
          loading={isLoading}
          rangeDays={trendDays}
          onRangeChange={setTrendDays}
          subtitle={
            analytics?.scope === "class"
              ? "Share of your students marked present each school day"
              : "Share of students marked present each school day"
          }
        />
        <StatusDonut
          counts={analytics?.today}
          loading={isLoading}
          title="Today at a glance"
          subtitle="How today's marks break down"
          centerLabel={
            analytics && analytics.today.total_marked > 0
              ? `${Math.round(analytics.today.attendance_percentage)}%`
              : "—"
          }
          centerSub="present"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ClassBreakdownChart
          className="lg:col-span-2"
          items={analytics?.class_breakdown}
          loading={isLoading}
        />
        <WeekdayPatternChart points={analytics?.trend} loading={isLoading} />
      </div>

      <AttendanceHeatmap points={analytics?.trend} loading={isLoading} />

      <NeedsAttention analytics={analytics} loading={isLoading} wide />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  const { isAdmin, ready } = useActiveSchool();
  // Principals and teachers get school/class analytics; admins get the
  // platform-wide view; students and parents get their personal analytics.
  const isSchoolStaff = role === "principal" || role === "teacher";
  const isConsumer = role === "student" || role === "parent";

  const handleQuickLinkClick = (e: React.MouseEvent, href: string) => {
    const isGated = (h: string) => 
      h.startsWith("/attendance") || 
      h.startsWith("/recording") || 
      h.startsWith("/rag") || 
      h.startsWith("/survey") || 
      h.startsWith("/students");

    if (isAdmin && !ready && isGated(href)) {
      e.preventDefault();
      toast.warning("Please select a school first to access this module.");
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayFormatted = useMemo(() => format(new Date(), "EEEE, d MMMM"), []);

  const todayLine = (() => {
    if (isSchoolStaff) return "Here's how your school is doing today.";
    if (isAdmin) return "Here's what's happening on your platform.";
    if (role === "parent") return "Here's how your child is doing.";
    return "Here's your learning snapshot.";
  })();

  const visibleLinks = quickLinks
    .filter((link) => roleCanAccess(link.href, role))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        description={todayLine}
        actions={
          <>
            {/* Global active-school selector — admin-only; the single place an
                admin chooses which school the whole app operates on. */}
            <SchoolSwitcherPill />
            <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {todayFormatted}
            </span>
          </>
        }
      />

      {/* Post-approval setup checklist — self-hides once the school is set up */}
      <SetupChecklist />

      {isSchoolStaff && <StaffDashboard />}
      {isAdmin && <AdminDashboard />}
      {isConsumer && <MyDashboard isParent={role === "parent"} />}

      {/* Cross-domain analytics — recordings, knowledge base, and feedback.
          Each section fetches its own role-scoped endpoint and self-hides when
          the caller has no access, so the mix shown reflects the role. */}
      {(isSchoolStaff || isAdmin) && (
        <section className="space-y-8">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Content &amp; engagement
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lecture recordings, the textbook knowledge base, and student feedback.
            </p>
          </div>
          <RecordingAnalyticsSection />
          <LibraryAnalyticsSection />
          <SurveyAnalyticsSection />
        </section>
      )}

      {isConsumer && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Learning resources
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lecture recordings and study material available to you.
            </p>
          </div>
          <RecordingAnalyticsSection />
        </section>
      )}

      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Quick actions
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jump straight to the things you do most often.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((link) => (
            <Link key={link.href} to={link.href} className="group block h-full" onClick={(e) => handleQuickLinkClick(e, link.href)}>
              <Card className="relative h-full overflow-hidden" padding="md" hoverable>
                <ArrowRight
                  className="absolute right-5 top-5 h-4 w-4 -translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-primary"
                  aria-hidden="true"
                />
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 rounded-lg p-2 ${link.color}`}>
                    {link.icon}
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="text-sm font-semibold text-foreground">
                      {link.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {link.desc}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
