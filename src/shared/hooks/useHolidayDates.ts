import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parse, isValid } from "date-fns";
import { attendanceApi } from "@/features/attendance/api/attendance";

interface UseHolidayDatesParams {
  session: string;
  schoolName?: string;
  /** Set to false to skip fetching (e.g. when a required field is missing) */
  enabled?: boolean;
}

/**
 * Fetches school holidays for the given session and returns them as an array
 * of `Date` objects (ready to pass to DatePicker's `holidays` prop).
 *
 * The API returns dates in "DD-MM-YYYY" format; this hook converts them to
 * native `Date` objects automatically.
 */
export function useHolidayDates({
  session,
  schoolName,
  enabled = true,
}: UseHolidayDatesParams): Date[] {
  const params: Record<string, string> = {
    session,
    ...(schoolName ? { school_name: schoolName } : {}),
  };

  const { data } = useQuery({
    queryKey: ["attendance", "holidays", schoolName ?? "", session],
    queryFn: () => attendanceApi.listHolidays(params),
    enabled: enabled && !!session,
    staleTime: 5 * 60 * 1000, // 5 min — holidays rarely change mid-session
  });

  return useMemo(() => {
    if (!data?.holidays) return [];
    return data.holidays
      .map((h) => parse(h.date, "dd-MM-yyyy", new Date()))
      .filter(isValid);
  }, [data]);
}
