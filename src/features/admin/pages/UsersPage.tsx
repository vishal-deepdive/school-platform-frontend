/**
 * Platform-admin User directory. Search and filter every user across the
 * platform by school, role, and active status; deactivate / reactivate a
 * non-admin account or force-logout (revoke sessions). Admin accounts are
 * managed on the dedicated Manage Admins page.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Users as UsersIcon, UserCheck, UserX } from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { usePendingKeys } from "@/shared/hooks/usePendingKeys";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import type { AdminUserListItem } from "@/features/admin/types";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FilterToolbar } from "@/shared/components/ui/FilterToolbar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { StatLine } from "@/shared/components/ui/StatLine";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_BADGE: Record<string, BadgeVariant> = {
  admin: "indigo",
  principal: "purple",
  teacher: "info",
  student: "success",
  parent: "warning",
};

const PAGE_SIZE = 25;

// `schoolName` rides along in the URL purely so the school filter can show its
// label after a refresh, when the search-backed options list is empty.
const URL_DEFAULTS: {
  q: string;
  role: string;
  status: string;
  school: string;
  schoolName: string;
  page: number;
} = { q: "", role: "", status: "", school: "", schoolName: "", page: 1 };

type PendingAction = {
  user: AdminUserListItem;
  action: "deactivate" | "revoke";
} | null;

/** Best available label for a user — guardian (mobile-only) and managed
 * student (no contact on file) accounts can have a null email. */
