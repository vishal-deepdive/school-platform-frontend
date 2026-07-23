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
 * surfaces extend to students (own attendance, study notes, Q&A, browsing the
 * textbook library) and to parents for their linked child (attendance records +
 * leave, class recordings, lecture-notes search). Note the Study Assistant
 * (/rag/*) is students-only on the consume side — parents do not get RAG access.
 */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "principal", "teacher", "student", "parent"],
  "/profile":   ["admin", "principal", "teacher", "student", "parent"],

  // Attendance
  "/attendance/dashboard": ["admin", "principal", "teacher"],
  "/attendance/enroll": ["admin", "principal", "teacher"],
  "/attendance/roll-call": ["admin", "principal", "teacher"],
  "/attendance/mark": ["admin", "principal", "teacher"],
  "/attendance/view": ["admin", "principal", "teacher", "student", "parent"],
  "/attendance/leave": ["admin", "principal", "teacher", "student", "parent"],
  "/attendance/holidays": ["admin", "principal", "teacher", "student", "parent"],
  "/attendance/manage": ["admin", "principal", "teacher"],
  "/attendance/stats": ["admin", "principal", "teacher"],
  "/attendance/audit-log": ["admin", "principal"],

  // Recording
  "/recording/upload": ["admin", "principal", "teacher"],
  "/recording/list": ["admin", "principal", "teacher", "student", "parent"],
  "/recording/search": ["admin", "principal", "teacher", "student", "parent"],
  "/recording/audit": ["admin", "principal"],

  // RAG Assistant
  "/rag/qa": ["admin", "principal", "teacher", "student"],
  "/rag/practice": ["admin", "principal", "teacher", "student"],
  "/rag/flashcards": ["admin", "principal", "teacher", "student"],
  "/rag/questions": ["admin", "principal", "teacher"],
  "/rag/assignments": ["admin", "principal", "teacher"],
  "/rag/notes": ["admin", "principal", "teacher", "student"],
  "/rag/lesson-plan": ["admin", "principal", "teacher"],
  "/rag/documents": ["admin", "principal", "teacher", "student"],
  "/rag/insights": ["admin", "principal", "teacher"],
  "/rag/requests": ["admin", "principal", "teacher"],
  "/rag/review": ["admin", "principal"],
  "/rag/audit": ["admin", "principal"],

  // Survey Analytics (sensitive student wellbeing data — staff only)
  "/survey": ["admin", "principal", "teacher"],
  "/survey/search": ["admin", "principal", "teacher"],
  "/survey/data": ["admin", "principal"],
  "/survey/source": ["admin", "principal", "teacher"],

  // Roster management
  "/students/import": ["admin", "principal"],

  // Principal own-school management cockpit (principal only; admins use /admin/schools).
  // Staff (team + invites) and Parent Approvals are tabs inside this cockpit, not
  // separate routes.
  "/school": ["principal"],

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

/**
 * Modules that operate on a school's data. An admin must pick an active school
 * (Dashboard → SchoolSwitcherPill) before these routes mean anything. Single
 * source for the sidebar gating, quick-action gating, and any future guard.
 */
const SCHOOL_SCOPED_PREFIXES = [
  "/attendance",
  "/recording",
  "/rag",
  "/survey",
  "/students",
];

export function needsActiveSchool(path?: string | null): boolean {
  if (!path) return false;
  return SCHOOL_SCOPED_PREFIXES.some((p) => path.startsWith(p));
}

export const STAFF_ROLES: UserRole[] = ["admin", "principal", "teacher"];

export function isStaff(role?: UserRole | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function canManageRecordings(role?: UserRole | null): boolean {
  return role === "admin" || role === "principal";
}

/**
 * School-level administrators: the platform admin and the school's principal.
 * The canonical set for management surfaces that a teacher must NOT see —
 * survey sync, data cleanup, content-request triage, feedback review. Prefer
 * this over ad-hoc `role === "admin" || role === "principal"` checks so the
 * definition lives in one place.
 */
export function isSchoolAdmin(role?: UserRole | null): boolean {
  return role === "admin" || role === "principal";
}

export function canUploadRecordings(role?: UserRole | null): boolean {
  return role === "admin" || role === "principal" || role === "teacher";
}
