import { useRef, useLayoutEffect, useState } from "react";
import { Search, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import type { NavItem } from "../navConfig";
import { UserProfileMenu } from "../UserProfileMenu";

export function NavBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary to-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-xs ring-1 ring-background",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

interface PrimaryRailProps {
  allItems: NavItem[];
  activeCategory: NavItem | null;
  activeIdx: number;
  isAdmin: boolean;
  isItemGated: (item: NavItem) => boolean;
  onCategoryClick: (item: NavItem) => void;
  railBadgeFor: (item: NavItem) => number;
}

export function PrimaryRail({
  allItems,
  activeCategory,
  activeIdx,
  isAdmin,
  isItemGated,
  onCategoryClick,
  railBadgeFor,
}: PrimaryRailProps) {
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = itemRefs.current.get(activeIdx);
    setIndicator(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
  }, [activeIdx, allItems]);

  const isFirstAdminItem = (item: NavItem, idx: number) => {
    return isAdmin && item.label === "Platform Admin" && (idx === 0 || allItems[idx - 1].label !== "Platform Admin");
  };

  return (
    <aside className="relative z-20 flex h-full w-[4.5rem] flex-col items-center bg-rail py-4">
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
        <Tooltip content="Search" shortcut="Ctrl K" side="right" delayDuration={400}>
          <button
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="flex w-full flex-col items-center gap-1 rounded-lg border border-white/15 bg-white/10 py-2 text-blue-100/85 shadow-xs transition-all duration-200 hover:border-white/30 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search pages and actions"
          >
            <Search className="h-4 w-4" />
            <span className="text-[9px] font-semibold leading-none">Search</span>
          </button>
        </Tooltip>
      </div>

      <div className="my-3.5 h-px w-8 shrink-0 bg-white/15" aria-hidden="true" />

      {/* Primary Nav Items */}
      <nav className="relative flex w-full flex-1 flex-col items-center gap-1.5 overflow-visible px-2 pb-4">
        {indicator && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 motion-reduce:transition-none"
            initial={false}
            animate={{
              y: indicator.top,
              height: indicator.height,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
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
          </motion.div>
        )}
        {allItems.map((item, idx) => {
          const isActive = activeCategory === item;
          const gated = isItemGated(item);
          const firstAdmin = isFirstAdminItem(item, idx);
          
          return (
            <div key={idx} className="w-full">
              {firstAdmin && (
                <div
                  className="mx-auto mb-1.5 h-px w-8 bg-white/15"
                  aria-hidden="true"
                />
              )}
              <div
                ref={(el) => {
                  if (el) itemRefs.current.set(idx, el);
                  else itemRefs.current.delete(idx);
                }}
                className={cn("relative w-full", isActive && "z-10")}
              >
                <Tooltip
                  content={gated ? `${item.label} — select a school first` : item.label}
                  side="right"
                  delayDuration={400}
                >
                  <motion.button
                    whileTap={gated ? undefined : { scale: 0.94 }}
                    onClick={() => onCategoryClick(item)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "w-[calc(100%+0.5rem)] rounded-l-lg text-primary font-bold"
                        : "w-full rounded-lg text-blue-100/75 hover:bg-white/12 hover:text-white",
                      gated && "opacity-40",
                    )}
                    aria-label={item.label}
                    aria-disabled={gated || undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="relative flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                      {item.icon}
                      {gated && (
                        <Lock
                          className="absolute -right-2 -top-1 h-3 w-3 text-blue-200/60 drop-shadow-sm"
                          aria-hidden="true"
                        />
                      )}
                      {!gated && railBadgeFor(item) > 0 && (
                        <span className="absolute -right-2.5 -top-2">
                          <NavBadge count={railBadgeFor(item)} />
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate px-0.5 text-[9px] font-semibold leading-none">
                      {item.railLabel ?? item.label}
                    </span>
                  </motion.button>
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
  );
}
