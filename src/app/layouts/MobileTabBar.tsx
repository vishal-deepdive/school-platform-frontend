import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { roleCanAccess } from "@/shared/lib/permissions";
import { navItems, type NavItem } from "./navConfig";

interface MobileTabBarProps {
  /** Opens the full navigation drawer. */
  onMenuOpen: () => void;
}

/** First reachable href for a module (its own, or its first visible child). */
function firstHref(item: NavItem, role?: string | null): string | undefined {
  if (item.href) return item.href;
  return item.children?.find((c) => c.href && roleCanAccess(c.href, role as never))
    ?.href;
}

/**
 * Phone-only bottom navigation: the four modules a user reaches most, plus a
 * "More" button opening the full drawer. Mirrors the desktop rail's top items
 * so muscle memory carries between form factors. Hidden on md+ where the rail
 * takes over.
 */
export function MobileTabBar({ onMenuOpen }: MobileTabBarProps) {
  const role = useAuthStore((s) => s.user?.role);

  const tabs = useMemo(() => {
    return navItems
      .filter((item) => !item.hidden)
      .map((item) => ({ item, href: firstHref(item, role) }))
      .filter((t): t is { item: NavItem; href: string } => {
        return !!t.href && roleCanAccess(t.href, role);
      })
      .slice(0, 4);
  }, [role]);

  if (tabs.length === 0) return null;

  return (
    <nav
      className="z-30 flex h-16 shrink-0 items-stretch border-t border-border/60 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {tabs.map(({ item, href }) => (
        <NavLink
          key={item.label}
          to={href}
          end={href === "/dashboard"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
          <span className="max-w-full truncate px-1">
            {item.railLabel ?? item.label}
          </span>
        </NavLink>
      ))}
      <button
        onClick={onMenuOpen}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Open full menu"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
