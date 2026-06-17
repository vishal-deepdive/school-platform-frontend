import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/auth";
import { Tabs } from "@/shared/components/ui/Tabs";
import {
  AttendanceDateView,
  AttendanceRangeView,
  SelfAttendanceView,
} from "@/features/attendance/components";

const viewTabs = [
  { id: "date", label: "By Date" },
  { id: "range", label: "Date Range" },
];

const STAFF_ROLES = ["admin", "principal", "teacher"];

export function ViewAttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = !!role && STAFF_ROLES.includes(role);
  const [tab, setTab] = useState("date");

  // Students/parents get a focused self-view instead of the staff filter tabs.
  if (!isStaff) {
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
