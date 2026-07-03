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
