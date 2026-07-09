import { ROUTE_ROLES } from "@/shared/lib/permissions";
import { navItems, adminNavItems, type NavItem } from "@/app/layouts/navConfig";

/**
 * Paths that live in ROUTE_ROLES but intentionally have no visible nav entry
 * (reached by redirect or deep link only). Keep this list tiny and explicit so
 * a genuinely-orphaned route still trips the audit.
 */
const NAV_EXEMPT = new Set<string>([]);

function collectHrefs(items: NavItem[], acc: Set<string>): void {
  for (const item of items) {
    if (item.href) acc.add(item.href);
    if (item.children) collectHrefs(item.children, acc);
  }
}

export interface NavAuditResult {
  /** Nav links pointing at a path with no ROUTE_ROLES entry (they default-deny). */
  unguardedNavHrefs: string[];
  /** ROUTE_ROLES paths with no nav entry and not explicitly exempt (orphans). */
  orphanRoutes: string[];
}

/**
 * Pure parity check between the sidebar nav tree and the RBAC route map. Both
 * must stay in lock-step: a nav link with no ROUTE_ROLES entry silently
 * default-denies, and a role-mapped route with no nav entry is unreachable from
 * the UI (the class of bug that hid /approvals/parents).
 */
export function auditNavPermissions(): NavAuditResult {
  const navHrefs = new Set<string>();
  collectHrefs([...navItems, ...adminNavItems], navHrefs);

  const unguardedNavHrefs = [...navHrefs].filter((h) => !(h in ROUTE_ROLES));
  const orphanRoutes = Object.keys(ROUTE_ROLES).filter(
    (p) => !navHrefs.has(p) && !NAV_EXEMPT.has(p),
  );
  return { unguardedNavHrefs, orphanRoutes };
}

/**
 * Dev-only guard: logs an error if the nav and ROUTE_ROLES have drifted. Runs in
 * development so regressions surface immediately instead of shipping silently.
 * No-op in production. Exported pure `auditNavPermissions` above can back a unit
 * test once a test runner is added.
 */
export function assertNavPermissionParity(): void {
  if (!import.meta.env.DEV) return;
  const { unguardedNavHrefs, orphanRoutes } = auditNavPermissions();
  if (unguardedNavHrefs.length) {
    console.error(
      "[nav-audit] Nav links with no ROUTE_ROLES entry (they will default-deny):",
      unguardedNavHrefs,
    );
  }
  if (orphanRoutes.length) {
    console.error(
      "[nav-audit] Role-mapped routes with no nav entry (unreachable from the UI):",
      orphanRoutes,
    );
  }
}