function userLabel(u: AdminUserListItem): string {
  return (
    u.full_name || u.email || u.mobile || (u.roll_number ? `Roll ${u.roll_number}` : "this user")
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);
  const [search, setSearch] = useUrlSearch(state.q, (q) => update({ q }), 400);
  const [confirm, setConfirm] = useState<PendingAction>(null);

  const { setQuery: setSchoolQuery, options: schoolOptions, isSearching } = useSchoolSearch();

  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: [
      "admin",
      "users",
      { role: state.role, status: state.status, schoolId: state.school, search: state.q, offset },
    ],
    queryFn: () =>
      adminApi.listUsers({
        role: state.role || undefined,
        status: (state.status || undefined) as "active" | "inactive" | undefined,
        school_id: state.school || undefined,
        search: state.q || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  // Shared across all three row actions so a row's buttons disable together
  // no matter which one is in flight for it, and clicking a different row
  // mid-action can't make this row appear idle again (see usePendingKeys).
  const rowPending = usePendingKeys();

  const deactivate = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onMutate: (id) => rowPending.start(id),
    onSettled: (_data, _err, id) => rowPending.finish(id),
    onSuccess: (res) => {
      toast.success(res.message ?? "User deactivated");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => adminApi.reactivateUser(id),
    onMutate: (id) => rowPending.start(id),
    onSettled: (_data, _err, id) => rowPending.finish(id),
    onSuccess: (res) => {
      toast.success(res.message ?? "User reactivated");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.revokeUserSessions(id),
    onMutate: (id) => rowPending.start(id),
    onSettled: (_data, _err, id) => rowPending.finish(id),
    onSuccess: (res) => {
      toast.success(res.message ?? "Sessions revoked");
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const runConfirmed = () => {
    if (!confirm) return;
    if (confirm.action === "deactivate") deactivate.mutate(confirm.user.id);
    else revoke.mutate(confirm.user.id);
    setConfirm(null);
  };

  const schoolFilterOptions = useMemo(() => {
    const base = [{ label: "All schools", value: "" }, ...schoolOptions];
    if (state.school && state.schoolName && !base.some((o) => o.value === state.school)) {
      base.push({ label: state.schoolName, value: state.school });
    }
    return base;
  }, [schoolOptions, state.school, state.schoolName]);

  const hasFilters = Boolean(state.q || state.role || state.status || state.school);
  const clearFilters = () => {
    setSearch("");
    update({ q: "", role: "", status: "", school: "", schoolName: "" });
  };

  return (
    <div className="space-y-4">
      <FilterToolbar
        hasFilters={hasFilters}
        onClear={clearFilters}
        end={
          <StatLine
            loading={isLoading}
            items={[{ value: total, label: total === 1 ? "user" : "users" }]}
          />
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, roll…"
          aria-label="Search users"
          className="w-full sm:w-64"
        />
        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          <Select
            options={ROLE_OPTIONS}
            value={state.role}
            onChange={(e) => update({ role: e.target.value })}
            aria-label="Filter by role"
          />
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          <Select
            options={STATUS_OPTIONS}
            value={state.status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
          />
        </div>
        <div className="w-full sm:w-56">
          <SearchableSelect
            options={schoolFilterOptions}
            value={state.school}
            onChange={(value) => {
              const option = schoolOptions.find((o) => o.value === value);
              update({ school: value, schoolName: option?.label ?? "" });
            }}
            onSearchChange={setSchoolQuery}
            isLoading={isSearching}
            placeholder="All schools"
            searchPlaceholder="Search schools…"
          />
        </div>
      </FilterToolbar>

      {error && (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load users."}</Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={8} />
      ) : (
        <Panel flush>
          {users.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<UsersIcon className="h-10 w-10" />}
              title="No users found"
              description="Adjust the filters to widen your search."
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto" aria-busy={isPlaceholderData}>
              <table className="min-w-full divide-y divide-border/50">
                <thead className="bg-muted/50">
                  <tr>
                    {["User", "Role", "School", "Status", ""].map((h, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={isPlaceholderData ? "divide-y divide-border/30 opacity-60" : "divide-y divide-border/30"}>
                  {users.map((u) => {
                    const busy = rowPending.has(u.id);
                    const isAdmin = u.role === "admin";
                    // Guardian (mobile-only) and managed student (no contact
                    // on file) accounts can have a null email — fall back to
                    // whatever identifier is actually available.
                    const primaryIdentifier =
                      u.email || u.mobile || (u.roll_number ? `Roll ${u.roll_number}` : "—");
                    const showRollSuffix = !!u.roll_number && (!!u.email || !!u.mobile);
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={userLabel(u)} seed={u.id} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {u.full_name || "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {primaryIdentifier}
                                {showRollSuffix ? ` · Roll ${u.roll_number}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_BADGE[u.role] ?? "default"} className="capitalize">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {u.school_name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.is_active ? "success" : "default"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {u.created_at && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              Joined {formatDate(u.created_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin ? (
                              <Link
                                to="/admin/admins"
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                Manage admins
                              </Link>
                            ) : u.is_active ? (
                              <ActionMenu
                                label={`Actions for ${userLabel(u)}`}
                                items={[
                                  {
                                    label: "Revoke sessions",
                                    icon: <LogOut />,
                                    disabled: busy,
                                    onSelect: () => setConfirm({ user: u, action: "revoke" }),
                                  },
                                  {
                                    label: "Deactivate account",
                                    icon: <UserX />,
                                    danger: true,
                                    disabled: busy,
                                    onSelect: () => setConfirm({ user: u, action: "deactivate" }),
                                  },
                                ]}
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                loading={reactivate.isPending && reactivate.variables === u.id}
                                icon={<UserCheck className="h-4 w-4" />}
                                onClick={() => reactivate.mutate(u.id)}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="border-t border-border/60 px-4 py-3 md:px-5">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsLabel="users"
                hasPrev={page > 1}
                hasNext={page < totalPages && !isPlaceholderData}
                onPrev={() => update({ page: page - 1 })}
                onNext={() => update({ page: page + 1 })}
              />
            </div>
          )}
        </Panel>
      )}

      <ConfirmDialog
        open={!!confirm}
        variant="danger"
        title={
          confirm
            ? confirm.action === "deactivate"
              ? `Deactivate ${userLabel(confirm.user)}?`
              : `Revoke sessions for ${userLabel(confirm.user)}?`
            : ""
        }
        description={
          confirm?.action === "deactivate"
            ? "The account is disabled and all active sessions are revoked. You can reactivate it later."
            : "The user is signed out of all devices and must log in again. Their account stays active."
        }
        confirmLabel={confirm?.action === "deactivate" ? "Deactivate" : "Revoke sessions"}
        loading={deactivate.isPending || revoke.isPending}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
