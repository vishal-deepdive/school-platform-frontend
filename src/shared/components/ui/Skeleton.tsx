import { cn } from "@/shared/lib/utils";

/** Shimmering placeholder block shown while content loads. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
    />
  );
}
