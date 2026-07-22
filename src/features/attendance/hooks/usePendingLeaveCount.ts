import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { getCurrentSession } from "@/features/attendance/constants";
import { useAuthStore } from "@/features/auth/store/auth";
import { isStaff } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";

/**
 * Count of leave requests awaiting review, for the sidebar badge. Staff-only,
 * and gated on an active school so an admin who hasn't picked one issues no
 * request. Asks for a single row (`limit=1`) — only the `total` is used — and
 * caches for a minute so mounting the always-present sidebar stays cheap.
 */
export function usePendingLeaveCount(): number {
  const role = useAuthStore((s) => s.user?.role);
  const { ready, schoolParam } = useActiveSchool();
  const enabled = isStaff(role) && ready;

  const { data } = useQuery({
    queryKey: ["attendance", "leave", "pending-count", schoolParam],
    queryFn: () =>
      attendanceApi.listLeave({
        session: getCurrentSession(),
        status: "pending",
        limit: "1",
        ...schoolParam,
      }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  return data?.total ?? 0;
}
