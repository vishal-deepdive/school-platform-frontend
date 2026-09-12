import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Check, Send, X } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
import { usePendingKeys } from "@/shared/hooks/usePendingKeys";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Textarea } from "@/shared/components/ui/Textarea";
import { cn, getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";
import { isStaff as isStaffRole } from "@/shared/lib/permissions";
import { useMyChildren } from "@/features/attendance/hooks/useMyChildren";
import { ChildSelector } from "@/features/attendance/components/ChildSelector";
import type { LeaveCreateRequest, LeaveStatus } from "@/features/attendance/types";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";

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

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const REASON_OPTIONS: { value: LeaveCreateRequest["reason"]; label: string }[] = [
  { value: "Medical", label: "Medical" },
  { value: "Family Event", label: "Family event" },
  { value: "Emergency", label: "Emergency" },
  { value: "Vacation", label: "Vacation" },
  { value: "Other", label: "Other" },
];

export function LeavePage() {
  const { user } = useAuthStore();
  const isStaff = isStaffRole(user?.role);
  const queryClient = useQueryClient();
  const {
    isParent,
    children,
    selectedRoll,
    setSelectedRoll,
    isLoading: childrenLoading,
    showSelector,
  } = useMyChildren();
  const { schoolParam, ready } = useActiveSchool();

  // Staff land on the queue that needs them; everyone else sees their history.
  const defaults = useMemo(
    () => ({ status: isStaff ? "pending" : "all", session: getCurrentSession() }),
    [isStaff],
  );
  const [state, update] = useUrlState(defaults);
  const status = STATUS_TABS.some((t) => t.id === state.status) ? state.status : defaults.status;
  const [requestOpen, setRequestOpen] = useState(false);

  // A parent must not submit before their child selection resolves — otherwise
  // createLeave posts without a roll_no and the backend can't disambiguate a
  // multi-child account (the exact "specify roll_no" error the selector prevents).
  const childSelectionPending = isParent && (childrenLoading || !selectedRoll);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["attendance", "leave", state.session, status, selectedRoll, schoolParam],
    queryFn: () => {
      // A parent's requests are scoped to the selected child; students/staff omit it.
      const params: Record<string, string> = { session: state.session, ...schoolParam };
      if (status !== "all") params.status = status;
      if (isParent && selectedRoll) params.roll_no = selectedRoll;
      return attendanceApi.listLeave(params);
    },
    // Wait for a child selection before listing a parent's requests, and for an
    // active school if they are staff (admins must pick one).
    enabled: (!isParent || !!selectedRoll) && (!isStaff || ready),
    placeholderData: (prev) => prev,
  });

  const reviewPending = usePendingKeys();
  const reviewMutation = useMutation({
    mutationFn: (v: { id: number; decision: "approved" | "rejected" }) =>
      attendanceApi.reviewLeave(v.id, { decision: v.decision }),
    onMutate: (v) => reviewPending.start(String(v.id)),
    onSettled: (_data, _err, v) => reviewPending.finish(String(v.id)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "leave"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(
        res.status === "approved"
          ? `Approved · ${res.days_marked_excused} day(s) marked excused`
          : "Request rejected",
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Parent whose account has no approved child linked yet.
  if (isParent && !childrenLoading && children.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-9 w-9" />}
        title="No approved child linked yet"
        description="Once the school approves your parent account and links your child, you can apply for and track their leave here."
      />
    );
  }

  const requests = data?.data ?? [];

  return (
    <div className="space-y-4">
      {!isStaff && (
        <ModuleHeaderActions>
          <Button
            size="sm"
            icon={<Send className="h-4 w-4" />}
            disabled={childSelectionPending}
            onClick={() => setRequestOpen(true)}
          >
            Request leave
          </Button>
        </ModuleHeaderActions>
      )}

      {showSelector && (
        <ChildSelector childrenList={children} value={selectedRoll} onChange={setSelectedRoll} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full sm:w-40">
          <Select
            aria-label="Session"
            options={SESSION_OPTIONS}
            value={state.session}
            onChange={(e) => update({ session: e.target.value })}
          />
        </div>
        <StatLine
          loading={isLoading}
          items={[
            {
              value: data?.total ?? 0,
              label: (data?.total ?? 0) === 1 ? "request" : "requests",
            },
          ]}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <Tabs
          size="sm"
          tabs={STATUS_TABS}
          active={status}
          onChange={(id) => update({ status: id }, { push: true })}
          className="px-2 md:px-3"
        />
        {isLoading ? (
          <ListSkeleton items={4} />
        ) : requests.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<CalendarClock className="h-9 w-9" />}
            title="No leave requests"
            description={
              isStaff
                ? status === "pending"
                  ? "Nothing is waiting for your review."
                  : "No requests match this filter."
                : "You haven't submitted any leave requests yet."
            }
          />
        ) : (
          <ul
            className={cn(
              "divide-y divide-border/50 transition-opacity",
              isPlaceholderData && "opacity-60",
            )}
            aria-busy={isPlaceholderData}
          >
            {requests.map((lr) => (
              <li
                key={lr.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={lr.student_name ?? lr.roll_no} seed={lr.roll_no} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {lr.student_name ?? lr.roll_no}
                      </span>
                      <Badge variant={STATUS_VARIANT[lr.status]} className="capitalize">
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
                        <span>
                          · {lr.class_name}-{lr.section ?? ""}
                        </span>
                      )}
                      {lr.reason && <span>· {lr.reason}</span>}
                    </p>
                    {lr.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/80">
                        {lr.description}
                      </p>
                    )}
                  </div>
                </div>
                {isStaff && lr.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={reviewPending.has(String(lr.id))}
                      disabled={reviewPending.has(String(lr.id))}
                      onClick={() => reviewMutation.mutate({ id: lr.id, decision: "approved" })}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-ghost"
                      loading={reviewPending.has(String(lr.id))}
                      disabled={reviewPending.has(String(lr.id))}
                      onClick={() => reviewMutation.mutate({ id: lr.id, decision: "rejected" })}
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
      </section>

      <RequestLeaveModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        defaultSession={state.session}
        rollNo={isParent ? selectedRoll : null}
        onSubmitted={() => {
          setRequestOpen(false);
          queryClient.invalidateQueries({ queryKey: ["attendance", "leave"] });
        }}
      />
    </div>
  );
}

function RequestLeaveModal({
  open,
  onClose,
  defaultSession,
  rollNo,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  defaultSession: string;
  rollNo: string | null;
  onSubmitted: () => void;
}) {
  const [session, setSession] = useState(defaultSession);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());
  const [reason, setReason] = useState<LeaveCreateRequest["reason"]>("Medical");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) setSession(defaultSession);
  }, [open, defaultSession]);

  const endBeforeStart = end < start;

  const apply = useMutation({
    mutationFn: () =>
      attendanceApi.createLeave({
        session,
        start_date: isoToIndianDate(start),
        end_date: isoToIndianDate(end),
        reason,
        description: description.trim() || undefined,
        ...(rollNo ? { roll_no: rollNo } : {}),
      }),
    onSuccess: () => {
      toast.success("Leave request submitted");
      setReason("Medical");
      setDescription("");
      onSubmitted();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request leave"
      description="The school reviews it and, once approved, those days are marked excused."
      icon={<CalendarClock className="h-5 w-5" />}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => apply.mutate()}
            loading={apply.isPending}
            disabled={endBeforeStart}
            icon={<Send className="h-4 w-4" />}
          >
            Submit request
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Session"
          options={SESSION_OPTIONS}
          value={session}
          onChange={(e) => setSession(e.target.value)}
        />
        <Select
          label="Reason"
          options={REASON_OPTIONS}
          value={reason}
          onChange={(e) => setReason(e.target.value as LeaveCreateRequest["reason"])}
        />
        <DatePicker
          label="From"
          value={start}
          onChange={(iso) => {
            const next = iso ?? todayIso();
            setStart(next);
            if (end < next) setEnd(next);
          }}
          fadeSundays
        />
        <DatePicker
          label="To"
          value={end}
          min={start}
          onChange={(iso) => setEnd(iso ?? start)}
          error={endBeforeStart ? "Must be on or after the start date" : undefined}
          fadeSundays
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            placeholder="Briefly describe the reason for the leave (max 1000 characters)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
