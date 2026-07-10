import { useState } from "react";
import { History, Download, Search as SearchIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { downloadBlob, formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import type { ChangeLogEntry } from "@/features/attendance/types";

// Mirrors the backend's JSON-path cap (attendance/repository.py
// _CHANGE_LOG_JSON_LIMIT) — the interactive view is bounded; use CSV export
// for a full, unbounded history.
const CHANGE_LOG_JSON_LIMIT = 1000;

const CHANGE_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  delete: "danger",
  insert: "success",
  embedding_update: "info",
  manual_mark: "primary",
  attendance_correction: "warning",
  leave_excused: "purple",
  holiday_add: "indigo",
  holiday_delete: "default",
};

export function ChangeLogPage() {
  const { schoolId, schoolName, isAdmin, schoolParam } = useActiveSchool();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [changeType, setChangeType] = useState("");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<ChangeLogEntry[] | null>(null);

  const sectionOptions = className ? getSectionOptions(className) : [];

  const buildParams = () => ({
    ...schoolParam,
    ...(className ? { class_name: className } : {}),
    ...(section ? { section } : {}),
    ...(rollNo.trim() ? { roll_no: rollNo.trim() } : {}),
    ...(changeType.trim() ? { change_type: changeType.trim() } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
  });

  const search = useMutation({
    mutationFn: () => attendanceApi.getChangeLog(buildParams()),
    onSuccess: (data) => setEntries(data.data),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const exportCsv = useMutation({
    mutationFn: () => attendanceApi.exportChangeLog(buildParams()),
    onSuccess: (blob) =>
      downloadBlob(blob, `change-log-${new Date().toISOString().slice(0, 10)}.csv`),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const canSearch = !isAdmin || !!schoolName;

  return (
    <div className="space-y-6">
      <ModuleHeaderActions>
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="h-4 w-4" />}
          loading={exportCsv.isPending}
          disabled={!entries || entries.length === 0}
          onClick={() => exportCsv.mutate()}
        >
          Export CSV
        </Button>
      </ModuleHeaderActions>

      <FilterBar
        title="Audit trail"
        icon={<History className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => search.mutate()}
            loading={search.isPending}
            disabled={!canSearch}
            icon={<SearchIcon className="h-4 w-4" />}
          >
            Search
          </Button>
        }
      >
        <Alert variant="info" title="Registration & deletion history">
          Every enrollment, correction, and deletion made against this school's
          attendance data, in one searchable ledger.
        </Alert>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classNameOptions.length > 0 ? (
            <Select
              label="Class"
              placeholder="All classes"
              options={[{ value: "", label: "All classes" }, ...classNameOptions]}
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setSection("");
              }}
            />
          ) : (
            <Input
              label="Class"
              placeholder="e.g. 9"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          )}
          {sectionOptions.length > 0 ? (
            <Select
              label="Section"
              placeholder="All sections"
              options={[{ value: "", label: "All sections" }, ...sectionOptions]}
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          ) : (
            <Input
              label="Section"
              placeholder="e.g. A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          )}
          <Input
            label="Roll number"
            placeholder="Optional"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
          />
          <Input
            label="Change type"
            hint="e.g. delete, insert, embedding_update"
            placeholder="Optional"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
          />
          <DatePicker label="From" value={startDate} onChange={setStartDate} />
          <DatePicker label="To" value={endDate} onChange={setEndDate} />
        </div>
      </FilterBar>

      {entries && entries.length >= CHANGE_LOG_JSON_LIMIT && (
        <Alert variant="warning" title="Showing the most recent results only">
          This view is capped at {CHANGE_LOG_JSON_LIMIT.toLocaleString()} records.
          Narrow the filters (e.g. a shorter date range) to see more, or use
          Export CSV for the complete history.
        </Alert>
      )}

      {entries && (
        <Panel
          flush
          icon={<History className="h-4 w-4" />}
          title="Change log"
          actions={<Badge variant="primary">{entries.length} records</Badge>}
        >
          {search.isPending ? (
            <div className="p-4">
              <ListSkeleton items={5} />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<History className="h-9 w-9" />}
                title="No changes found"
                description="Nothing matches these filters yet."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {entries.map((e, i) => (
                <li
                  key={`${e.timestamp}-${e.roll_no}-${i}`}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={CHANGE_TYPE_VARIANTS[e.change_type] ?? "default"}>
                        {e.change_type}
                      </Badge>
                      <span className="truncate text-sm font-medium text-foreground">
                        Roll #{e.roll_no || "—"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[e.class_name, e.section, e.subject].filter(Boolean).join(" · ") ||
                        "—"}{" "}
                      {e.session ? `· ${e.session}` : ""}
                    </p>
                    {e.details && (
                      <p className="mt-1 truncate text-xs text-muted-foreground/80">
                        {e.details}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(e.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
