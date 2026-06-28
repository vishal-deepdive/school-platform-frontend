import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { useAuthStore } from "@/features/auth/store/auth";
import { emailField, passwordField } from "@/shared/lib/validators";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(admin.id)}
            disabled={removing}
            className="text-destructive hover:text-destructive/80"
          >
            Remove
          </Button>
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
    isError: adminsError,
    error: adminsQueryError,
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
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
          Add Admin
        </Button>
      </div>

      {removeError && <Alert variant="error">{removeError}</Alert>}
      {adminsError && <Alert variant="error">{getErrorMessage(adminsQueryError) || "Failed to load admins."}</Alert>}

      {isLoading && <PageSpinner />}

      {!isLoading && !adminsError && admins && (
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
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            hint="Optional"
            {...register("full_name")}
          />

          <Input
            label="Email"
            type="email"
            placeholder="admin@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Min 8 chars, mixed case + number + symbol"
            error={errors.password?.message}
            {...register("password")}
          />

          {createMutation.isError && (
            <Alert variant="error">
              {getErrorMessage(createMutation.error)}
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowAddModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
