import {
  STATUS_LABELS,
  STATUS_ICONS,
  statusTextClass,
} from "@/features/attendance/lib/status";
import type { AttendanceStatus } from "@/features/attendance/types";

const ORDER: AttendanceStatus[] = ["P", "A", "L", "E", "H"];

/**
 * Legend for the P/A/L/E/H status codes. Pairs each code with an icon and full
 * label so meaning never depends on colour alone (accessibility) and parents
 * aren't left guessing what a bare "E" means.
 */
export function StatusLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-border/40 text-xs ${className}`}>
      {ORDER.map((s) => {
        const Icon = STATUS_ICONS[s];
        return (
          <span key={s} className="flex items-center gap-1.5 font-medium">
            <Icon className={`h-3.5 w-3.5 ${statusTextClass(s)}`} />
            <span className="font-bold text-slate-900 dark:text-slate-100">{s}</span>
            <span className="text-slate-600 dark:text-slate-400">{STATUS_LABELS[s]}</span>
          </span>
        );
      })}
      <span className="flex items-center gap-1.5 font-medium">
        <span className="font-bold text-slate-500 dark:text-slate-400">—</span>
        <span className="text-slate-600 dark:text-slate-400">Not marked</span>
      </span>
    </div>
  );
}
