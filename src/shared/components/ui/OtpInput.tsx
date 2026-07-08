import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/shared/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the last box is filled — use it to auto-submit. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

/**
 * Segmented one-time-code input: one box per digit with auto-advance,
 * backspace-to-previous, arrow-key navigation, and full paste support.
 * Numeric-only, and surfaces `autocomplete="one-time-code"` so browsers and
 * password managers can offer the code.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
  error = false,
  "aria-label": ariaLabel = "One-time passcode",
  "aria-describedby": ariaDescribedby,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && /^\d+$/.test(next)) onComplete?.(next);
  };

  const setChar = (i: number, ch: string) => {
    const arr = Array.from({ length }, (_, k) => value[k] ?? "");
    arr[i] = ch;
    emit(arr.join(""));
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1); // last typed digit
    if (!digit) return;
    setChar(i, digit);
    if (i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        setChar(i, "");
      } else if (i > 0) {
        setChar(i - 1, "");
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    emit(digits);
    focusBox(digits.length >= length ? length - 1 : digits.length);
  };

  // Keep focus on the first empty box so entry stays contiguous.
  const handleFocus = (i: number) => {
    const firstEmpty = value.length;
    if (i > firstEmpty) focusBox(firstEmpty);
  };

  return (
    <div className="flex items-center justify-between gap-2" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`${ariaLabel} digit ${i + 1}`}
          aria-invalid={error || undefined}
          aria-describedby={ariaDescribedby}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          className={cn(
            "h-12 w-full min-w-0 rounded-lg border border-input dark:border-input/50 bg-background text-center text-lg font-semibold text-foreground shadow-sm shadow-black/5 transition-all",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/20",
          )}
        />
      ))}
    </div>
  );
}
