import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Trash2, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { getErrorMessage, isoToIndianDate } from "@/shared/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function HolidaysPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [schoolName, setSchoolName] = useState("");
  const [session, setSession] = useState("2025-26");
  const [newDate, setNewDate] = useState(todayIso());
  const [name, setName] = useState("");

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();

  const ready = !isAdmin || !!schoolName;
  const schoolParam: Record<string, string> =
    isAdmin && schoolName ? { school_name: schoolName } : {};

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
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    setSchoolName(schoolOptions.find((o) => o.value === id)?.label ?? "");
  };

  const holidays = useHolidayDates({ session, schoolName, enabled: ready });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Holiday Calendar"
          description="Mark non-working days. Attendance can't be recorded on these dates (unless overridden), and reports treat them as holidays."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <SearchableSelect
              label="School"
              placeholder="Select school..."
              options={schoolOptions}
              value={schoolId}
              onChange={handleSchoolChange}
              onSearchChange={setSchoolQuery}
              isLoading={schoolsLoading}
            />
          )}
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
        <div className="mt-4">
          <Button
            onClick={() => addMutation.mutate()}
            loading={addMutation.isPending}
            disabled={!ready}
            icon={<CalendarPlus className="h-4 w-4" />}
          >
            Add Holiday
          </Button>
        </div>
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarDays className="h-4 w-4" /> Holidays — {session}
          </h3>
          <Badge>{data?.total ?? 0}</Badge>
        </div>
        <div className="divide-y divide-border/40">
          {!data || data.holidays.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No holidays configured for this session.
            </p>
          ) : (
            data.holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <span className="font-medium text-foreground">{h.date}</span>
                  {h.name && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {h.name}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(h.date)}
                  icon={<Trash2 className="h-4 w-4 text-destructive" />}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
