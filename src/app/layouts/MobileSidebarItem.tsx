import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { NavItem } from "./navConfig";

interface MobileSidebarItemProps {
  item: NavItem;
  onClose?: () => void;
}

export function MobileSidebarItem({ item, onClose }: MobileSidebarItemProps) {
  const location = useLocation();
  const isChildActive = item.children?.some(
    (c) => c.href && location.pathname.startsWith(c.href),
  );
  const [open, setOpen] = useState(isChildActive ?? false);

  if (item.href && !item.children) {
    return (
      <NavLink
        to={item.href}
        end={item.end !== undefined ? item.end : item.href === "/"}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )
        }
      >
        {item.icon}
        {item.label}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isChildActive
            ? "text-primary bg-primary/5"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-0.5 border-l-2 border-border/70 ml-[22px] pl-3 animate-fade-in">
          {item.children?.map((child, i) => (
            <NavLink
              key={i}
              to={child.href || "#"}
              onClick={onClose}
              end={child.end !== undefined ? child.end : child.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <div className="scale-90">{child.icon}</div>
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
