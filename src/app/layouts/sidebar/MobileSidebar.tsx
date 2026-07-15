import { X } from "lucide-react";
import { UserProfileMenu } from "../UserProfileMenu";
import { MobileSidebarItem } from "../MobileSidebarItem";
import type { NavItem } from "../navConfig";

interface MobileSidebarProps {
  allItems: NavItem[];
  pendingLeaves: number;
  onClose?: () => void;
}

export function MobileSidebar({ allItems, pendingLeaves, onClose }: MobileSidebarProps) {
  return (
    <aside className="relative flex h-full w-[286px] max-w-[85vw] flex-col border-r border-slate-200 dark:border-slate-800 bg-background shadow-2xl animate-slide-in">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DeepDive Logo"
            className="h-10 w-36 object-contain"
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
            <MobileSidebarItem
              item={item}
              onClose={onClose}
              badges={{ "pending-leaves": pendingLeaves }}
            />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-muted/20 p-3">
        <UserProfileMenu mobile />
      </div>
    </aside>
  );
}
