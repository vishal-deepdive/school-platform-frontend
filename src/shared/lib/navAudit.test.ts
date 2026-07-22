import { describe, expect, it } from "vitest";
import { auditNavPermissions } from "./navAudit";

describe("nav / RBAC parity", () => {
  it("has no nav links pointing at a path missing from ROUTE_ROLES", () => {
    const { unguardedNavHrefs } = auditNavPermissions();
    expect(unguardedNavHrefs).toEqual([]);
  });

  it("has no ROUTE_ROLES entry that isn't reachable from the nav", () => {
    const { orphanRoutes } = auditNavPermissions();
    expect(orphanRoutes).toEqual([]);
  });
});
