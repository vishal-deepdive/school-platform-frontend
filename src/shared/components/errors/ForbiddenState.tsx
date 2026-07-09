import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/EmptyState";

interface ForbiddenStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  variant?: "card" | "plain";
}

/**
 * Shared 403 / access-denied surface. Render this anywhere an API answers 403
 * (a page or section the user's role or data grant can't reach) so the
 * "no access" experience is consistent instead of a generic error toast. Pair
 * with `isForbiddenError()` from shared/lib/utils to detect the status.
 */
export function ForbiddenState({
  title = "You don't have access",
  description = "Your account doesn't have permission to view this. Ask an admin if you think this is a mistake.",
  action,
  variant = "card",
}: ForbiddenStateProps) {
  return (
    <EmptyState
      icon={<Lock className="h-12 w-12" />}
      title={title}
      description={description}
      action={action}
      variant={variant}
    />
  );
}
