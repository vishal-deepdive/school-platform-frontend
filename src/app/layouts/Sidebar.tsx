import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { navItems, adminNavItems, type NavItem } from "./navConfig";
import { UserProfileMenu } from "./UserProfileMenu";
import { MobileSidebarItem } from "./MobileSidebarItem";

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
    return [...navItems, ...(isAdmin ? adminNavItems : [])];
  }, [isAdmin]);

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);

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
      <aside className="flex h-full w-[280px] flex-col bg-background shadow-2xl animate-slide-in relative">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
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
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {allItems.map((item, i) => (
            <div key={i}>
              <MobileSidebarItem item={item} onClose={onClose} />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-border p-4">
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
    <div className="flex h-full">
      {/* Primary Sidebar (Icons only) */}
      <aside className="relative z-20 flex h-full w-16 flex-col items-center border-r border-border bg-background py-4 shadow-sm">
        {/* Logo */}
        <div className="mb-8 flex h-10 w-8 shrink-0 items-center justify-center">
          <img
            src="/favicon.png"
            alt="DeepDive Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Primary Nav Items */}
        <nav className="flex w-full flex-1 flex-col items-center gap-3 px-1 pb-4 overflow-visible">
          {allItems.map((item, idx) => {
            const isActive = activeCategory === item;
            return (
              <div key={idx} className="group relative w-full">
                <button
                  onClick={() => handleCategoryClick(item)}
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl p-3 transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
                {/* Tooltip */}
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
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

      {/* Secondary Sidebar (Context Menu) */}
      <aside
        className={cn(
          "z-10 h-full border-r border-border bg-muted/40 transition-all duration-300 ease-in-out overflow-hidden",
          hasSecondary ? "w-60" : "w-0 border-r-0",
        )}
      >
        {hasSecondary && (
          <div className="flex h-full w-60 flex-col">
            <div className="flex h-[72px] shrink-0 items-center px-5">
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                {activeCategory?.label}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav className="space-y-1">
                {activeCategory?.children?.map((child, i) => (
                  <NavLink
                    key={i}
                    to={child.href || "#"}
                    end={child.href === "/"}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
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
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          {child.icon}
                        </div>
                        {child.label}
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
