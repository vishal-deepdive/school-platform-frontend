import { Building2 } from "lucide-react";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SchoolManagement, PRINCIPAL_CAPS } from "@/features/school/SchoolManagement";

/**
 * "My School" — the principal's own-school management cockpit. The school id
 * comes from `useActiveSchool()` (a principal is always scoped to their own
 * school), so there is no picker and no SchoolGate. All actions are additionally
 * fenced server-side to the principal's school.
 */
export function MySchoolPage() {
  const { schoolId } = useActiveSchool();

  if (!schoolId) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="No school linked"
        description="Your account isn't linked to a school yet. Contact your platform administrator."
      />
    );
  }

  return <SchoolManagement schoolId={schoolId} caps={PRINCIPAL_CAPS} />;
}
