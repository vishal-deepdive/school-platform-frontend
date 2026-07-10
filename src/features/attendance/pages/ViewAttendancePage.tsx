import { useState } from "react";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { cn } from "@/shared/lib/utils";
import {
  AttendanceDateView,
  AttendanceRangeView,
  ClassAttendanceCalendar,
  SelfAttendanceView,
} from "@/features/attendance/components";
import { isStaff } from "@/shared/lib/permissions";

const viewTabs = [
  {
    id: "date",
    label: "By Date",
    hint: "Single day",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "range",
    label: "Date Range",
    hint: "Span of days",
    icon: <CalendarRange className="h-4 w-4" />,
  },
  {
    id: "calendar",
    label: "Calendar",
    hint: "Monthly %",
    icon: <CalendarDays className="h-4 w-4" />,
  },
];

export function ViewAttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState("date");

  if (!isStaff(role)) {
    return <SelfAttendanceView />;
  }

  return (
    <div className="space-y-6">
      {/* Modern segmented control — clearer than an underline tab row */}
      <div className="inline-flex w-full gap-1 rounded-2xl border border-border/60 bg-muted p-1 sm:w-auto">
        {viewTabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={active ? "text-primary" : ""}>{t.icon}</span>
              {t.label}
              <span className="hidden text-xs font-normal text-muted-foreground/70 md:inline">
                · {t.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "date" && <AttendanceDateView />}
      {tab === "range" && <AttendanceRangeView />}
      {tab === "calendar" && <ClassAttendanceCalendar />}
    </div>
  );
}
