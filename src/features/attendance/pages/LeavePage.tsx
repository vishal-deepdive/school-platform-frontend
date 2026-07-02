import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, X, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type { BadgeVariant } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";
import type { LeaveStatus } from "@/features/attendance/types";

const STAFF_ROLES = ["admin", "principal", "teacher"];

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
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role);
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
        <Card>
          <CardHeader
            title="Apply for Leave"
            description="Request leave over a date range. Approved days are marked Excused automatically."
          />
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
          <div className="mt-4">
            <Button
              onClick={() => applyMutation.mutate()}
              loading={applyMutation.isPending}
              icon={<Send className="h-4 w-4" />}
            >
              Submit Request
            </Button>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarClock className="h-4 w-4" />
            {isStaff ? "Leave Requests" : "My Requests"}
          </h3>
          <div className="flex items-center gap-2">
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
            <Badge>{data?.total ?? 0}</Badge>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {!data || data.data.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No leave requests found.
            </p>
          ) : (
            data.data.map((lr) => (
              <div
                key={lr.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {lr.student_name ?? lr.roll_no}
                    </span>
                    <Badge variant={STATUS_VARIANT[lr.status]}>{lr.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lr.start_date} → {lr.end_date}
                    {lr.class_name && ` · ${lr.class_name}-${lr.section ?? ""}`}
                    {lr.reason && ` · ${lr.reason}`}
                  </p>
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
                      variant="ghost"
                      onClick={() =>
                        reviewMutation.mutate({ id: lr.id, decision: "rejected" })
                      }
                      icon={<X className="h-4 w-4 text-destructive" />}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
