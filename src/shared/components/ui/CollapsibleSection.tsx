import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface CollapsibleSectionProps {
  /** Stable key — open/closed state persists per section in localStorage. */
  id: string;
  title: string;
  /** One-line hook shown under the title (visible in both states). */
  description?: string;
  /** Optional link/CTA rendered at the row's right edge, outside the toggle. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const storageKey = (id: string) => `section-open-${id}`;

/**
 * A page section that folds away and remembers its state, so long dashboards
 * stay scannable: the header always shows what lives inside, the body mounts
 * either way (queries fire once, expanding is instant).
 */
export function CollapsibleSection({
  id,
  title,
  description,
  action,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(storageKey(id));
    return saved === null ? defaultOpen : saved === "1";
  });

  const toggle = () => {
    setOpen((prev) => {
      localStorage.setItem(storageKey(id), prev ? "0" : "1");
      return !prev;
    });
  };

  return (
    <section className={className}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`section-${id}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* grid-rows trick animates open/close without measuring heights */}
      <div
        id={`section-${id}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0 overflow-hidden", open && "pt-4")}>
          {children}
        </div>
      </div>
    </section>
  );
}
