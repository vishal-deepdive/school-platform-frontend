import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Trash2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { cn, getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";
import type { HolidayItem } from "@/features/attendance/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "DD-MM-YYYY" → Date, or null when unparseable. */
function parseDmy(dmy: string): Date | null {
  const [d, m, y] = dmy.split("-").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const MONTH_FMT = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const SHORT_FMT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function HolidaysPage() {
  const { schoolName, ready, schoolParam } = useActiveSchool();
  const role = useAuthStore((s) => s.user?.role);
  // The backend only lets admin/principal write holidays (teachers get
  // read-only access to the calendar) — hide the add/remove controls to match.
  const canManage = isSchoolAdmin(role);

  const defaults = useMemo(() => ({ session: getCurrentSession() }), []);
  const [{ session }, update] = useUrlState(defaults);
  const [addOpen, setAddOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<HolidayItem | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "holidays", schoolName, session],
    queryFn: () => attendanceApi.listHolidays({ session, ...schoolParam }),
    enabled: ready,
  });

  const deleteMutation = useMutation({
    mutationFn: (date: string) =>
      attendanceApi.deleteHoliday({ session, date, ...schoolParam }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "holidays"] });
      toast.success("Holiday removed");
      setHolidayToDelete(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const holidayDates = useHolidayDates({ session, schoolName, enabled: ready });

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sorted = useMemo(
    () =>
      (data?.holidays ?? [])
        .map((h) => ({ ...h, when: parseDmy(h.date) }))
        .sort((a, b) => (a.when?.getTime() ?? 0) - (b.when?.getTime() ?? 0)),
    [data],
  );
  const next = sorted.find((h) => h.when && h.when >= startOfToday);

  const months = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const holiday of sorted) {
      const key = holiday.when ? MONTH_FMT.format(holiday.when) : "Other";
      const list = map.get(key);
      if (list) list.push(holiday);
      else map.set(key, [holiday]);
    }
    return Array.from(map.entries());
  }, [sorted]);

  return (
    <div className="space-y-4">
      {canManage && (
        <ModuleHeaderActions>
          <Button
            size="sm"
            icon={<CalendarPlus className="h-4 w-4" />}
            disabled={!ready}
            onClick={() => setAddOpen(true)}
          >
            Add holiday
          </Button>
        </ModuleHeaderActions>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full sm:w-40">
          <Select
            aria-label="Session"
            options={SESSION_OPTIONS}
            value={session}
            onChange={(e) => update({ session: e.target.value })}
          />
        </div>
        <StatLine
          loading={isLoading}
          items={[
            {
              value: data?.total ?? 0,
              label: (data?.total ?? 0) === 1 ? "holiday" : "holidays",
            },
            {
              label: next?.when ? (
                <>
                  next: <span className="font-medium text-foreground">{next.name || "Holiday"}</span>
                  , {SHORT_FMT.format(next.when)}
                </>
              ) : (
                ""
              ),
              hidden: !next?.when,
            },
          ]}
        />
      </div>

      <Panel flush>
        {isLoading ? (
          <ListSkeleton items={5} />
        ) : sorted.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<CalendarDays className="h-9 w-9" />}
            title="No holidays configured"
            description={
              canManage
                ? "Add school holidays so they're skipped when marking attendance."
                : "No holidays have been added for this session yet."
            }
            action={
              canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<CalendarPlus className="h-4 w-4" />}
                  onClick={() => setAddOpen(true)}
                >
                  Add holiday
                </Button>
              ) : undefined
            }
          />
        ) : (
          months.map(([month, items]) => (
            <section key={month} className="border-t border-border/50 first:border-t-0">
              <h3 className="bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:px-5">
                {month}
              </h3>
              <ul className="divide-y divide-border/50">
                {items.map((h) => {
                  const past = h.when ? h.when < startOfToday : false;
                  return (
                    <li
                      key={h.id}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 md:px-5",
                        past && "opacity-60",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/15 bg-primary/5 leading-none">
                          <span className="text-sm font-bold tabular-nums text-primary">
                            {h.when ? h.when.getDate() : "—"}
                          </span>
                          <span className="text-[10px] font-medium uppercase text-primary/70">
                            {h.when ? WEEKDAY_FMT.format(h.when) : ""}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {h.name || "Holiday"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {h.date}
                            {past && " · past"}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <ActionMenu
                          label={`Actions for ${h.name || h.date}`}
                          items={[
                            {
                              label: "Remove holiday",
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () => setHolidayToDelete(h),
                            },
                          ]}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Panel>

      {canManage && (
        <AddHolidayModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          session={session}
          schoolParam={schoolParam}
          holidayDates={holidayDates}
        />
      )}

      <ConfirmDialog
        open={canManage && holidayToDelete !== null}
        title="Remove holiday?"
        description={
          holidayToDelete && (
            <>
              <span className="font-medium text-foreground">
                {holidayToDelete.name || "Holiday"}
              </span>{" "}
              on {holidayToDelete.date} will no longer be treated as a holiday — attendance can be
              marked on that day again.
            </>
          )
        }
        confirmLabel="Remove holiday"
        loading={deleteMutation.isPending}
        onConfirm={() => holidayToDelete && deleteMutation.mutate(holidayToDelete.date)}
        onClose={() => setHolidayToDelete(null)}
      />
    </div>
  );
}

function AddHolidayModal({
  open,
  onClose,
  session,
  schoolParam,
  holidayDates,
}: {
  open: boolean;
  onClose: () => void;
  session: string;
  schoolParam: Record<string, string>;
  holidayDates: Date[];
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: () =>
      attendanceApi.addHolidays({
        session,
        name: name.trim() || undefined,
        dates: [isoToIndianDate(date)],
        ...schoolParam,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "holidays"] });
      toast.success(res.inserted > 0 ? "Holiday added" : "That date was already a holiday");
      setName("");
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a holiday"
      description={`Days off in ${session} are skipped when marking attendance.`}
      icon={<CalendarPlus className="h-5 w-5" />}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={add.isPending}
            onClick={() => add.mutate()}
            icon={<CalendarPlus className="h-4 w-4" />}
          >
            Add holiday
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <DatePicker
          label="Date"
          value={date}
          onChange={(iso) => setDate(iso ?? todayIso())}
          fadeSundays
          holidays={holidayDates}
        />
        <Input
          label="Name (optional)"
          placeholder="Independence Day"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Modal>
  );
}
