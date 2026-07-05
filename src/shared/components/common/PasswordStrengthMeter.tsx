import { Check, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  PASSWORD_RULES,
  evaluatePassword,
  type PasswordLevel,
} from "@/shared/lib/password";

/**
 * Live password strength meter + requirements checklist.
 *
 * Follows the data-viz rules for a "meter": strength is never conveyed by color
 * alone — every state carries a text label ("Weak"…"Strong") and a per-rule
 * checklist with icons, so it's legible to colorblind and screen-reader users.
 * The color ramp is a status ramp (critical → warning → good), validated to read
 * in both light and dark surfaces.
 */

// Fill color per level (1–4). Level 0 (empty) shows no fill.
const LEVEL_FILL: Record<PasswordLevel, string> = {
  0: "",
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-lime-500",
  4: "bg-emerald-500",
};

const LEVEL_TEXT: Record<PasswordLevel, string> = {
  0: "text-muted-foreground",
  1: "text-destructive",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-lime-600 dark:text-lime-400",
  4: "text-emerald-600 dark:text-emerald-400",
};

const SEGMENTS = [1, 2, 3, 4] as const;

interface PasswordStrengthMeterProps {
  value: string;
  className?: string;
  /** Hide the per-rule checklist and show only the bar + label. */
  showChecklist?: boolean;
}

export function PasswordStrengthMeter({
  value,
  className,
  showChecklist = true,
}: PasswordStrengthMeterProps) {
  const { level, label, passed } = evaluatePassword(value);

  return (
    <div className={cn("grid gap-2", className)}>
      {/* Segmented bar */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {SEGMENTS.map((seg) => (
          <span
            key={seg}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              seg <= level ? LEVEL_FILL[level] : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Text label — announced to screen readers as strength changes */}
      <p
        className="flex items-center justify-between text-xs"
        role="status"
        aria-live="polite"
      >
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn("font-semibold", LEVEL_TEXT[level])}>
          {label || "—"}
        </span>
      </p>

      {showChecklist && (
        <ul className="grid gap-1 pt-0.5">
          {PASSWORD_RULES.map((rule) => {
            const ok = passed.includes(rule.id);
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                )}
              >
                {ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                )}
                <span>{rule.label}</span>
                <span className="sr-only">{ok ? "met" : "not met"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
