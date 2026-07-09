import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router";
import { initAuthRefresh, cancelProactiveRefresh } from "@/shared/api/client";
import { assertNavPermissionParity } from "@/shared/lib/navAudit";

export default function App() {
  // Kick off proactive token refresh from the persisted session (page load /
  // new tab). Keeps the access token renewed in the background so users are not
  // logged out mid-session. Subsequent rescheduling is driven by the auth store
  // subscription inside the api client.
  useEffect(() => {
    initAuthRefresh();
    // Dev-only: fail loudly if the sidebar nav and the RBAC route map drift
    // (an unguarded link or an orphaned, unreachable route). No-op in prod.
    assertNavPermissionParity();
    return cancelProactiveRefresh;
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
