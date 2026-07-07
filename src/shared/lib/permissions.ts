import type { UserRole } from "@/features/auth/types";

/**
 * Canonical route → allowed-roles map.
 *
 * This is the SINGLE source of truth for per-persona access in the SPA. Both the
 * sidebar (nav visibility) and the route guard (RoleRoute) read from here so they
 * can never drift apart. It mirrors the backend RoleGate / scope-guard model:
 *   admin > principal > teacher > student > parent
 *
 * Write/authoring surfaces (enroll, mark, upload, manage documents, generate exam
 * questions, data management, audits) are teacher/principal/admin. Read/consume
 * surfaces (own attendance, study notes, Q&A) extend to students and — for their
 * linked child — parents.
 */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "principal", "teacher", "student", "parent", "viewer"],
  "/profile":   ["admin", "principal", "teacher", "student", "parent", "viewer"],

  // Attendance
  "/attendance/dashboard": ["admin", "principal", "teacher"],
  "/attendance/enroll": ["admin", "principal", "teacher"],
  "/attendance/roll-call": ["admin", "principal", "teacher"],
  "/attendance/mark": ["admin", "principal", "teacher"],
  "/attendance/view": ["admin", "principal", "teacher", "student", "parent"],
  "/attendance/leave": ["admin", "principal", "teacher", "student", "parent"],
  "/attendance/holidays": ["admin", "principal"],
  "/attendance/manage": ["admin", "principal"],
  "/attendance/stats": ["admin", "principal", "teacher"],

  // Recording
  "/recording/upload": ["admin", "principal", "teacher"],
  "/recording/list": ["admin", "principal", "teacher", "student", "parent"],
  "/recording/search": ["admin", "principal", "teacher", "student"],
  "/recording/audit": ["admin", "principal"],

  // RAG Assistant
  "/rag/qa": ["admin", "principal", "teacher", "student"],
  "/rag/questions": ["admin", "principal", "teacher"],
  "/rag/notes": ["admin", "principal", "teacher", "student"],
  "/rag/documents": ["admin", "principal", "teacher"],
  "/rag/audit": ["admin", "principal"],

  // Survey Analytics (sensitive student wellbeing data — staff only)
  "/survey": ["admin", "principal", "teacher"],
  "/survey/search": ["admin", "principal", "teacher"],
  "/survey/data": ["admin", "principal"],
  "/survey/source": ["admin", "principal"],

  // Roster management
  "/students/import": ["admin", "principal"],

  // Parent account approvals (principal/admin)
  "/approvals/parents": ["admin", "principal"],

  // Platform admin
  "/admin/onboarding": ["admin"],
  "/admin/schools": ["admin"],
  "/admin/users": ["admin"],
  "/admin/audit-log": ["admin"],
  "/admin/admins": ["admin"],
  "/admin/prompts": ["admin"],
};

/**
 * True if `role` may access `path`. Uses a default-deny stance: paths not listed
 * in ROUTE_ROLES are blocked for everyone. Add the path to ROUTE_ROLES to expose
 * it. An absent role is always denied.
 */
export function roleCanAccess(path: string, role?: UserRole | null): boolean {
  if (!role) return false;
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return false;  // default deny — add to ROUTE_ROLES to expose
  return allowed.includes(role);
}

export const STAFF_ROLES: UserRole[] = ["admin", "principal", "teacher"];

export function isStaff(role?: UserRole | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function canManageRecordings(role?: UserRole | null): boolean {
  return role === "admin" || role === "principal";
}

export function canUploadRecordings(role?: UserRole | null): boolean {
  return role === "admin" || role === "principal" || role === "teacher";
}
