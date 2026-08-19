import { cn } from "@/shared/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

type AlertVariant = "error" | "success" | "warning" | "info" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

const config: Record<
  AlertVariant,
  { icon: React.ElementType; classes: string }
> = {
  error: {
    icon: AlertCircle,
    classes: "bg-rose-500/12 border-rose-500/25 text-rose-800 dark:text-rose-300 shadow-2xs",
  },
  danger: {
    icon: AlertCircle,
    classes: "bg-rose-500/12 border-rose-500/25 text-rose-800 dark:text-rose-300 shadow-2xs",
  }, // Alias for error
  success: {
    icon: CheckCircle2,
    classes:
      "bg-emerald-500/12 border-emerald-500/25 text-emerald-800 dark:text-emerald-300 shadow-2xs",
  },
  warning: {
    icon: AlertTriangle,
    classes:
      "bg-amber-500/12 border-amber-500/25 text-amber-800 dark:text-amber-300 shadow-2xs",
  },
  info: {
    icon: Info,
    classes:
      "bg-blue-500/12 border-blue-500/25 text-blue-800 dark:text-blue-300 shadow-2xs",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onClose,
}: AlertProps) {
  const { icon: Icon, classes } = config[variant] || config.info;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 backdrop-blur-sm",
        classes,
        className,
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-1 tracking-tight">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
