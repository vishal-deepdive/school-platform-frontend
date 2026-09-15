import { useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Destructive actions render last, in red, below a divider. */
  danger?: boolean;
  disabled?: boolean;
  /** Leave the item out without array-spread gymnastics at the call site. */
  hidden?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible name for the trigger, e.g. "Actions for Priya Sharma". */
  label: string;
  /** Render a labelled outline button ("More ▾") instead of the ⋯ icon. */
  buttonLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
}

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

/**
 * Overflow menu for secondary actions: a row keeps its one primary action
 * visible and tucks the rest in here, destructive ones last. Arrow keys and
 * Home/End move between items; Esc or clicking away closes it.
 */
export function ActionMenu({
  items,
  label,
  buttonLabel,
  align = "end",
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Set when an item is chosen, so closing doesn't pull focus back to the
  // trigger and away from a dialog the action just opened.
  const chosen = useRef(false);

  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;
  const regular = visible.filter((item) => !item.danger);
  const danger = visible.filter((item) => item.danger);

  const moveFocus = (e: React.KeyboardEvent) => {
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR) ?? []);
    if (nodes.length === 0) return;
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (e.key) {
      case "ArrowDown":
        next = current < 0 ? 0 : (current + 1) % nodes.length;
        break;
      case "ArrowUp":
        next = current < 0 ? nodes.length - 1 : (current - 1 + nodes.length) % nodes.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = nodes.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    nodes[next].focus();
  };

  const choose = (item: ActionMenuItem) => {
    chosen.current = true;
    // Park focus on the trigger first: a dialog opened by the action then
    // hands focus back here when it closes.
    triggerRef.current?.focus();
    setOpen(false);
    item.onSelect();
  };

  const renderItem = (item: ActionMenuItem) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => choose(item)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        item.danger
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "text-foreground hover:bg-accent focus-visible:bg-accent",
      )}
    >
      {item.icon && (
        <span className={cn("flex", !item.danger && "text-muted-foreground")}>{item.icon}</span>
      )}
      <span className="truncate">{item.label}</span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {buttonLabel ? (
          <Button
            ref={triggerRef}
            variant="outline"
            size="sm"
            aria-label={label}
            className={cn("data-[state=open]:bg-accent", className)}
          >
            {buttonLabel}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        ) : (
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
              className,
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-52 p-1"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          listRef.current?.querySelector<HTMLButtonElement>(ITEM_SELECTOR)?.focus();
        }}
        onCloseAutoFocus={(e) => {
          if (chosen.current) {
            e.preventDefault();
            chosen.current = false;
          }
        }}
      >
        <div ref={listRef} role="menu" aria-label={label} onKeyDown={moveFocus}>
          {regular.map(renderItem)}
          {regular.length > 0 && danger.length > 0 && (
            <div role="separator" className="my-1 h-px bg-border/70" />
          )}
          {danger.map(renderItem)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
