import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Fully-styled calendar built on react-day-picker v9.
 *
 * rdp v9 DOM structure (important for class targeting):
 *
 *   <div.root>               ← className prop → we add "relative"
 *     <nav.nav>              ← sibling of .months, rendered AFTER it in DOM
 *       <button.prev />
 *       <button.next />
 *     </nav>
 *     <div.months>
 *       <div.month>
 *         <div.month_caption>
 *           <span.caption_label />
 *         </div>
 *         <table.month_grid>
 *           <thead><tr.weekdays><th.weekday /></tr></thead>
 *           <tbody><tr.week><td.day><button.day_button /></td></tr></tbody>
 *         </table>
 *       </div>
 *     </div>
 *   </div>
 *
 * Strategy:
 *  - Root gets `relative` so the nav can be absolutely positioned over the caption row.
 *  - Nav is `absolute top-3 left-3 right-3` (matching the p-3 root padding) with h-9 to
 *    align with the caption row, and `pointer-events-none` so the label behind it stays
 *    unaffected; the actual buttons get `pointer-events-auto`.
 *  - Table cells (th.weekday, td.day) use natural table sizing — NO flex on tr/td.
 *  - We do NOT import react-day-picker/style.css to avoid class conflicts.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      /* "relative" lets the absolutely-positioned nav overlay the caption row */
      className={cn("relative p-3 select-none", className)}
      classNames={{
        /* ── Structural layout ─────────────────────────────────── */
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-1",

        /**
         * Caption row — centred label, h-9 so nav overlay aligns to it.
         * The nav sits on top via absolute positioning; caption-label is
         * purely decorative here (non-interactive).
         */
        month_caption:
          "flex justify-center items-center h-9 mb-1",
        caption_label:
          "text-sm font-semibold text-foreground pointer-events-none select-none",

        /**
         * Nav: overlays the caption row.
         * `pointer-events-none` on wrapper so only the explicit buttons are
         * hit-testable.
         */
        nav: cn(
          "absolute top-3 left-3 right-3 h-9",
          "flex items-center justify-between",
          "pointer-events-none z-10",
        ),
        button_previous: cn(
          "h-7 w-7 rounded-md border border-input bg-background",
          "text-muted-foreground",
          "inline-flex items-center justify-center",
          "hover:bg-accent hover:text-accent-foreground hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "transition-colors duration-150",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          "pointer-events-auto cursor-pointer", // re-enable clicks on the button itself
        ),
        button_next: cn(
          "h-7 w-7 rounded-md border border-input bg-background",
          "text-muted-foreground",
          "inline-flex items-center justify-center",
          "hover:bg-accent hover:text-accent-foreground hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "transition-colors duration-150",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          "pointer-events-auto cursor-pointer",
        ),

        /* ── Table grid (table/thead/tbody → use natural table sizing) ── */
        month_grid: "w-full border-collapse mt-1",
        weekdays: "",   // <tr> inside <thead> — no override needed
        weekday:
          "text-muted-foreground text-[0.72rem] font-medium text-center w-9 h-8 pb-1",
        week: "",        // <tr> inside <tbody> — no override needed
        day: "p-0 text-center align-middle", // <td>

        /* ── Day buttons ──────────────────────────────────────────── */
        day_button: cn(
          "h-9 w-9 rounded-md text-sm font-normal",
          "inline-flex items-center justify-center",
          "transition-colors duration-150 cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
        ),

        /* ── State modifiers ──────────────────────────────────────── */
        today:
          "[&>button]:border [&>button]:border-primary/60 [&>button]:font-bold [&>button]:text-primary",
        selected:
          "[&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button]:!font-semibold [&>button]:hover:!bg-primary/90",
        outside:
          "opacity-40",
        disabled:
          "opacity-30",
        hidden:
          "invisible",
        range_start:
          "[&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button]:!rounded-l-md [&>button]:!rounded-r-none",
        range_end:
          "[&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button]:!rounded-r-md [&>button]:!rounded-l-none",
        range_middle:
          "[&>button]:!bg-primary/15 [&>button]:!text-foreground [&>button]:!rounded-none",

        // Allow caller overrides
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4 pointer-events-none" />
          ) : (
            <ChevronRight className="h-4 w-4 pointer-events-none" />
          ),
      }}
      {...props}
    />
  );
}
