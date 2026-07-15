import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { roleCanAccess, needsActiveSchool } from "@/shared/lib/permissions";
import { useAuthStore } from "@/features/auth/store/auth";
import type { UserRole } from "@/features/auth/types";
import { navItems, adminNavItems, type NavItem } from "../navConfig";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";

export const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

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

export function useSidebarNav() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const { ready } = useActiveSchool();

  const allItems = useMemo(() => {
    const base = [...navItems, ...(isAdmin ? adminNavItems : [])];
    return filterNavByRole(base, user?.role).filter((item) => !item.hidden);
  }, [user?.role, isAdmin]);

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);

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

  const isItemGated = (item: NavItem) => {
    const targetHref = item.href || (item.children && item.children[0]?.href);
    return isAdmin && !ready && needsActiveSchool(targetHref);
  };

  const activeIdx = activeCategory ? allItems.indexOf(activeCategory) : -1;

  return {
    allItems,
    activeCategory,
    setActiveCategory,
    isItemGated,
    isAdmin,
    activeIdx,
  };
}
