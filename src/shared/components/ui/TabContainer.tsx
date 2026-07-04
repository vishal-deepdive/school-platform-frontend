import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  navItems,
  adminNavItems,
  type NavItem,
} from "@/app/layouts/navConfig";
import { cn } from "@/shared/lib/utils";

interface TabContainerProps {
  className?: string;
}

interface ActiveTab {
  module: NavItem;
  tab: NavItem;
}

/**
 * Resolve the module + tab from navConfig that matches the current path, so
 * the header always mirrors the item highlighted in the secondary sidebar.
 * Longest matching href wins (e.g. "/survey/search" over "/survey").
 * Standalone items (no children) are treated as both module and tab.
 */
function findActiveTab(pathname: string): ActiveTab | null {
  let best: ActiveTab | null = null;
  for (const module of [...navItems, ...adminNavItems]) {
    // Standalone item — treat as both module and tab (skip noHeader items)
    if (module.href && !module.children && !module.noHeader) {
      const matches = module.end
        ? pathname === module.href
        : pathname.startsWith(module.href);
      if (matches && (!best || module.href.length > best.tab.href!.length)) {
        best = { module, tab: module };
      }
    }
    // Child tabs
    for (const tab of module.children ?? []) {
      if (!tab.href) continue;
      const matches = tab.end
        ? pathname === tab.href
        : pathname.startsWith(tab.href);
      if (matches && (!best || tab.href.length > best.tab.href!.length)) {
        best = { module, tab };
      }
    }
  }
  return best;
}

/**
 * Route-driven content shell rendered above an <Outlet/>. Used by module
 * layout pages so every module (Attendance, Recording, RAG, Survey) shares
 * the same page structure: a header echoing the active secondary-sidebar tab,
 * and a rounded inset panel that owns its own scroll area. Navigation itself
 * lives in navConfig.tsx (the sidebar), not here.
 *
 * The outer shell shares the secondary sidebar's background and bleeds over
 * AppLayout's <main> padding (negative margins mirror those values) so the
 * two read as one continuous surface.
 */
export function TabContainer({ className }: TabContainerProps) {
  const { pathname } = useLocation();
  const active = useMemo(() => findActiveTab(pathname), [pathname]);

  return (
    <div
      className={cn(
        // Cancel AppLayout <main> padding: px-4 py-4 md:px-6 md:pt-5 md:pb-3
        "-mx-4 -my-4 h-[calc(100%+2rem)] md:-mx-6 md:-mb-3 md:-mt-7",
        "flex min-h-0 flex-col bg-background/80 p-1",
        !active && "pt-3 md:pt-4",
        className,
      )}
    >
      {active && (
        <div className="flex h-14 shrink-0 items-center gap-3 px-1 md:h-16">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            {active.tab.icon}
          </div>
          <div className="min-w-0">
            {active.module !== active.tab && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {active.module.label}
              </p>
            )}
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground">
              {active.tab.label}
            </h1>
          </div>
        </div>
      )}

      {/* In dark mode the panel dips below the background instead of using
          muted (which composites to ~the same lightness as bg-card), so cards
          inside stay visibly elevated. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 dark:border-border/50 dark:bg-black/25">
        <div className="h-full overflow-y-auto scrollbar-custom px-3 py-4 md:px-4 md:py-5">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
