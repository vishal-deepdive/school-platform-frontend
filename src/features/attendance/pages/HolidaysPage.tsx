import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Trash2, CalendarDays } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// "DD-MM-YYYY" → short weekday + day chip for the holiday row marker.
function dateChip(dmy: string): { day: string; month: string } {
  const [d, m, y] = dmy.split("-").map(Number);
  if (!d || !m || !y) return { day: "—", month: "" };
  const date = new Date(y, m - 1, d);
  return {
    day: String(d).padStart(2, "0"),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
}

export function HolidaysPage() {
  const { schoolName, ready, schoolParam } = useActiveSchool();
  const queryClient = useQueryClient();

  const [session, setSession] = useState("2025-26");
  const [newDate, setNewDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [holidayToDelete, setHolidayToDelete] = useState<{
    date: string;
    name?: string | null;
  } | null>(null);

  const { data } = useQuery({
    queryKey: ["attendance", "holidays", schoolName, session],
    queryFn: () => attendanceApi.listHolidays({ session, ...schoolParam }),
    enabled: ready,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      attendanceApi.addHolidays({
        session,
        name: name || undefined,
        dates: [isoToIndianDate(newDate)],
        ...schoolParam,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "holidays"] });
      toast.success(
        res.inserted > 0 ? "Holiday added" : "That date was already a holiday",
      );
      setName("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
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

  const holidays = useHolidayDates({ session, schoolName, enabled: ready });

  return (
    <div className="space-y-6">
      <FilterBar
        title="Add a holiday"
        icon={<CalendarPlus className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => addMutation.mutate()}
            loading={addMutation.isPending}
            disabled={!ready}
            icon={<CalendarPlus className="h-4 w-4" />}
          >
            Add Holiday
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Session"
            options={SESSION_OPTIONS}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
          <DatePicker
            label="Holiday date"
            value={newDate}
            onChange={(iso) => setNewDate(iso ?? todayIso())}
            fadeSundays
            holidays={holidays}
          />
          <Input
            label="Name (optional)"
            placeholder="Independence Day"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </FilterBar>

      <Panel
        flush
        icon={<CalendarDays className="h-4 w-4" />}
        title={`Holidays · ${session}`}
        description="Days excluded from attendance for this session"
        actions={<Badge variant="primary">{data?.total ?? 0} total</Badge>}
      >
        {!data || data.holidays.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CalendarDays className="h-9 w-9" />}
              title="No holidays configured"
              description="Add school holidays so they're skipped when marking attendance."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.holidays.map((h) => {
              const chip = dateChip(h.date);
              return (
                <li
                  key={h.id}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/15 bg-primary/5 leading-none">
                      <span className="text-sm font-bold text-primary tabular-nums">
                        {chip.day}
                      </span>
                      <span className="text-[10px] font-medium uppercase text-primary/70">
                        {chip.month}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {h.name || "Holiday"}
                      </p>
                      <p className="text-xs text-muted-foreground">{h.date}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => setHolidayToDelete(h)}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={holidayToDelete !== null}
        title="Remove holiday?"
        description={
          holidayToDelete && (
            <>
              <span className="font-medium text-foreground">
                {holidayToDelete.name || "Holiday"}
              </span>{" "}
              on {holidayToDelete.date} will no longer be treated as a holiday —
              attendance can be marked on that day again.
            </>
          )
        }
        confirmLabel="Remove holiday"
        loading={deleteMutation.isPending}
        onConfirm={() =>
          holidayToDelete && deleteMutation.mutate(holidayToDelete.date)
        }
        onClose={() => setHolidayToDelete(null)}
      />
    </div>
  );
}
