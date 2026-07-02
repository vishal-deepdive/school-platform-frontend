import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface InfoHintProps {
  /** The explanatory text shown on hover / focus / tap. */
  text: string;
  /** Accessible label for the trigger (defaults to "More information"). */
  label?: string;
  className?: string;
  /** Which side to render the bubble. Defaults to "top". */
  side?: "top" | "bottom";
}

/**
 * Small "why we ask" info affordance — an icon button with an accessible
 * tooltip. Dependency-free: shows on hover, keyboard focus, and tap (click
 * toggles for touch devices). Uses aria-describedby so screen readers announce
 * the hint when the trigger is focused.
 */
export function InfoHint({
  text,
  label = "More information",
  className,
  side = "top",
}: InfoHintProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-md transition-all duration-150",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open ? "opacity-100" : "invisible opacity-0",
        )}
      >
        {text}
      </span>
    </span>
  );
}
