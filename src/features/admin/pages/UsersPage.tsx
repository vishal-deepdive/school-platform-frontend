/**
 * Platform-admin User directory. Search and filter every user across the
 * platform by school, role, and active status; deactivate / reactivate a
 * non-admin account or force-logout (revoke sessions). Admin accounts are
 * managed on the dedicated Manage Admins page.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, LogOut, UserX, UserCheck } from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { usePendingKeys } from "@/shared/hooks/usePendingKeys";
import type { AdminUserListItem } from "@/features/admin/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { Tooltip } from "@/shared/components/ui/Tooltip";

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

type PendingAction = {
  user: AdminUserListItem;
  action: "deactivate" | "revoke";
} | null;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<PendingAction>(null);

  const {
    setQuery: setSchoolQuery,
    options: schoolOptions,
    isSearching,
  } = useSchoolSearch();

  // Any filter change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [role, status, schoolId, debouncedSearch]);

  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["admin", "users", { role, status, schoolId, debouncedSearch, offset }],
    queryFn: () =>
      adminApi.listUsers({
        role: role || undefined,
        status: (status || undefined) as "active" | "inactive" | undefined,
        school_id: schoolId || undefined,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = data?.items ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

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

  const schoolFilterOptions = [
    { label: "All schools", value: "" },
    ...schoolOptions,
  ];

  return (
    <div className="space-y-6">
      <FilterBar hideHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, roll…"
          />
          <Select
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Filter by role"
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          />
          <SearchableSelect
            options={schoolFilterOptions}
            value={schoolId}
            onChange={setSchoolId}
            onSearchChange={setSchoolQuery}
            isLoading={isSearching}
            placeholder="All schools"
            searchPlaceholder="Search schools…"
          />
        </div>
      </FilterBar>

      {error && (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load users."}</Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={8} />
      ) : (
        <Panel
          flush
          icon={<UsersIcon className="h-4 w-4" />}
          title="Platform users"
          actions={<Badge variant="primary">{total} total</Badge>}
        >
          {users.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title="No users found"
                description="Adjust the filters to widen your search."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                <tbody className="divide-y divide-border/30">
                  {users.map((u) => {
                    const busy = rowPending.has(u.id);
                    const isAdmin = u.role === "admin";
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={u.full_name || u.email}
                              seed={u.id}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {u.full_name || "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {u.email}
                                {u.roll_number ? ` · Roll ${u.roll_number}` : ""}
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
                        <td className="px-4 py-3 text-right">
                          {isAdmin ? (
                            <Link
                              to="/admin/admins"
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Manage Admins
                            </Link>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {u.is_active && (
                                <Tooltip content="Revoke sessions (force logout)" side="top">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    icon={<LogOut className="h-4 w-4" />}
                                    onClick={() => setConfirm({ user: u, action: "revoke" })}
                                    aria-label="Revoke sessions (force logout)"
                                  >
                                    <span className="sr-only">Revoke sessions</span>
                                  </Button>
                                </Tooltip>
                              )}
                              {u.is_active ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  loading={deactivate.isPending && deactivate.variables === u.id}
                                  icon={<UserX className="h-4 w-4 text-destructive" />}
                                  onClick={() => setConfirm({ user: u, action: "deactivate" })}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  Deactivate
                                </Button>
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
                          )}
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
                hasPrev={page > 1}
                hasNext={page < totalPages && !isPlaceholderData}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          )}
        </Panel>
      )}

      <ConfirmDialog
        open={!!confirm}
        variant="danger"
        title={
          confirm?.action === "deactivate"
            ? `Deactivate ${confirm?.user.full_name || confirm?.user.email}?`
            : `Revoke sessions for ${confirm?.user.full_name || confirm?.user.email}?`
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
