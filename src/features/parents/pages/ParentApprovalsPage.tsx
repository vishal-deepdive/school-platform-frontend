import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import toast from "@/shared/lib/toast";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type { PendingParentItem } from "@/features/auth/types";

/**
 * Principal/admin surface to approve or reject parent accounts that are waiting
 * for school approval. Without this, a registered parent can never sign in.
 */
export function ParentApprovalsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["pending-parents"],
    queryFn: authApi.getPendingParents,
  });

  const approve = useMutation({
    mutationFn: (userId: string) => authApi.approveParent(userId),
    onSuccess: (res) => {
      toast.success(res.message ?? "Parent approved");
      queryClient.invalidateQueries({ queryKey: ["pending-parents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reject = useMutation({
    mutationFn: (userId: string) => authApi.rejectParent(userId),
    onSuccess: (res) => {
      toast.success(res.message ?? "Parent rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-parents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const items: PendingParentItem[] = data?.items ?? [];
  const pendingId =
    (approve.isPending && approve.variables) ||
    (reject.isPending && reject.variables) ||
    null;

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{getErrorMessage(error) || "Failed to load pending parents."}</Alert>}

      {isLoading && <ListSkeleton items={4} />}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<UserCheck className="h-10 w-10" />}
          title="No pending parents"
          description="There are no parent accounts awaiting approval right now."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {["Parent", "Child", "Relation", "Requested", ""].map((h, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {items.map((p) => {
                const busy = pendingId === p.parent_id;
                return (
                  <tr key={p.parent_id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {p.parent_name || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.parent_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {p.student_name || "—"}
                      {p.student_roll_no && (
                        <span className="text-muted-foreground">
                          {" "}
                          (Roll {p.student_roll_no})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize text-muted-foreground">
                      {p.relation}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {p.requested_at ? formatDate(p.requested_at) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => approve.mutate(p.parent_id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => reject.mutate(p.parent_id)}
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
