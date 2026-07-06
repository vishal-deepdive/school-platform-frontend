import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";

/**
 * Guards the operational modules (attendance, recording, study assistant,
 * feedback insights, roster import) so they never render in a broken "no school
 * chosen" state for an admin. Admins pick their school in one place only — the
 * Dashboard's top-right switcher — so an admin who lands on a module without a
 * selection is redirected there to choose. Non-admins are always scoped to their
 * own school and pass straight through; the choice persists across reloads, so
 * this redirect only ever fires on a brand-new session.
 */
export function SchoolGate({ children }: { children: ReactNode }) {
  const { isAdmin, ready } = useActiveSchool();

  if (isAdmin && !ready) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
