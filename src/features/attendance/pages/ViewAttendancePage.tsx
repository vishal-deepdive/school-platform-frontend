import { useState } from "react";
import { Tabs } from "@/shared/components/ui/Tabs";
import {
  AttendanceDateView,
  AttendanceRangeView,
} from "@/features/attendance/components";

const viewTabs = [
  { id: "date", label: "By Date" },
  { id: "range", label: "Date Range" },
];

export function ViewAttendancePage() {
  const [tab, setTab] = useState("date");

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
