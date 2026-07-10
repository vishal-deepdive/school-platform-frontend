import { CalendarRange } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMyChildren } from "@/features/attendance/hooks/useMyChildren";
import { ChildSelector } from "./ChildSelector";
import { StudentAttendanceCalendar } from "./StudentAttendanceCalendar";

/**
 * Read-only attendance calendar for a student (own record) or a parent (their
 * approved child's record). The server scopes the result to the caller and
 * forces the relevant roll_no, so no class/section/school filters are needed —
 * only a month selection, driven by the calendar's own navigation.
 */
export function SelfAttendanceView() {
  const { user } = useAuthStore();
  const isParent = user?.role === "parent";
  const {
    children,
    selectedRoll,
    setSelectedRoll,
    isLoading: childrenLoading,
    showSelector,
  } = useMyChildren();

  // Parent whose account has no approved child linked yet.
  if (isParent && !childrenLoading && children.length === 0) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-10 w-10" />}
        title="No approved child linked yet"
        description="Once the school approves your parent account and links your child, their attendance records appear here."
      />
    );
  }

  const selectedChild = children.find((c) => c.roll_no === selectedRoll);
  const studentLabel = selectedChild
    ? `${selectedChild.student_name ?? `Roll ${selectedChild.roll_no}`}${
        selectedChild.class_name
          ? ` · Class ${selectedChild.class_name}${selectedChild.section ? `-${selectedChild.section}` : ""}`
          : ""
      }`
    : undefined;

  return (
    <div className="space-y-6">
      {showSelector && (
        <ChildSelector
          childrenList={children}
          value={selectedRoll}
          onChange={setSelectedRoll}
        />
      )}
      <StudentAttendanceCalendar
        rollNo={selectedRoll}
        isParent={isParent}
        studentLabel={studentLabel}
      />
    </div>
  );
}
