import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/lib/toast";
import { usePendingLeaveCount } from "@/features/attendance/hooks/usePendingLeaveCount";
import { useSidebarNav } from "./useSidebarNav";
import { MobileSidebar } from "./MobileSidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import type { NavItem } from "../navConfig";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const {
    allItems,
    activeCategory,
    setActiveCategory,
    isItemGated,
    isAdmin,
    activeIdx,
  } = useSidebarNav();

  const pendingLeaves = usePendingLeaveCount();

  const badgeFor = (item: NavItem): number =>
    item.badgeKey === "pending-leaves" ? pendingLeaves : 0;

  const railBadgeFor = (item: NavItem): number =>
    (item.children ?? []).reduce((sum, c) => sum + badgeFor(c), badgeFor(item));

  const handleCategoryClick = (item: NavItem) => {
    if (isItemGated(item)) {
      toast.warning("Please select a school first to access this module.");
      return;
    }

    const wasActive = activeCategory === item;
    setActiveCategory(item);

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

  if (mobile) {
    return (
      <MobileSidebar
        allItems={allItems}
        pendingLeaves={pendingLeaves}
        onClose={onClose}
      />
    );
  }

  return (
    <DesktopSidebar
      allItems={allItems}
      activeCategory={activeCategory}
      activeIdx={activeIdx}
      isAdmin={isAdmin}
      isItemGated={isItemGated}
      onCategoryClick={handleCategoryClick}
      badgeFor={badgeFor}
      railBadgeFor={railBadgeFor}
    />
  );
}
