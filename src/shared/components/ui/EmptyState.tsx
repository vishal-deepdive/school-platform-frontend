import { cn } from "@/shared/lib/utils";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /**
   * "card" (default) renders a dashed standalone card for page-level empties;
   * "plain" renders bare centered content for use inside an existing Card.
   */
  variant?: "card" | "plain";
}

/**
 * Placeholder block for "nothing here yet" states (no results, no data generated, etc.).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "card",
}: EmptyStateProps) {
  const content = (
    <>
      <div className="text-primary/45 dark:text-primary/60 animate-float">{icon}</div>
      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md">{description}</p>
        )}
      </div>
      {action}
    </>
  );

  if (variant === "plain") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-10 text-center",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-16 text-center",
        className,
      )}
    >
      {content}
    </Card>
  );
}
