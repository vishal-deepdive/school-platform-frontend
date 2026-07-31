import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/features/landing/animations";
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
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { StatCard } from "@/shared/components/ui/Card";
import { StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SetupChecklist } from "@/features/dashboard/components/SetupChecklist";
import { TeacherWelcomeCard } from "@/features/dashboard/components/TeacherWelcomeCard";
import { AttendanceTrendChart } from "@/features/dashboard/components/AttendanceTrendChart";
import { NeedsAttention } from "@/features/dashboard/components/NeedsAttention";
import { StatusDonut } from "@/features/dashboard/components/StatusDonut";
import { ClassBreakdownChart } from "@/features/dashboard/components/ClassBreakdownChart";
import { WeekdayPatternChart } from "@/features/dashboard/components/WeekdayPatternChart";
import { AttendanceHeatmap } from "@/features/dashboard/components/AttendanceHeatmap";
import { AdminDashboard } from "@/features/dashboard/components/AdminDashboard";
import { SegmentedControl } from "@/features/dashboard/components/SegmentedControl";
import { MyDashboard } from "@/features/dashboard/components/MyDashboard";
import { RecordingAnalyticsSection } from "@/features/dashboard/components/RecordingAnalyticsSection";
import { LibraryAnalyticsSection } from "@/features/dashboard/components/LibraryAnalyticsSection";
import { SurveyAnalyticsSection } from "@/features/dashboard/components/SurveyAnalyticsSection";
import { SchoolSwitcherPill } from "@/app/layouts/SchoolSwitcher";
import { CollapsibleSection } from "@/shared/components/ui/CollapsibleSection";
import { roleCanAccess, needsActiveSchool } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { toast } from "@/shared/lib/toast";

