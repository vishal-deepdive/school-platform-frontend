import {
  Users,
  CheckSquare,
  List,
  TrendingUp,
  ClipboardList,
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  UserCog,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const dashboardTab: TabRoute = {
  id: "dashboard",
  label: "Dashboard",
  icon: <LayoutDashboard className="h-4 w-4" />,
  to: "/attendance/dashboard",
};
const enrollTab: TabRoute = {
  id: "enroll",
  label: "Enroll Students",
  icon: <Users className="h-4 w-4" />,
  to: "/attendance/enroll",
};
const rollCallTab: TabRoute = {
  id: "roll-call",
  label: "Roll Call",
  icon: <ClipboardList className="h-4 w-4" />,
  to: "/attendance/roll-call",
};
const markTab: TabRoute = {
  id: "mark",
  label: "Mark (Photos)",
  icon: <CheckSquare className="h-4 w-4" />,
  to: "/attendance/mark",
};
const viewTab: TabRoute = {
  id: "view",
  label: "View Records",
  icon: <List className="h-4 w-4" />,
  to: "/attendance/view",
};
const leaveTab: TabRoute = {
  id: "leave",
  label: "Leave",
  icon: <CalendarClock className="h-4 w-4" />,
  to: "/attendance/leave",
};
const holidaysTab: TabRoute = {
  id: "holidays",
  label: "Holidays",
  icon: <CalendarDays className="h-4 w-4" />,
  to: "/attendance/holidays",
};
const manageTab: TabRoute = {
  id: "manage",
  label: "Manage Students",
  icon: <UserCog className="h-4 w-4" />,
  to: "/attendance/manage",
};
const statsTab: TabRoute = {
  id: "stats",
  label: "Statistics",
  icon: <TrendingUp className="h-4 w-4" />,
  to: "/attendance/stats",
};

const STAFF_ROLES = ["admin", "principal", "teacher"];
// Holiday calendar and destructive student management are school-admin duties.
const ADMIN_ROLES = ["admin", "principal"];

export function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = !!role && STAFF_ROLES.includes(role);
  const isSchoolAdmin = !!role && ADMIN_ROLES.includes(role);

  // Students/parents get their own records plus the ability to apply for leave.
  let tabs: TabRoute[];
  if (isStaff) {
    tabs = [
      dashboardTab,
      enrollTab,
      rollCallTab,
      markTab,
      viewTab,
      leaveTab,
      statsTab,
    ];
    if (isSchoolAdmin) {
      tabs.push(holidaysTab, manageTab);
    }
  } else {
    tabs = [viewTab, leaveTab];
  }

  return <ModulePageLayout tabs={tabs} />;
}
