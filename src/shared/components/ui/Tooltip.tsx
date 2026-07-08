import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/shared/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  shortcut?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Wraps any interactive element with an accessible, animated tooltip.
 * Renders in a portal so z-index and overflow:hidden never clip it.
 *
 * Usage:
 *   <Tooltip content="Delete record" side="left">
 *     <button aria-label="Delete record"><Trash2 /></button>
 *   </Tooltip>
 */
export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration,
  shortcut,
  className,
  disabled = false,
}: TooltipProps) {
  if (!content || disabled) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-[100] flex items-center gap-2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg",
            // Enter
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
            // Exit
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            // Slide-in direction
            "data-[side=top]:slide-in-from-bottom-1",
            "data-[side=bottom]:slide-in-from-top-1",
            "data-[side=left]:slide-in-from-right-1",
            "data-[side=right]:slide-in-from-left-1",
            className,
          )}
        >
          {content}
          {shortcut && (
            <kbd className="rounded bg-background/20 px-1 py-0.5 font-sans text-[10px] font-semibold">
              {shortcut}
            </kbd>
          )}
          <TooltipPrimitive.Arrow className="fill-foreground" width={8} height={4} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
