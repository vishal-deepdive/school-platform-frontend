import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { PrimaryRail } from "./PrimaryRail";
import { SecondaryNav } from "./SecondaryNav";
import { SIDEBAR_STORAGE_KEY } from "./useSidebarNav";
import type { NavItem } from "../navConfig";

interface DesktopSidebarProps {
  allItems: NavItem[];
  activeCategory: NavItem | null;
  activeIdx: number;
  isAdmin: boolean;
  isItemGated: (item: NavItem) => boolean;
  onCategoryClick: (item: NavItem) => void;
  badgeFor: (item: NavItem) => number;
  railBadgeFor: (item: NavItem) => number;
}

export function DesktopSidebar({
  allItems,
  activeCategory,
  activeIdx,
  isAdmin,
  isItemGated,
  onCategoryClick,
  badgeFor,
  railBadgeFor,
}: DesktopSidebarProps) {
  // Collapsed state survives reloads so the layout doesn't jump each session.
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1",
  );

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  };

  // Sync isCollapsed with clicks - handled partially in Sidebar wrapper but we export setCollapsed if needed
  // Actually onCategoryClick triggers setCollapsed(false) in the original, we should pass it or handle it here.
  // Wait, handleCategoryClick in the original did `setCollapsed(false)`.
  // Let's wrap onCategoryClick to expand the sidebar.
  const handleCategoryClick = (item: NavItem) => {
    setCollapsed(false);
    onCategoryClick(item);
  };

  const hasSecondary = !!(activeCategory?.children && activeCategory.children.length > 0);

  return (
    <div className="relative flex h-full bg-background">
      <PrimaryRail
        allItems={allItems}
        activeCategory={activeCategory}
        activeIdx={activeIdx}
        isAdmin={isAdmin}
        isItemGated={isItemGated}
        onCategoryClick={handleCategoryClick}
        railBadgeFor={railBadgeFor}
      />

      {/* Collapse/Expand Floating Button (rendered when collapsed and category has children) */}
      {isCollapsed && hasSecondary && (
        <Tooltip content="Expand sidebar" side="right">
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-28 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-background text-slate-500 dark:text-slate-400 shadow-sm transition-transform duration-300 hover:scale-110 hover:bg-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 hover:translate-x-0.5" />
          </button>
        </Tooltip>
      )}

      <SecondaryNav
        activeCategory={activeCategory}
        hasSecondary={hasSecondary}
        isCollapsed={isCollapsed}
        setCollapsed={setCollapsed}
        badgeFor={badgeFor}
      />
    </div>
  );
}
