import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { roleCanAccess } from "@/shared/lib/permissions";
import { useAuthStore } from "@/features/auth/store/auth";
import { navItems, adminNavItems, type NavItem } from "./navConfig";
import { UserProfileMenu } from "./UserProfileMenu";
import { MobileSidebarItem } from "./MobileSidebarItem";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import type { UserRole } from "@/features/auth/types";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { toast } from "@/shared/lib/toast";

/**
 * Filter nav items by the user's role. A leaf item is kept only if the user may
 * access its href; a parent group is kept only if at least one child survives.
 * Keeps the sidebar in sync with the route guards (both read ROUTE_ROLES).
 */
function filterNavByRole(items: NavItem[], role?: UserRole | null): NavItem[] {
  return items
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const children = item.children.filter((c) =>
          c.href ? roleCanAccess(c.href, role) : true,
        );
        return children.length > 0 ? { ...item, children } : null;
      }
      return !item.href || roleCanAccess(item.href, role) ? item : null;
    })
    .filter((i): i is NavItem => i !== null);
}

const ADMIN_LABELS = new Set(adminNavItems.map((i) => i.label));

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();

  const allItems = useMemo(() => {
    const base = [...navItems, ...(isAdmin ? adminNavItems : [])];
    return filterNavByRole(base, user?.role).filter((item) => !item.hidden);
  }, [user?.role]);

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);

  // Check if admin has selected a school
  const { ready } = useActiveSchool();

  // Sliding tab indicator (desktop rail): one floating surface translated to
  // the active item, so tab changes glide up/down instead of popping.
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
  } | null>(null);
  const activeIdx = activeCategory ? allItems.indexOf(activeCategory) : -1;

  useLayoutEffect(() => {
    const el = activeIdx >= 0 ? itemRefs.current[activeIdx] : null;
    // offsetTop/offsetHeight are relative to the positioned <nav>, so the
    // measurement stays correct when the admin divider shifts items down.
    setIndicator(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
  }, [activeIdx, allItems]);

  // Collapsed state survives reloads so the layout doesn't jump each session.
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1",
  );

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  };

  // Sync active category with current route (Desktop mainly)
  useEffect(() => {
    const active = allItems.find((item) => {
      if (item.href === "/" && location.pathname === "/") return true;
      if (
        item.href &&
        item.href !== "/" &&
        location.pathname.startsWith(item.href)
      )
        return true;
      if (item.children) {
        return item.children.some(
          (c) => c.href && location.pathname.startsWith(c.href),
        );
      }
      return false;
    });

    setActiveCategory((prev) => {
      if (active) return active;
      if (!prev && allItems.length > 0) return allItems[0];
      return prev;
    });
  }, [location.pathname, allItems]);

  const handleCategoryClick = (item: NavItem) => {
    const targetHref = item.href || (item.children && item.children[0]?.href);
    
    const isGated = (href: string) => 
      href.startsWith("/attendance") || 
      href.startsWith("/recording") || 
      href.startsWith("/rag") || 
      href.startsWith("/survey") || 
      href.startsWith("/students");

    if (isAdmin && !ready && targetHref && isGated(targetHref)) {
      toast.warning("Please select a school first to access this module.");
      return;
    }

    const wasActive = activeCategory === item;
    setActiveCategory(item);
    setCollapsed(false);
    if (item.href && !item.children) {
      navigate(item.href);
      if (mobile && onClose) onClose();
    } else if (!wasActive && item.children && item.children.length > 0) {
      const firstChildHref = item.children[0].href;
      if (firstChildHref) {
        navigate(firstChildHref);
        if (mobile && onClose) onClose();
      }
    }
  };

  // ------------------------------------
  // MOBILE RENDER (ACCORDION)
  // ------------------------------------
  if (mobile) {
    return (
      <aside className="relative flex h-full w-[286px] max-w-[85vw] flex-col border-r border-slate-200 dark:border-slate-800 bg-background shadow-2xl animate-slide-in">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="DeepDive Logo"
              className="w-36 h-18 object-contain"
            />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <p className="eyebrow px-3 pb-2">Menu</p>
          {allItems.map((item) => (
            <div key={item.label}>
              <MobileSidebarItem item={item} onClose={onClose} />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-muted/20 p-3">
          <UserProfileMenu mobile />
        </div>
      </aside>
    );
  }

  // ------------------------------------
  // DESKTOP RENDER (DUAL-PANE)
  // ------------------------------------
  const hasSecondary =
    activeCategory?.children && activeCategory.children.length > 0;

  return (
    <div className="relative flex h-full bg-background">
      {/* Primary Sidebar (Icons only) */}
      <aside className="relative z-20 flex h-full w-16 flex-col items-center bg-rail py-4">
        {/* Logo */}
        <div className="mb-4 flex h-10 w-8 shrink-0 items-center justify-center">
          <img
            src="/favicon.png"
            alt="DeepDive Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Command palette trigger */}
        <div className="relative w-full px-2">
          <Tooltip content="Search" shortcut="Ctrl K" side="right" delayDuration={500}>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("open-command-palette"))
              }
              className="flex w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-background/70 p-2.5 text-slate-600 dark:text-slate-400 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search pages and actions"
            >
              <Search className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        <div className="my-4 h-px w-8 shrink-0 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

        {/* Primary Nav Items */}
        <nav className="relative flex w-full flex-1 flex-col items-center gap-1.5 overflow-visible px-2 pb-4">
          {/* Floating active tab: accent bar + merged surface + inverted
              corners travel together to the active item on a transform, so
              switching tabs slides smoothly up/down on the GPU. */}
          {indicator && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 transition-[transform,height] [transition-duration:280ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                transform: `translateY(${indicator.top}px)`,
                height: indicator.height,
              }}
            >
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              <span className="absolute inset-y-0 left-2 right-0 rounded-l-lg bg-background">
                <span className="absolute -top-3 right-0 h-3 w-3 bg-background">
                  <span className="absolute inset-0 rounded-br-full bg-rail" />
                </span>
                <span className="absolute -bottom-3 right-0 h-3 w-3 bg-background">
                  <span className="absolute inset-0 rounded-tr-full bg-rail" />
                </span>
              </span>
            </div>
          )}
          {allItems.map((item, idx) => {
            const isActive = activeCategory === item;
            const isFirstAdminItem =
              isAdmin &&
              ADMIN_LABELS.has(item.label) &&
              (idx === 0 || !ADMIN_LABELS.has(allItems[idx - 1].label));
            return (
              <div key={idx} className="w-full">
                {isFirstAdminItem && (
                  <div
                    className="mx-auto mb-1.5 h-px w-8 bg-slate-200 dark:bg-slate-800"
                    aria-hidden="true"
                  />
                )}
                <div
                  ref={(el) => (itemRefs.current[idx] = el)}
                  className={cn("relative w-full", isActive && "z-10")}
                >
                  <Tooltip content={item.label} side="right" delayDuration={500}>
                    <button
                      onClick={() => handleCategoryClick(item)}
                      className={cn(
                        "flex items-center justify-center p-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "w-[calc(100%+0.5rem)] rounded-l-lg text-primary"
                          : "w-full rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/40 hover:text-foreground",
                      )}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.icon}
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto flex w-full shrink-0 flex-col items-center px-2 pt-4">
          <UserProfileMenu />
        </div>
      </aside>

      {/* Collapse/Expand Floating Button (rendered when collapsed and category has children) */}
      {isCollapsed && hasSecondary && (
        <Tooltip content="Expand sidebar" side="right">
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-28 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-background text-slate-500 dark:text-slate-400 shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}

      {/* Secondary Sidebar (Context Menu) */}
      <aside
        className={cn(
          "z-10 h-full overflow-hidden bg-background transition-all duration-300 ease-in-out",
          hasSecondary && !isCollapsed ? "w-60" : "w-0",
        )}
      >
        {hasSecondary && (
          <div className="flex h-full w-60 flex-col">
            {/* Header title aligns with item text below (24px inset). */}
            <div className="flex h-16 shrink-0 items-center justify-between pl-6 pr-3">
              <h2
                key={activeCategory?.label}
                className="animate-nav-item-in truncate text-[15px] font-semibold tracking-tight text-foreground"
              >
                {activeCategory?.label}
              </h2>
              <Tooltip content="Collapse sidebar" side="right">
                <button
                  onClick={() => setCollapsed(true)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition-colors duration-200 hover:bg-muted hover:text-foreground"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav key={activeCategory?.label} className="space-y-px">
                {activeCategory?.children?.map((child, i) => (
                  <NavLink
                    key={child.href || child.label}
                    to={child.href || "#"}
                    end={child.end !== undefined ? child.end : child.href === "/"}
                    style={{ animationDelay: `${i * 25}ms` }}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 animate-nav-item-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "font-medium text-slate-600 dark:text-slate-400 hover:bg-muted/60 hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-150 [&>svg]:h-4 [&>svg]:w-4",
                            isActive
                              ? "text-primary"
                              : "text-slate-400 dark:text-slate-500 group-hover:text-foreground",
                          )}
                        >
                          {child.icon}
                        </div>
                        <span className="truncate">{child.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
