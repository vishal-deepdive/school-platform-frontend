import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  UserCheck,
  Mic2,
  BookOpen,
  BarChart2,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { PageHeader } from "@/shared/components/ui/PageHeader";

const quickLinks = [
  {
    title: "Enroll Students",
    desc: "Upload face photos to register students for attendance",
    href: "/attendance/enroll",
    icon: <Users className="h-6 w-6" />,
    color: "text-primary bg-primary/10",
  },
  {
    title: "Mark Attendance",
    desc: "Upload classroom photos to auto-mark attendance",
    href: "/attendance/mark",
    icon: <UserCheck className="h-6 w-6" />,
    color: "text-green-600 dark:text-green-400 bg-green-500/10",
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
];

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ["attendance", "stats"],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 5 * 60_000,
  });

  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60_000,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] ?? "there"} 👋`}
        description="Here's what's happening on your platform today."
      />

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

      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Card
              key={link.href}
              className="group overflow-hidden"
              padding="md"
              hoverable
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${link.color}`}>
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{link.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {link.desc}
                  </p>
                  <Link
                    to={link.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 group-hover:gap-2 transition-all"
                  >
                    Get started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
            <h2 className="text-base font-semibold text-foreground">
              Enrollment by School
            </h2>
            <Link
              to="/attendance/stats"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
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
