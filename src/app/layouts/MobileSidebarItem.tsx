import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { NavItem } from "./navConfig";

interface MobileSidebarItemProps {
  item: NavItem;
  onClose?: () => void;
  /** Live counts keyed by NavItem.badgeKey. */
  badges?: Record<string, number>;
}

/** Small count pill mirroring the desktop rail badge. */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-blue-600 px-1.5 text-[11px] font-bold leading-none text-white shadow-xs">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileSidebarItem({
  item,
  onClose,
  badges,
}: MobileSidebarItemProps) {
  const location = useLocation();
  const isChildActive = item.children?.some(
    (c) => c.href && location.pathname.startsWith(c.href),
  );
  const [open, setOpen] = useState(isChildActive ?? false);

  const badgeFor = (n: NavItem): number =>
    (n.badgeKey && badges?.[n.badgeKey]) || 0;
  const railBadge = (item.children ?? []).reduce(
    (sum, c) => sum + badgeFor(c),
    badgeFor(item),
  );

  // Auto-expand when a child becomes active (e.g. via command palette navigation
  // while the mobile sidebar is already open).
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  if (item.href && !item.children) {
    return (
      <NavLink
        to={item.href}
        end={item.end !== undefined ? item.end : item.href === "/"}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            isActive
              ? "bg-primary/12 text-primary font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-foreground",
          )
        }
      >
        <span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        <Badge count={badgeFor(item)} />
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isChildActive
            ? "text-primary bg-primary/10 font-semibold"
            : "text-slate-800 dark:text-slate-200 hover:bg-primary/5 hover:text-foreground",
        )}
      >
        <span className={cn("[&>svg]:h-5 [&>svg]:w-5", isChildActive ? "text-primary" : "text-slate-500 dark:text-slate-400")}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        {!open && <Badge count={railBadge} />}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-0.5 border-l-2 border-border/70 ml-[22px] pl-3 animate-fade-in">
          {item.children?.map((child, i, arr) => {
            const showGroup =
              child.group && child.group !== arr[i - 1]?.group;
            return (
              <div key={child.href || child.label}>
                {showGroup && (
                  <p
                    className={cn(
                      "eyebrow px-2.5 pb-1 text-slate-500 dark:text-slate-400 font-bold",
                      i === 0 ? "pt-1" : "pt-3",
                    )}
                  >
                    {child.group}
                  </p>
                )}
                <NavLink
                  to={child.href || "#"}
                  onClick={onClose}
                  end={child.end !== undefined ? child.end : child.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "text-primary bg-primary/10 dark:bg-primary/20 dark:text-blue-300 font-semibold"
                        : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                    )
                  }
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center text-primary [&>svg]:h-4 [&>svg]:w-4">
                    {child.icon}
                  </div>
                  <span className="flex-1 truncate">{child.label}</span>
                  <Badge count={badgeFor(child)} />
                </NavLink>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
