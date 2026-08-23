import { Link, NavLink } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import type { NavItem } from "../navConfig";
import { NavBadge } from "./PrimaryRail";

interface SecondaryNavProps {
  activeCategory: NavItem | null;
  hasSecondary: boolean;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  badgeFor: (item: NavItem) => number;
}

export function SecondaryNav({
  activeCategory,
  hasSecondary,
  isCollapsed,
  setCollapsed,
  badgeFor,
}: SecondaryNavProps) {
  return (
    <aside
      className={cn(
        "z-10 h-full overflow-hidden bg-background/95",
        hasSecondary ? "transition-all duration-300 ease-in-out" : "transition-none",
        hasSecondary && !isCollapsed ? "w-60" : "w-0",
      )}
    >
      {hasSecondary && (
        <div className="flex h-full w-60 flex-col">
          {/* Header title aligns with item text below (24px inset). */}
          <div className="flex h-16 shrink-0 items-center justify-between pl-6 pr-3 border-b border-border/40">
            <h2 className="min-w-0 font-display text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeCategory?.children?.[0]?.href ? (
                <Link
                  to={activeCategory.children[0].href}
                  className="block truncate rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {activeCategory.label}
                </Link>
              ) : (
                <span className="block truncate">{activeCategory?.label}</span>
              )}
            </h2>
            <Tooltip content="Collapse sidebar" side="right">
              <button
                onClick={() => setCollapsed(true)}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 scrollbar-thin">
            <nav key={activeCategory?.label} className="space-y-px">
              <AnimatePresence mode="popLayout">
                {activeCategory?.children?.map((child, i, arr) => {
                  const showGroup = child.group && child.group !== arr[i - 1]?.group;
                  return (
                    <motion.div
                      key={child.href || child.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                    >
                      {showGroup && (
                        <p
                          className={cn(
                            "eyebrow px-2.5 pb-1 text-slate-500 dark:text-slate-400 font-bold tracking-wider",
                            i === 0 ? "pt-1" : "pt-4",
                          )}
                        >
                          {child.group}
                        </p>
                      )}
                      <NavLink
                        to={child.href || "#"}
                        end={child.end !== undefined ? child.end : child.href === "/"}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 font-semibold"
                              : "font-medium text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-primary dark:hover:text-white",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150 [&>svg]:h-4 [&>svg]:w-4",
                                isActive
                                  ? "text-primary dark:text-blue-300"
                                  : "text-slate-500 dark:text-slate-400 group-hover:text-primary",
                              )}
                            >
                              {child.icon}
                            </div>
                            <span className="truncate">{child.label}</span>
                            <NavBadge count={badgeFor(child)} className="ml-auto" />
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </nav>
          </div>
        </div>
      )}
    </aside>
  );
}
