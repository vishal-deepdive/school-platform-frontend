import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Trash2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { getErrorMessage } from "@/shared/lib/utils";
import type { RosterStudent } from "@/features/attendance/types";

export function ManageStudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [schoolName, setSchoolName] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [session, setSession] = useState("2025-26");
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [search, setSearch] = useState("");

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = className ? getSectionOptions(className) : [];
  const schoolParam: Record<string, string> =
    isAdmin && schoolName ? { school_name: schoolName } : {};

  const loadMutation = useMutation({
    mutationFn: () =>
      attendanceApi.getRoster({
        class_name: className,
        section,
        session,
        ...schoolParam,
      }),
    onSuccess: (data) => setRoster(data.students),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (rollNo: string) =>
      attendanceApi.deleteStudent({ roll_no: rollNo, session, ...schoolParam }),
    onSuccess: (_res, rollNo) => {
      setRoster((prev) => prev?.filter((s) => s.roll_no !== rollNo) ?? null);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Student ${rollNo} deleted`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    setClassName("");
    setSection("");
    setRoster(null);
    setSchoolName(schoolOptions.find((o) => o.value === id)?.label ?? "");
  };

  const confirmDelete = (s: RosterStudent) => {
    if (
      window.confirm(
        `Permanently delete ${s.name ?? s.roll_no} (#${s.roll_no}) and all their attendance records? This cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(s.roll_no);
    }
  };

  const canLoad = !!className && !!section && (!isAdmin || !!schoolName);

  const visible = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.roll_no.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q),
    );
  }, [roster, search]);

  return (
    <div className="space-y-6">
      <FilterBar
        title="Find a class"
        icon={<Users className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => loadMutation.mutate()}
            loading={loadMutation.isPending}
            disabled={!canLoad}
            icon={<Users className="h-4 w-4" />}
          >
            Load Students
          </Button>
        }
      >
        <Alert variant="warning" title="Destructive actions">
          Deletions are permanent and audit-logged. Double-check the roll number
          before removing a student.
        </Alert>
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
            label="Class"
            placeholder={schoolId ? "Select class" : "Select a school first"}
            options={classNameOptions}
            value={className}
            disabled={isAdmin && !schoolId}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection("");
              setRoster(null);
            }}
          />
          {sectionOptions.length > 0 ? (
            <Select
              label="Section"
              placeholder="Select section"
              options={sectionOptions}
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          ) : (
            <Input
              label="Section"
              placeholder="A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          )}
          <Select
            label="Session"
            options={SESSION_OPTIONS}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
        </div>
      </FilterBar>

      {roster && (
        <Panel
          flush
          icon={<Users className="h-4 w-4" />}
          title="Enrolled students"
          description={
            className && section ? `Class ${className}-${section}` : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{roster.length} enrolled</Badge>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search roll or name…"
                className="w-full sm:w-56"
              />
            </div>
          }
        >
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Users className="h-9 w-9" />}
                title="No students match your search"
                description="Try a different roll number or name."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {visible.map((s) => (
                <li
                  key={s.roll_no}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s.name ?? s.roll_no} seed={s.roll_no} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.name ?? s.roll_no}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Roll #{s.roll_no}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={
                      deleteMutation.isPending &&
                      deleteMutation.variables === s.roll_no
                    }
                    onClick={() => confirmDelete(s)}
                    icon={<Trash2 className="h-4 w-4 text-destructive" />}
                    className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
