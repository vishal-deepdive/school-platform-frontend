import type { ReactNode } from "react";
import { useCan } from "@/shared/hooks/useCan";

interface CanProps {
  /** ROUTE_ROLES path the current role must be allowed to access. */
  path: string;
  children: ReactNode;
  /** Rendered instead of `children` when access is denied (default: nothing). */
  fallback?: ReactNode;
}

/**
 * Declarative role gate for UI fragments, e.g.
 * `<Can path="/rag/documents"><UploadButton /></Can>`. Reads the same
 * ROUTE_ROLES map as the route guard, so a hidden action can never point at a
 * route the user is bounced from.
 */
export function Can({ path, children, fallback = null }: CanProps) {
  return <>{useCan(path) ? children : fallback}</>;
}
