import { useState, useId, useMemo } from "react";
import { format, parse, isValid, isSameMonth, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Calendar } from "./Calendar";

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) or undefined */
  value?: string;
  /** Called with an ISO date string or undefined when the user picks/clears */
  onChange?: (iso: string | undefined) => void;
  /** Label shown above the trigger button */
  label?: string;
  /** Validation error message */
  error?: string;
  /** Hint text shown below the trigger */
  hint?: string;
  /** Disable future dates beyond this ISO date string (inclusive) */
  max?: string;
  /** Disable dates before this ISO date string (inclusive) */
  min?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  /**
   * Visually fade (dim) Sundays in the calendar grid.
   * Sundays remain selectable — only their appearance changes.
   */
  fadeSundays?: boolean;
  /**
   * School holiday dates. Each Date object will be faded in the calendar grid.
   * Use the `useHolidayDates` hook to obtain these from the API.
   */
  holidays?: Date[];
}

/** Converts an ISO string (YYYY-MM-DD) → Date, or undefined */
function isoToDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

/** Converts a Date → ISO string (YYYY-MM-DD), or undefined */
function dateToIso(d: Date | undefined): string | undefined {
  if (!d || !isValid(d)) return undefined;
  return format(d, "yyyy-MM-dd");
}

/**
 * A professional DatePicker that is a drop-in replacement for
 * `<Input type="date">`. Accepts/emits ISO date strings so it plugs directly
 * into React Hook Form (via Controller) or uncontrolled state.
 */
export function DatePicker({
  value,
  onChange,
  label,
  error,
  hint,
  max,
  min,
  disabled,
  placeholder = "Pick a date",
  className,
  id,
  fadeSundays = false,
  holidays,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const inputId = id ?? uid;

  const selected = isoToDate(value);
  const maxDate = isoToDate(max);
  const minDate = isoToDate(min);

  // Track which month is currently visible in the calendar popover.
  // Seed from the selected date, falling back to today.
  const [displayMonth, setDisplayMonth] = useState<Date>(
    selected ?? new Date(),
  );

  // Hide the "next" button when the calendar is already showing the current
  // real-world month — navigating forward would only show future months.
  const atCurrentMonth = isSameMonth(displayMonth, new Date());

  const handleSelect = (day: Date | undefined) => {
    onChange?.(dateToIso(day));
    if (day) setOpen(false);
  };

  const displayValue = selected ? format(selected, "dd MMM yyyy") : undefined;

  // ── Modifiers for Sunday / holiday fading ─────────────────────────────────
  const sundayMatcher = useMemo(
    () => (fadeSundays ? (d: Date) => d.getDay() === 0 : undefined),
    [fadeSundays],
  );

  const holidayMatcher = useMemo(
    () =>
      holidays && holidays.length > 0
        ? (d: Date) => holidays.some((h) => isSameDay(h, d))
        : undefined,
    [holidays],
  );

  const modifiers = useMemo(() => {
    const m: Record<string, ((d: Date) => boolean)> = {};
    if (sundayMatcher) m.sunday = sundayMatcher;
    if (holidayMatcher) m.holiday = holidayMatcher;
    return m;
  }, [sundayMatcher, holidayMatcher]);

  /**
   * These classes get applied to the <td class="day"> cell element by rdp v9.
   * Using opacity on the cell dims both the date number AND any background
   * colour (today ring, selected fill, etc.) consistently.
   */
  const modifiersClassNames = useMemo(
    () => ({
      sunday: "opacity-40 [&>button]:text-rose-500 [&>button]:font-medium",
      holiday: "opacity-40 [&>button]:text-amber-500 [&>button]:font-medium",
    }),
    [],
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            id={inputId}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-background",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
              error
                ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                : "border-input focus:border-primary focus:ring-primary/20 hover:border-primary/50",
              !displayValue && "text-muted-foreground",
            )}
          >
            <span className={displayValue ? "text-foreground" : "text-muted-foreground"}>
              {displayValue ?? placeholder}
            </span>
            <CalendarIcon
              className={cn(
                "ml-2 h-4 w-4 shrink-0 transition-colors",
                open ? "text-primary" : "text-muted-foreground",
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            disabled={[
              ...(maxDate ? [{ after: maxDate }] : []),
              ...(minDate ? [{ before: minDate }] : []),
            ]}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            classNames={
              atCurrentMonth ? { button_next: "invisible pointer-events-none" } : {}
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {error && (
        <p className="mt-0.5 text-xs font-medium text-destructive">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
