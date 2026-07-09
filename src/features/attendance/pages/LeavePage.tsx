import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, X, Send, ArrowRight } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type { BadgeVariant } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";
import { isStaff as isStaffRole } from "@/shared/lib/permissions";
import type { LeaveStatus } from "@/features/attendance/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const STATUS_VARIANT: Record<LeaveStatus, BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

export function LeavePage() {
  const { user } = useAuthStore();
  const isStaff = isStaffRole(user?.role);
  const queryClient = useQueryClient();

  const [session, setSession] = useState("2025-26");
  const [statusFilter, setStatusFilter] = useState(isStaff ? "pending" : "");
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());
  const [reason, setReason] = useState("");

  const { data } = useQuery({
    queryKey: ["attendance", "leave", session, statusFilter],
    queryFn: () =>
      attendanceApi.listLeave({
        session,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      attendanceApi.createLeave({
        session,
        start_date: isoToIndianDate(start),
        end_date: isoToIndianDate(end),
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "leave"] });
      toast.success("Leave request submitted");
      setReason("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reviewMutation = useMutation({
    mutationFn: (v: { id: number; decision: "approved" | "rejected" }) =>
      attendanceApi.reviewLeave(v.id, { decision: v.decision }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "leave"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(
        res.status === "approved"
          ? `Approved · ${res.days_marked_excused} day(s) marked Excused`
          : "Request rejected",
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      {!isStaff && (
        <FilterBar
          title="Request leave"
          icon={<Send className="h-4 w-4" />}
          actions={
            <Button
              onClick={() => applyMutation.mutate()}
              loading={applyMutation.isPending}
              icon={<Send className="h-4 w-4" />}
            >
              Submit Request
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Session"
              options={SESSION_OPTIONS}
              value={session}
              onChange={(e) => setSession(e.target.value)}
            />
            <DatePicker
              label="From"
              value={start}
              onChange={(iso) => setStart(iso ?? todayIso())}
              fadeSundays
            />
            <DatePicker
              label="To"
              value={end}
              onChange={(iso) => setEnd(iso ?? todayIso())}
              fadeSundays
            />
            <Input
              label="Reason (optional)"
              placeholder="Medical"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </FilterBar>
      )}

      <Panel
        flush
        icon={<CalendarClock className="h-4 w-4" />}
        title={isStaff ? "Leave Requests" : "My Requests"}
        description={isStaff ? "Review and act on student leave" : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select
                options={[
                  { value: "", label: "All statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <Badge variant="primary">{data?.total ?? 0}</Badge>
          </div>
        }
      >
        {!data || data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CalendarClock className="h-9 w-9" />}
              title="No leave requests"
              description={
                isStaff
                  ? "There are no requests matching this filter."
                  : "You haven't submitted any leave requests yet."
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.data.map((lr) => (
              <li
                key={lr.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={lr.student_name ?? lr.roll_no}
                    seed={lr.roll_no}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {lr.student_name ?? lr.roll_no}
                      </span>
                      <Badge variant={STATUS_VARIANT[lr.status]}>
                        {lr.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        {lr.start_date}
                        <ArrowRight className="h-3 w-3" />
                        {lr.end_date}
                      </span>
                      {lr.class_name && (
                        <span>· {lr.class_name}-{lr.section ?? ""}</span>
                      )}
                      {lr.reason && <span>· {lr.reason}</span>}
                    </p>
                  </div>
                </div>
                {isStaff && lr.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({ id: lr.id, decision: "approved" })
                      }
                      icon={<Check className="h-4 w-4" />}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-ghost"
                      onClick={() =>
                        reviewMutation.mutate({ id: lr.id, decision: "rejected" })
                      }
                      icon={<X className="h-4 w-4" />}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
