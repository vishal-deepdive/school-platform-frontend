import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { useAuthStore } from "@/features/auth/store/auth";
import type { ChildItem } from "@/features/attendance/types";

export interface MyChildrenState {
  /** True only for a parent account. */
  isParent: boolean;
  children: ChildItem[];
  /** Currently-selected child roll (defaults to the first child once loaded). */
  selectedRoll: string | null;
  setSelectedRoll: (roll: string) => void;
  isLoading: boolean;
  /** True when a selector should be shown (parent with more than one child). */
  showSelector: boolean;
}

/**
 * Resolves the approved children a parent may view and tracks which one is
 * selected. Students never need it (they only ever see themselves), so the query
 * runs for parents only. A single-child parent auto-resolves server-side, so the
 * selector is shown only when there is a genuine choice (2+ children) — but the
 * selected roll is always threaded into requests so the multi-child "specify
 * roll_no" error can never surface.
 */
export function useMyChildren(): MyChildrenState {
  const role = useAuthStore((s) => s.user?.role);
  const isParent = role === "parent";
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "my-children"],
    queryFn: () => attendanceApi.getMyChildren(),
    enabled: isParent,
    staleTime: 5 * 60_000,
  });

  const children = data?.children ?? [];

  // Default to the first child once the list loads; keep a valid selection if the
  // list changes (e.g. a child is approved/removed) so we never send a stale roll.
  useEffect(() => {
    if (!isParent || children.length === 0) return;
    if (!selectedRoll || !children.some((c) => c.roll_no === selectedRoll)) {
      setSelectedRoll(children[0].roll_no);
    }
  }, [isParent, children, selectedRoll]);

  return {
    isParent,
    children,
    selectedRoll,
    setSelectedRoll,
    isLoading,
    showSelector: isParent && children.length > 1,
  };
}
