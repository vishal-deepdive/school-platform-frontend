import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { roleCanAccess } from "@/shared/lib/permissions";
import { useAuthStore } from "@/features/auth/store/auth";
import { navItems, adminNavItems, type NavItem } from "./navConfig";
import { UserProfileMenu } from "./UserProfileMenu";
import { MobileSidebarItem } from "./MobileSidebarItem";
import type { UserRole } from "@/features/auth/types";

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

/** Shared tooltip for the icon rail — shows on hover and keyboard focus. */
function RailTooltip({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 flex -translate-x-1 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 peer-hover:translate-x-0 peer-hover:opacity-100 peer-focus-visible:translate-x-0 peer-focus-visible:opacity-100">
      {label}
      {shortcut && (
        <kbd className="rounded bg-background/20 px-1 py-0.5 font-sans text-[10px] font-semibold">
          {shortcut}
        </kbd>
      )}
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-[4px] border-transparent border-r-foreground" />
    </div>
  );
}

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
  }, [isAdmin, user?.role]);

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);
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
    setActiveCategory(item);
    setCollapsed(false);
    if (item.href && !item.children) {
      navigate(item.href);
      if (mobile && onClose) onClose();
    } else if (item.children && item.children.length > 0) {
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
      <aside className="relative flex h-full w-[286px] max-w-[85vw] flex-col border-r border-border/60 bg-background shadow-2xl animate-slide-in">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
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
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Menu
          </p>
          {allItems.map((item, i) => (
            <div key={i}>
              <MobileSidebarItem item={item} onClose={onClose} />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-border/60 bg-muted/20 p-3">
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
      <aside
        className={cn(
          "relative z-20 flex h-full w-16 flex-col items-center py-4",
          hasSecondary && !isCollapsed && "border-r border-border/60",
        )}
      >
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
          <button
            onClick={() =>
              window.dispatchEvent(new Event("open-command-palette"))
            }
            className="peer flex w-full items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-2.5 text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search pages and actions"
          >
            <Search className="h-4 w-4" />
          </button>
          <RailTooltip label="Search" shortcut="Ctrl K" />
        </div>

        <div className="my-4 h-px w-8 shrink-0 bg-border/70" aria-hidden="true" />

        {/* Primary Nav Items */}
        <nav className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-visible px-2 pb-4">
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
                    className="mx-auto mb-1.5 h-px w-8 bg-border/70"
                    aria-hidden="true"
                  />
                )}
                <div className="relative w-full">
                  {/* Active indicator */}
                  <span
                    className={cn(
                      "absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                      isActive
                        ? "scale-y-100 opacity-100"
                        : "scale-y-0 opacity-0",
                    )}
                  />
                  <button
                    onClick={() => handleCategoryClick(item)}
                    className={cn(
                      "peer flex w-full items-center justify-center rounded-lg p-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                  </button>
                  <RailTooltip label={item.label} />
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
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-28 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
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
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 pl-5 pr-3">
              <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {activeCategory?.label}
              </h2>
              <button
                onClick={() => setCollapsed(true)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/60 hover:text-foreground"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav key={activeCategory?.label} className="space-y-0.5">
                {activeCategory?.children?.map((child, i) => (
                  <NavLink
                    key={i}
                    to={child.href || "#"}
                    end={child.end !== undefined ? child.end : child.href === "/"}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 animate-nav-item-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            "flex items-center justify-center transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground/70 group-hover:text-foreground",
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
