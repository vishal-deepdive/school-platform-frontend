import { useRef } from "react";
import { cn } from "@/shared/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  /** Below `sm`, show only the icon of options that have one. */
  compact?: boolean;
  className?: string;
}

/**
 * Small pill switch for flipping between views of the same data (e.g.
 * Browse / All chapters). Sized to sit in the module header's leading slot.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  compact = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-lg border border-border/70 bg-background/70 p-0.5 scrollbar-thin",
        className,
      )}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact && option.icon ? option.label : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon}
            <span className={cn(compact && option.icon && "hidden sm:inline")}>
              {option.label}
            </span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-muted-foreground" : "text-muted-foreground/70",
                )}
              >
                {option.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
