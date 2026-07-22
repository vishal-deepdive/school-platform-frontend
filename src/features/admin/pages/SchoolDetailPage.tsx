/**
 * Platform-admin School Detail — a thin wrapper around the shared
 * `SchoolManagement` cockpit with the full admin capability set (principal
 * provisioning, activate/deactivate, staff invites, session). The principal's
 * own-school view (`/school`) renders the same component with `PRINCIPAL_CAPS`.
 */
import { useParams } from "react-router-dom";
import { SchoolManagement, ADMIN_CAPS } from "@/features/school";

export function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  if (!schoolId) return null;
  return (
    <SchoolManagement schoolId={schoolId} caps={ADMIN_CAPS} backHref="/admin/schools" />
  );
}
