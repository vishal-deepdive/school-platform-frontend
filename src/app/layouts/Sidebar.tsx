import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
    return filterNavByRole(base, user?.role);
  }, [isAdmin, user?.role]);

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    setIsCollapsed(false);
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
      <aside className="flex h-full w-[286px] max-w-[85vw] flex-col bg-background shadow-2xl animate-slide-in relative border-r border-border/60">
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
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
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
    <div className="flex h-full relative">
      {/* Primary Sidebar (Icons only) */}
      <aside className="relative z-20 flex h-full w-16 flex-col items-center border-r border-border/60 bg-background py-4">
        {/* Logo */}
        <div className="mb-6 flex h-10 w-8 shrink-0 items-center justify-center">
          <img
            src="/favicon.png"
            alt="DeepDive Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="mb-4 h-px w-8 shrink-0 bg-border/60" />

        {/* Primary Nav Items */}
        <nav className="flex w-full flex-1 flex-col items-center gap-2 px-2 pb-4 overflow-visible">
          {allItems.map((item, idx) => {
            const isActive = activeCategory === item;
            return (
              <div key={idx} className="group relative w-full">
                {/* Active indicator */}
                <span
                  className={cn(
                    "absolute -left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary transition-all duration-300",
                    isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
                  )}
                />
                <button
                  onClick={() => handleCategoryClick(item)}
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-200 active:scale-95",
                    isActive
                      ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px] shadow-primary/15"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                </button>
                {/* Tooltip */}
                <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 pointer-events-none z-50 whitespace-nowrap">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-foreground" />
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
          onClick={() => setIsCollapsed(false)}
          className="absolute left-[52px] top-[24px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-accent hover:text-foreground transition-all duration-200 cursor-pointer"
          title="Expand sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Secondary Sidebar (Context Menu) */}
      <aside
        className={cn(
          "z-10 h-full border-r border-border/60 bg-background transition-all duration-300 ease-in-out overflow-hidden",
          hasSecondary && !isCollapsed ? "w-60" : "w-0 border-r-0",
        )}
      >
        {hasSecondary && (
          <div className="flex h-full w-60 flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
              <h2 className="truncate px-2 text-[15px] font-semibold tracking-tight text-foreground">
                {activeCategory?.label}
              </h2>
              <button
                onClick={() => setIsCollapsed(true)}
                className="rounded-lg p-1.5 text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground transition-colors duration-200"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-4 h-px shrink-0 bg-border/50" />
            <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav className="space-y-1">
                {activeCategory?.children?.map((child, i) => (
                  <NavLink
                    key={i}
                    to={child.href || "#"}
                    end={child.end !== undefined ? child.end : child.href === "/"}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-200",
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
