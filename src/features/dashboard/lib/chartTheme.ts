import type { AttendanceStatus } from "@/features/attendance/types";

/** Shared palette for attendance-status visuals so every chart on the
 * dashboard colors P/A/L/E/H identically in light and dark mode. */
export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; color: string }
> = {
  P: { label: "Present", color: "#10b981" }, // emerald-500
  A: { label: "Absent", color: "#ef4444" }, // red-500
  L: { label: "Late", color: "#f59e0b" }, // amber-500
  E: { label: "Excused", color: "#3b82f6" }, // blue-500
  H: { label: "Half day", color: "#a855f7" }, // purple-500
};

export const STATUS_ORDER: AttendanceStatus[] = ["P", "A", "L", "E", "H"];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "02-07-2026" → "2 Jul" */
export function shortDate(ddmmyyyy: string): string {
  const [d, m] = ddmmyyyy.split("-");
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1] ?? ""}`;
}
