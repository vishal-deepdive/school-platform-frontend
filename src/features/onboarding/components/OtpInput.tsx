import { useRef, useCallback } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Segmented one-time-code input: one auto-advancing box per digit, with full
 * paste support and an onComplete callback fired when every box is filled.
 * Controlled via a single string `value` so callers keep one source of truth.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  className,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fired once when the final digit lands (also on a full-length paste). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const commit = useCallback(
    (next: string) => {
      const clean = next.replace(/\D/g, "").slice(0, length);
      onChange(clean);
      if (clean.length === length) onComplete?.(clean);
    },
    [length, onChange, onComplete],
  );

  const focusIndex = (i: number) => {
    const el = inputsRef.current[Math.max(0, Math.min(i, length - 1))];
    el?.focus();
    el?.select();
  };

  const handleChange = (i: number, raw: string) => {
    const entered = raw.replace(/\D/g, "");
    if (!entered) {
      // Digit deleted via the input itself.
      commit(value.slice(0, i) + value.slice(i + 1));
      return;
    }
    // Typing (or an OS autofill dropping several digits into one box):
    // overwrite from this position onward.
    const next = (value.slice(0, i) + entered).slice(0, length);
    commit(next);
    focusIndex(i + entered.length);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      commit(value.slice(0, i - 1) + value.slice(i));
      focusIndex(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusIndex(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusIndex(pasted.length - 1);
  };

  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      role="group"
      aria-label={`${length}-digit verification code`}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length} // allow autofill to land >1 char; handleChange redistributes
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-10 rounded-lg border border-input bg-background text-center font-mono text-lg font-semibold text-foreground",
            "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-60",
            digit && "border-primary/50",
          )}
        />
      ))}
    </div>
  );
}
