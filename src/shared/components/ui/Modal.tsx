import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/** Matches the exit animation duration below. */
const EXIT_MS = 150;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Kept mounted briefly after `open` flips false so the exit animation plays.
  const [exiting, setExiting] = useState(false);
  const prevOpen = useRef(open);

  useEffect(() => {
    if (prevOpen.current && !open) {
      setExiting(true);
      const t = setTimeout(() => setExiting(false), EXIT_MS);
      prevOpen.current = open;
      return () => clearTimeout(t);
    }
    prevOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Move focus into the dialog on open; return it to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  // Keep Tab / Shift+Tab cycling inside the dialog.
  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open && !exiting) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/15 dark:bg-slate-950/40 backdrop-blur-[1.5px]",
          open
            ? "animate-in fade-in duration-200"
            : "animate-out fade-out duration-150",
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          "relative z-10 w-full max-h-[calc(100vh-2rem)] flex flex-col rounded-xl bg-background border border-border/50 shadow-2xl shadow-black/20 focus:outline-none",
          open
            ? "animate-in fade-in zoom-in-95 duration-200"
            : "animate-out fade-out zoom-out-95 duration-150 fill-mode-forwards",
          sizeClasses[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0 sm:px-6 sm:py-4">
          <h3
            id={titleId}
            className="text-base font-semibold text-foreground tracking-tight"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 text-foreground overflow-y-auto min-h-0 flex-1 scrollbar-custom sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Standard dialog action row: right-aligned, cancel before the primary action.
 * Renders inside the Modal body, pulled flush to its bottom edge.
 */
export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center justify-end gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
