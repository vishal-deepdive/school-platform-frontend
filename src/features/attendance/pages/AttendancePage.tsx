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

export function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = !!role && STAFF_ROLES.includes(role);

  const tabs: TabRoute[] = isStaff
    ? [enrollTab, markTab, viewTab, statsTab]
    : [viewTab];

  return (
    <ModulePageLayout tabs={tabs} />
  );
}
