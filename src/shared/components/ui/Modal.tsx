import { useEffect, useId } from "react";
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

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();

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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/15 dark:bg-slate-950/40 backdrop-blur-[1.5px] transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-h-[calc(100vh-2rem)] flex flex-col rounded-xl bg-background border border-border/50 shadow-2xl shadow-black/20",
          "animate-in fade-in zoom-in-95 duration-200",
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

