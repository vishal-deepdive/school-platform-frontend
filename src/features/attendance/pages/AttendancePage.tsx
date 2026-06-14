import { Users, CheckSquare, List, TrendingUp } from "lucide-react";
import { ModulePageLayout, type TabRoute } from "@/shared/components/ui";

const tabs: TabRoute[] = [
  {
    id: "enroll",
    label: "Enroll Students",
    icon: <Users className="h-4 w-4" />,
    to: "/attendance/enroll",
  },
  {
    id: "mark",
    label: "Mark Attendance",
    icon: <CheckSquare className="h-4 w-4" />,
    to: "/attendance/mark",
  },
  {
    id: "view",
    label: "View Records",
    icon: <List className="h-4 w-4" />,
    to: "/attendance/view",
  },
  {
    id: "stats",
    label: "Statistics",
    icon: <TrendingUp className="h-4 w-4" />,
    to: "/attendance/stats",
  },
];

const descriptions: Record<string, string> = {
  enroll:
    "Upload a ZIP of face photos to register students for face-recognition attendance.",
  mark: "Upload a classroom photo to automatically mark attendance using face recognition.",
  view: "Browse attendance records by date or across a date range.",
  stats: "Overview of student enrollments across schools, classes, and sections.",
};

export function AttendancePage() {
  return (
    <ModulePageLayout title="Attendance" tabs={tabs} descriptions={descriptions} />
  );
}
