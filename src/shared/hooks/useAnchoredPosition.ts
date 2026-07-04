import { useLayoutEffect, useState, type RefObject } from "react";

export interface AnchoredPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
}

/**
 * Computes fixed-viewport coordinates for a dropdown menu anchored to a trigger
 * element. Rendered through a portal, the menu escapes any `overflow-hidden`
 * ancestor (cards, panels) instead of being clipped inside them. Flips above the
 * trigger when there isn't enough room below, and tracks scroll/resize so it
 * stays glued to the trigger.
 */
export function useAnchoredPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  { gap = 4, desiredMaxHeight = 288 }: { gap?: number; desiredMaxHeight?: number } = {},
): AnchoredPosition | null {
  const [pos, setPos] = useState<AnchoredPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;

    const compute = () => {
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - gap;
      const spaceAbove = r.top - gap;
      // Prefer opening downward; flip up only when clearly more room exists above.
      const placement: "bottom" | "top" =
        spaceBelow < Math.min(desiredMaxHeight, 200) && spaceAbove > spaceBelow
          ? "top"
          : "bottom";
      const available = placement === "bottom" ? spaceBelow : spaceAbove;
      setPos({
        left: r.left,
        width: r.width,
        top: placement === "bottom" ? r.bottom + gap : r.top - gap,
        maxHeight: Math.max(140, Math.min(desiredMaxHeight, available)),
        placement,
      });
    };

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, triggerRef, gap, desiredMaxHeight]);

  return pos;
}
