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
  P: "text-green-600 dark:text-green-400",
  A: "text-red-500 dark:text-red-400",
  L: "text-amber-500 dark:text-amber-400",
  E: "text-blue-500 dark:text-blue-400",
  H: "text-muted-foreground",
};

export function statusTextClass(status: string): string {
  return STATUS_TEXT_CLASSES[status as AttendanceStatus] ?? "text-muted-foreground";
}

// Full cell treatment (background + text + subtle ring) for calendar-grid days,
// where a status needs to read at a glance without relying on a text label.
export const STATUS_CELL_CLASSES: Record<AttendanceStatus, string> = {
  P: "bg-green-500/10 text-green-700 ring-1 ring-inset ring-green-500/25 dark:text-green-400",
  A: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
  L: "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-400",
  E: "bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/25 dark:text-blue-400",
  H: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border/60",
};

export function statusCellClass(status: string): string {
  return (
    STATUS_CELL_CLASSES[status as AttendanceStatus] ??
    "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-border/40"
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
  success: "bg-green-500/10 text-green-700 ring-1 ring-inset ring-green-500/25 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
  none: "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-border/40",
};

export function percentageCellClass(pct: number | null): string {
  return PERCENTAGE_CELL_CLASSES[percentageBucket(pct)];
}
