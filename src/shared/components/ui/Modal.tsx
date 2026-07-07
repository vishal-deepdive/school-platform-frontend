import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "./Tooltip";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional one-line subtitle shown under the title. */
  description?: React.ReactNode;
  /** Optional glyph rendered in a tinted badge beside the title. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Action row pinned to the bottom of the dialog, outside the scroll area, so
   * the primary button stays reachable no matter how long the body gets.
   * Falls back to the legacy in-body `<ModalFooter>` when omitted.
   */
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Set false to keep the dialog open when the backdrop is clicked. */
  closeOnBackdrop?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  "3xl": "max-w-5xl",
  full: "max-w-[min(72rem,calc(100vw-2rem))]",
};

/** Matches the exit animation duration below. */
const EXIT_MS = 150;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** First real editable control — used to place initial focus without landing on the close button. */
const FIELD =
  "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable=true]";

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

/** Tiny inline keycap for the footer shortcut legend. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[10px] font-semibold text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Kept mounted briefly after `open` flips false so the exit animation plays.
  const [isMounted, setIsMounted] = useState(open);
  // Whether the body holds a <form> — gates the ⌘↵ hint and submit shortcut.
  const [hasForm, setHasForm] = useState(false);
  // Scroll cues: subtle shadows on the header/footer when content is clipped.
  const [shadow, setShadow] = useState({ top: false, bottom: false });

  useEffect(() => {
    if (open) {
      setIsMounted(true);
    } else {
      const t = setTimeout(() => setIsMounted(false), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes; ⌘/Ctrl+Enter submits the form (matches GitHub/Slack).
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // let nested widgets (Select, DatePicker) win
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const form = panelRef.current?.querySelector("form");
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
      }
    };
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
    // Prefer an opt-in target, then the first editable field, then the panel —
    // never the close button, and never a stray link inside rendered content.
    const target =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(FIELD) ??
      panel;
    target?.focus?.({ preventScroll: true });
    setHasForm(!!panel?.querySelector("form"));
    return () => previouslyFocused?.focus?.();
  }, [open]);

  const updateShadows = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 1;
    setShadow((s) =>
      s.top === top && s.bottom === bottom ? s : { top, bottom },
    );
  }, []);

  // Recompute scroll cues on open, on content resize, and on scroll.
  useEffect(() => {
    if (!open) return;
    updateShadows();
    const content = contentRef.current;
    const el = bodyRef.current;
    if (!content || !el) return;
    const ro = new ResizeObserver(updateShadows);
    ro.observe(content);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, updateShadows]);

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

  if (!open && !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/30 dark:bg-slate-950/70 backdrop-blur-sm",
          open
            ? "animate-in fade-in duration-200"
            : "animate-out fade-out duration-150 fill-mode-forwards",
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          "relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground",
          "border border-border/60 ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
          "shadow-[0_24px_64px_-16px_rgba(2,6,23,0.45),0_8px_24px_-14px_rgba(2,6,23,0.30)]",
          "focus:outline-none",
          open
            ? "animate-in fade-in zoom-in-95 duration-200"
            : "animate-out fade-out zoom-out-95 duration-150 fill-mode-forwards",
          sizeClasses[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div
          className={cn(
            "relative z-10 flex shrink-0 items-start justify-between gap-4 border-b border-border/60 px-5 py-4 transition-shadow duration-200 sm:px-6",
            shadow.top && "shadow-[0_10px_20px_-18px_rgba(2,6,23,0.9)]",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h3
                id={titleId}
                className="truncate text-[15px] font-semibold tracking-tight text-foreground sm:text-base"
              >
                {title}
              </h3>
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          <Tooltip content="Close" side="left" shortcut="Esc">
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        <div
          ref={bodyRef}
          onScroll={updateShadows}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-custom"
        >
          <div ref={contentRef} className="p-4 text-foreground sm:p-6">
            {children}
          </div>
        </div>

        {footer && (
          <div
            className={cn(
              "relative z-10 flex shrink-0 items-center justify-end gap-3 border-t border-border/60 px-5 py-3.5 transition-shadow duration-200 sm:justify-between sm:px-6",
              shadow.bottom && "shadow-[0_-10px_20px_-18px_rgba(2,6,23,0.9)]",
            )}
          >
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>Esc</Kbd> Close
              </span>
              {hasForm && (
                <span className="inline-flex items-center gap-1.5">
                  <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd>↵</Kbd> Save
                </span>
              )}
            </div>
            <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Standard dialog action row: right-aligned, cancel before the primary action.
 * Renders inside the Modal body, pulled flush to its bottom edge. Prefer the
 * Modal `footer` prop for long/scrolling dialogs so the actions stay pinned.
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
