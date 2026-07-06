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
  // Full-height "app" pages (the Q&A chat) manage their own internal scroll,
  // so the shell hands them an exact height and drops its own vertical padding.
  const fullBleed = active?.tab.fullBleed ?? false;

  const isDashboard = pathname === "/dashboard";

  return (
    <div
      className={cn(
        // Cancel AppLayout <main> padding: px-4 py-4 md:px-6 md:pt-5 md:pb-3
        "-mx-4 -my-4 h-[calc(100%+2rem)] md:-mx-6 md:-mb-3 md:-mt-5",
        "flex min-h-0 flex-col bg-background/80",
        isDashboard ? "p-0" : "p-1",
        (!active && !isDashboard) && "pt-3 md:pt-4",
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
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.02] via-muted/30 to-primary/[0.06] dark:from-primary/[0.03] dark:via-black/25 dark:to-primary/[0.09]",
          !isDashboard && "border border-border/60 dark:border-border/50",
        )}
      >
        <div
          className={cn(
            "h-full scrollbar-custom",
            // Full-bleed pages own their scroll and sit tight to the frame;
            // regular pages scroll here with generous padding.
            fullBleed
              ? "overflow-hidden p-1.5 md:p-2"
              : "overflow-y-auto px-3 py-4 md:px-4 md:py-5",
          )}
        >
          {/* h-full gives full-bleed pages an exact height so they can pin a
              footer and scroll internally; min-h-full lets normal content
              pages flow top-down and let this container scroll. */}
          <div
            className={cn(
              "mx-auto flex w-full max-w-6xl flex-col",
              fullBleed ? "h-full min-h-0" : "min-h-full",
            )}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
