import { useId, useRef } from "react";
import { cn } from "@/shared/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Item count shown as a small pill after the label. */
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  /** Tighter padding for tabs that head a card instead of a page. */
  size?: "md" | "sm";
  className?: string;
}

export function Tabs({ tabs, active, onChange, size = "md", className }: TabsProps) {
  const groupId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex: Left/Right/Home/End move focus and selection together.
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div className={cn("border-b border-border/50", className)}>
      <nav
        role="tablist"
        className="-mb-px flex gap-2 overflow-x-auto scrollbar-thin"
      >
        {tabs.map((tab, i) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              id={`${groupId}-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                size === "sm" ? "px-3 py-2.5" : "px-4 py-3",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
