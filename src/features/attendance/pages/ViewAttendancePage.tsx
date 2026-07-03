import { useState } from "react";
import { Calendar, CalendarRange } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { Tabs } from "@/shared/components/ui/Tabs";
import {
  AttendanceDateView,
  AttendanceRangeView,
  SelfAttendanceView,
} from "@/features/attendance/components";
import { isStaff } from "@/shared/lib/permissions";

const viewTabs = [
  { id: "date", label: "By Date", icon: <Calendar className="h-4 w-4" /> },
  { id: "range", label: "Date Range", icon: <CalendarRange className="h-4 w-4" /> },
];

export function ViewAttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState("date");

  if (!isStaff(role)) {
    return (
      <div className="space-y-6">
        <SelfAttendanceView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        tabs={viewTabs}
        active={tab}
        onChange={(id) => {
          setTab(id);
        }}
      />

      {tab === "date" && <AttendanceDateView />}
      {tab === "range" && <AttendanceRangeView />}
    </div>
  );
}
