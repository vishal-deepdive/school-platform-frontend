import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { School, Users } from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { CardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { EnrollmentStatsSchool } from "@/features/attendance/types";

const URL_DEFAULTS: { school: string; q: string } = { school: "", q: "" };
/** Past this many schools the list gets a search box. */
const SEARCH_THRESHOLD = 6;

export function AttendanceStatsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["attendance", "enrollment-stats"],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 2 * 60_000,
  });
  const [state, update] = useUrlState(URL_DEFAULTS);
  const [search, setSearch] = useUrlSearch(state.q, (q) => update({ q }));

  const schools = useMemo(
    () => [...(data?.by_school ?? [])].sort((a, b) => b.total - a.total),
    [data],
  );
  const filtered = useMemo(() => {
    const q = state.q.toLowerCase();
    return q ? schools.filter((s) => s.school_name.toLowerCase().includes(q)) : schools;
  }, [schools, state.q]);

  const selected =
    schools.find((s) => s.school_name === state.school) ?? filtered[0] ?? schools[0];
  const multi = schools.length > 1;
  const selectSchool = (name: string) => update({ school: name }, { push: true });

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh enrollment"
        />
      </ModuleHeaderActions>

      {isLoading ? (
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-56" />
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <Skeleton className="hidden h-72 rounded-xl lg:block" />
            <CardSkeleton lines={6} />
          </div>
        </div>
      ) : isError ? (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load enrollment statistics."}
        </Alert>
      ) : !selected ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No students enrolled yet"
          description="Import a roster or add students to see enrollment by class and section."
        />
      ) : (
        <>
          <StatLine
            items={[
              { value: data?.total_students ?? 0, label: "students enrolled" },
              { value: schools.length, label: "schools", hidden: !multi },
              {
                value: selected.by_class.length,
                label: selected.by_class.length === 1 ? "class" : "classes",
                hidden: multi,
              },
            ]}
          />

          {multi ? (
            <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="lg:hidden">
                <Select
                  aria-label="School"
                  options={schools.map((s) => ({
                    value: s.school_name,
                    label: `${s.school_name} (${s.total})`,
                  }))}
                  value={selected.school_name}
                  onChange={(e) => selectSchool(e.target.value)}
                />
              </div>
              <nav
                aria-label="Schools"
                className="hidden min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-card lg:sticky lg:top-0 lg:flex lg:max-h-[calc(100vh-13rem)]"
              >
                {schools.length > SEARCH_THRESHOLD && (
                  <div className="border-b border-border/60 p-2">
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="Find a school…"
                    />
                  </div>
                )}
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5 scrollbar-thin">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No schools match.
                    </li>
                  ) : (
                    filtered.map((s) => {
                      const active = s.school_name === selected.school_name;
                      return (
                        <li key={s.school_name}>
                          <button
                            type="button"
                            aria-current={active ? "true" : undefined}
                            onClick={() => selectSchool(s.school_name)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-foreground hover:bg-muted/60",
                            )}
                          >
                            <span className="truncate">{s.school_name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {s.total.toLocaleString()}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </nav>
              <ClassBreakdown school={selected} />
            </div>
          ) : (
            <ClassBreakdown school={selected} />
          )}
        </>
      )}
    </div>
  );
}

function ClassBreakdown({ school }: { school: EnrollmentStatsSchool }) {
  const max = Math.max(1, ...school.by_class.map((c) => c.total));

  return (
    <Panel
      flush
      className="min-w-0"
      icon={<School className="h-4 w-4" />}
      title={school.school_name}
      actions={<Badge variant="primary">{school.total.toLocaleString()} students</Badge>}
    >
      {school.by_class.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">
          No class breakdown available.
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {school.by_class.map((cls) => (
            <li
              key={cls.class_name}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_11rem] md:px-5"
            >
              <span className="text-sm font-semibold text-foreground">Class {cls.class_name}</span>
              <div className="flex flex-wrap gap-1.5">
                {cls.by_section.map((sec) => (
                  <span
                    key={sec.section}
                    className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground"
                    title={
                      sec.by_subject.length > 0 && sec.by_subject[0].subject !== "No Subject"
                        ? sec.by_subject.map((sub) => `${sub.subject}: ${sub.count}`).join(", ")
                        : undefined
                    }
                  >
                    <span className="font-medium text-foreground/80">Sec {sec.section}</span>
                    <span className="ml-1 tabular-nums">{sec.total}</span>
                  </span>
                ))}
              </div>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((cls.total / max) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-foreground">
                  {cls.total.toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
