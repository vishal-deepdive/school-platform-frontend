import { isSameDay, parse } from "date-fns";
import { isSunday } from "@/shared/lib/utils";

/**
 * True if the given ISO date (YYYY-MM-DD) is a Sunday or a configured school
 * holiday. Use to gate the "mark anyway" override UI — the server rejects
 * both cases identically unless allow_holiday is sent.
 */
export function isHolidayDate(iso: string, holidays: Date[]): boolean {
  if (!iso) return false;
  if (isSunday(iso)) return true;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return holidays.some((h) => isSameDay(h, d));
}
