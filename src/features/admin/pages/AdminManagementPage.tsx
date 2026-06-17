import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/features/admin/api/admin";
import { useAuthStore } from "@/features/auth/store/auth";
import { emailField, passwordField } from "@/shared/lib/validators";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import type { AdminUser } from "@/features/admin/types";

const createAdminSchema = z.object({
  email: emailField,
  password: passwordField,
  full_name: z.string().max(255).optional(),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

function AdminRow({
  admin,
  currentUserId,
  currentUserCreatedBy,
  onRemove,
  removing,
}: {
  admin: AdminUser;
  currentUserId: string | undefined;
  currentUserCreatedBy: string | null | undefined;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const isSelf = admin.id === currentUserId;
  const isMyCreator = currentUserCreatedBy === admin.id;
  const canRemove = !isSelf && !isMyCreator;

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4">
        <p className="font-medium text-foreground">{admin.full_name || "—"}</p>
        <p className="text-xs text-muted-foreground">{admin.email}</p>
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {admin.created_by_name ? (
          <div>
            <p>{admin.created_by_name}</p>
            <p className="text-xs text-muted-foreground/70">{admin.created_by_email}</p>
          </div>
        ) : (
          <span className="text-muted-foreground/70 italic">Bootstrap admin</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {admin.created_at ? formatDate(admin.created_at) : "—"}
      </td>
      <td className="px-6 py-4 text-right">
        {isSelf && <span className="text-xs text-muted-foreground/70 italic">You</span>}
        {isMyCreator && !isSelf && (
          <span className="text-xs text-muted-foreground/70 italic">Your creator</span>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove(admin.id)}
            disabled={removing}
            className="text-sm font-medium text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

export function AdminManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const {
    data: admins,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admins"],
    queryFn: () => adminApi.listAdmins(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminForm) => adminApi.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setShowAddModal(false);
      reset();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.removeAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setRemovingId(null);
      setRemoveError(null);
    },
    onError: (err) => {
      setRemoveError(getErrorMessage(err));
      setRemovingId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminForm>({ resolver: zodResolver(createAdminSchema) });

  const handleRemove = (id: string) => {
    setRemoveError(null);
    setRemovingId(id);
    removeMutation.mutate(id);
  };

  const currentAdminRecord = admins?.find((a) => a.id === user?.id);
  const currentUserCreatedBy = currentAdminRecord?.created_by ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage platform admin accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Add Admin
        </button>
      </div>

      {removeError && <Alert variant="error">{removeError}</Alert>}
      {error && <Alert variant="error">Failed to load admins.</Alert>}

      {isLoading && <PageSpinner />}

      {!isLoading && admins && (
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Added On
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {admins.map((admin) => (
                <AdminRow
                  key={admin.id}
                  admin={admin}
                  currentUserId={user?.id}
                  currentUserCreatedBy={currentUserCreatedBy}
                  onRemove={handleRemove}
                  removing={removingId === admin.id && removeMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          reset();
        }}
        title="Add Platform Admin"
        size="sm"
      >
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Full Name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              {...register("full_name")}
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password <span className="text-destructive">*</span>
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="Min 8 chars, mixed case + number + symbol"
              className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {createMutation.isError && (
            <Alert variant="error">
              {getErrorMessage(createMutation.error)}
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                reset();
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {createMutation.isPending ? "Creating…" : "Create Admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
