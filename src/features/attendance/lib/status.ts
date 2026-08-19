import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/shared/components/ui/Badge";
import type { SelectOption } from "@/shared/types/common";
import type { AttendanceStatus } from "@/features/attendance/types";

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
  E: "Excused",
  H: "Half Day",
};

// Icons pair a shape with each status so it never relies on colour alone
// (colour-blind / low-vision accessibility).
export const STATUS_ICONS: Record<AttendanceStatus, LucideIcon> = {
  P: CheckCircle2,
  A: XCircle,
  L: Clock,
  E: FileCheck,
  H: CircleDashed,
};

export function statusIcon(status: string): LucideIcon {
  return STATUS_ICONS[status as AttendanceStatus] ?? CircleDashed;
}

export const STATUS_VARIANTS: Record<AttendanceStatus, BadgeVariant> = {
  P: "success",
  A: "danger",
  L: "warning",
  E: "info",
  H: "default",
};

export const STATUS_OPTIONS: SelectOption[] = (
  Object.keys(STATUS_LABELS) as AttendanceStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value] }));

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as AttendanceStatus] ?? status;
}

export function statusVariant(status: string): BadgeVariant {
  return STATUS_VARIANTS[status as AttendanceStatus] ?? "default";
}

export const STATUS_TEXT_CLASSES: Record<AttendanceStatus, string> = {
  P: "text-emerald-600 dark:text-emerald-400 font-semibold",
  A: "text-rose-600 dark:text-rose-400 font-semibold",
  L: "text-amber-600 dark:text-amber-400 font-semibold",
  E: "text-blue-600 dark:text-blue-400 font-semibold",
  H: "text-slate-600 dark:text-slate-400 font-semibold",
};

export function statusTextClass(status: string): string {
  return STATUS_TEXT_CLASSES[status as AttendanceStatus] ?? "text-muted-foreground";
}

// Full cell treatment (background + text + subtle ring) for calendar-grid days,
// where a status needs to read at a glance without relying on a text label.
export const STATUS_CELL_CLASSES: Record<AttendanceStatus, string> = {
  P: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 shadow-2xs font-semibold",
  A: "bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30 shadow-2xs font-semibold",
  L: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30 shadow-2xs font-semibold",
  E: "bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-1 ring-inset ring-blue-500/30 shadow-2xs font-semibold",
  H: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border/80 shadow-2xs font-semibold",
};

export function statusCellClass(status: string): string {
  return (
    STATUS_CELL_CLASSES[status as AttendanceStatus] ??
    "bg-muted/60 text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-border/60"
  );
}

/** Percentage → semantic color bucket, matching the 75%/60% thresholds used
 * elsewhere in attendance (range view, class breakdown). */
export function percentageBucket(pct: number | null): "success" | "warning" | "danger" | "none" {
  if (pct == null) return "none";
  if (pct >= 75) return "success";
  if (pct >= 60) return "warning";
  return "danger";
}

// Full cell treatment for a day showing a class-wide attendance percentage.
export const PERCENTAGE_CELL_CLASSES: Record<ReturnType<typeof percentageBucket>, string> = {
  success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 shadow-2xs font-semibold",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30 shadow-2xs font-semibold",
  danger: "bg-rose-500/15 text-rose-800 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30 shadow-2xs font-semibold",
  none: "bg-muted/50 text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-border/60",
};

export function percentageCellClass(pct: number | null): string {
  return PERCENTAGE_CELL_CLASSES[percentageBucket(pct)];
}
