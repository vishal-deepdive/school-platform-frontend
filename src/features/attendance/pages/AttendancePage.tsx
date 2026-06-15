import { Users, CheckSquare, List, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const enrollTab: TabRoute = {
  id: "enroll",
  label: "Enroll Students",
  icon: <Users className="h-4 w-4" />,
  to: "/attendance/enroll",
};
const markTab: TabRoute = {
  id: "mark",
  label: "Mark Attendance",
  icon: <CheckSquare className="h-4 w-4" />,
  to: "/attendance/mark",
};
const viewTab: TabRoute = {
  id: "view",
  label: "View Records",
  icon: <List className="h-4 w-4" />,
  to: "/attendance/view",
};
const statsTab: TabRoute = {
  id: "stats",
  label: "Statistics",
  icon: <TrendingUp className="h-4 w-4" />,
  to: "/attendance/stats",
};

// Students/parents are read-only consumers: they only get the View tab.
const STAFF_ROLES = ["admin", "principal", "teacher"];

const descriptions: Record<string, string> = {
  enroll:
    "Upload a ZIP of face photos to register students for face-recognition attendance.",
  mark: "Upload a classroom photo to automatically mark attendance using face recognition.",
  view: "Browse attendance records by date or across a date range.",
  stats: "Overview of student enrollments across schools, classes, and sections.",
};

export function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = !!role && STAFF_ROLES.includes(role);

  const tabs: TabRoute[] = isStaff
    ? [enrollTab, markTab, viewTab, statsTab]
    : [viewTab];

  return (
    <ModulePageLayout title="Attendance" tabs={tabs} descriptions={descriptions} />
  );
}