// Rendered as a compact pill row right under the greeting. Color stays
// reserved for status semantics — navigation is brand-blue only.
const quickLinks = [
  {
    title: "Mark Attendance",
    desc: "Upload classroom photos to auto-mark attendance",
    href: "/attendance/mark",
    icon: <UserCheck className="h-5 w-5" />,
  },
  {
    title: "Enroll Students",
    desc: "Upload face photos to register students for attendance",
    href: "/attendance/enroll",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Upload Recording",
    desc: "Convert lecture audio into notes, questions, and summaries",
    href: "/recording/upload",
    icon: <Mic2 className="h-5 w-5" />,
  },
  {
    title: "Ask a Question",
    desc: "Query your textbooks with AI-powered semantic search",
    href: "/rag/qa",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Survey Analytics",
    desc: "Explore student feedback with AI-powered search",
    href: "/survey/search",
    icon: <BarChart2 className="h-5 w-5" />,
  },
  {
    title: "Attendance Trends",
    desc: "View attendance history and low-attendance alerts",
    href: "/attendance/view",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  // Student / parent surfaces — role filtering below picks what applies.
  {
    title: "Apply for Leave",
    desc: "Request leave and track the approval status",
    href: "/attendance/leave",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    title: "Class Recordings",
    desc: "Browse lecture notes and summaries from your classes",
    href: "/recording/list",
    icon: <NotebookText className="h-5 w-5" />,
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

/**
 * School/class analytics. Principals/teachers drive it for their own school
 * (scoped server-side); an admin drives it for the school they've selected by
 * passing `schoolParam`/`schoolKey`, so the same view backs both.
 */
function StaffDashboard({
  schoolParam,
  schoolKey,
}: {
  schoolParam?: Record<string, string>;
  schoolKey?: string;
} = {}) {
  const [trendDays, setTrendDays] = useState(14);
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["attendance", "analytics", trendDays, schoolKey ?? "own"],
    queryFn: () =>
      attendanceApi.getAnalytics({ days: String(trendDays), ...(schoolParam ?? {}) }),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const unmarkedCount = analytics?.unmarked_classes?.length ?? 0;

  return (
    <div className="space-y-6">
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

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        ) : (
          <>
            <motion.div variants={fadeUp} className="block h-full">
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
            </motion.div>
            <motion.div variants={fadeUp} className="block h-full">
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
            </motion.div>
            <motion.div variants={fadeUp} className="block h-full">
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
            </motion.div>
            <motion.div variants={fadeUp} className="block h-full">
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
            </motion.div>
          </>
        )}
      </motion.div>

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

      <NeedsAttention analytics={analytics} loading={isLoading} wide />

      {/* Analyst-depth charts fold away — the daily glance stays short. */}
      <CollapsibleSection
        id="dash-attendance-patterns"
        title="Detailed attendance patterns"
        description="Class-by-class comparison, weekday pattern, and the day-by-day heatmap"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ClassBreakdownChart
              className="lg:col-span-2"
              items={analytics?.class_breakdown}
              loading={isLoading}
            />
            <WeekdayPatternChart points={analytics?.trend} loading={isLoading} />
          </div>
          <AttendanceHeatmap points={analytics?.trend} loading={isLoading} />
        </div>
      </CollapsibleSection>
    </div>
  );
}

/**
 * Cross-domain analytics — recordings, knowledge base, and feedback. Each
 * section is a self-titled collapsible that fetches its own role/school-scoped
 * endpoint and self-hides when the caller has no access.
 */
function CrossDomainSections() {
  return (
    <section className="space-y-6">
      <RecordingAnalyticsSection />
      <LibraryAnalyticsSection />
      <SurveyAnalyticsSection />
    </section>
  );
}

/**
 * Admin dashboard surface. With no school selected it shows the platform-wide
 * rollup. Once the admin selects a school it flips to that school's full
 * dashboard (attendance overview + cross-domain sections), with a toggle to
 * zoom back out to the platform view at any time.
 */
function AdminDashboardArea() {
  const { ready, schoolName, schoolId, schoolParam } = useActiveSchool();
  const [view, setView] = useState<"school" | "platform">(
    ready ? "school" : "platform",
  );
  // Follow the active-school selection: picking a school drops into its view;
  // clearing it falls back to the platform rollup. A manual toggle persists
  // until the next selection change.
  useEffect(() => {
    setView(ready ? "school" : "platform");
  }, [ready]);

  const schoolView = view === "school" && ready;

  return (
    <div className="space-y-6">
      {ready && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {schoolView ? (
              <>
                Showing{" "}
                <span className="font-medium text-foreground">{schoolName}</span>
              </>
            ) : (
              "Showing platform-wide activity across all schools"
            )}
          </p>
          <SegmentedControl
            aria-label="Dashboard scope"
            options={[
              { value: "school" as const, label: "This school" },
              { value: "platform" as const, label: "Platform" },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      )}

      {schoolView ? (
        <>
          <StaffDashboard schoolParam={schoolParam} schoolKey={schoolId} />
          <CrossDomainSections />
        </>
      ) : (
        <AdminDashboard />
      )}
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
  // Defensive: any authenticated role without a dedicated dashboard (e.g. a
  // role added later before its view exists) still gets a clear surface
  // instead of a blank page.
  const hasRoleView = isSchoolStaff || isAdmin || isConsumer;

  const handleQuickLinkClick = (e: React.MouseEvent, href: string) => {
    if (isAdmin && !ready && needsActiveSchool(href)) {
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-6"
    >
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        description={`${todayFormatted} — ${todayLine}`}
        actions={
          /* Global active-school selector — admin-only; the single place an
             admin chooses which school the whole app operates on. */
          <SchoolSwitcherPill />
        }
      />

      {/* One-time getting-started card for a freshly-onboarded teacher */}
      <TeacherWelcomeCard />

      {/* Post-approval setup checklist — self-hides once the school is set up */}
      <SetupChecklist />

      {/* Most-used destinations, first thing under the greeting. */}
      {visibleLinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              title={link.desc}
              onClick={(e) => handleQuickLinkClick(e, link.href)}
              className="group inline-flex items-center gap-2 rounded-full glass-panel px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">
                {link.icon}
              </span>
              {link.title}
            </Link>
          ))}
        </div>
      )}

      {/* Admins own their own layout (platform ↔ selected-school toggle, plus
          the cross-domain sections in school view); staff render the school
          dashboard and cross-domain sections directly. */}
      {isSchoolStaff && (
        <>
          <StaffDashboard />
          <CrossDomainSections />
        </>
      )}
      {isAdmin && <AdminDashboardArea />}
      {isConsumer && <MyDashboard isParent={role === "parent"} />}

      {!hasRoleView && (
        <EmptyState
          icon={<Eye className="h-12 w-12" />}
          title="View-only access"
          description="Your account doesn't have a module dashboard yet. Use the search (Ctrl/⌘ K) to open the pages you can access, or contact your school admin if you need more."
        />
      )}

      {isConsumer && <RecordingAnalyticsSection />}
    </motion.div>
  );
}
