import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { useAuthStore } from "@/features/auth/store/auth";
import { emailField, passwordField } from "@/shared/lib/validators";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
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
    <li className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={admin.full_name || admin.email} seed={admin.id} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {admin.full_name || admin.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          <p className="truncate text-xs text-muted-foreground/70">
            {admin.created_by_name
              ? `Added by ${admin.created_by_name}`
              : "Bootstrap admin"}
            {admin.created_at ? ` · ${formatDate(admin.created_at)}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSelf && <Badge variant="primary">You</Badge>}
        {isMyCreator && !isSelf && <Badge variant="default">Your creator</Badge>}
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(admin.id)}
            disabled={removing}
            loading={removing}
            icon={
              !removing ? (
                <Trash2 className="h-4 w-4 text-destructive" />
              ) : undefined
            }
            className="text-destructive opacity-0 transition-opacity hover:text-destructive/80 focus-visible:opacity-100 group-hover:opacity-100"
          >
            Remove
          </Button>
        )}
      </div>
    </li>
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
      {removeError && <Alert variant="error">{removeError}</Alert>}
      {adminsError && <Alert variant="error">{getErrorMessage(adminsQueryError) || "Failed to load admins."}</Alert>}

      {isLoading && <ListSkeleton items={5} />}

      {!isLoading && !adminsError && admins && (
        <Panel
          flush
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Platform admins"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="primary">{admins.length} total</Badge>
              <Button
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowAddModal(true)}
              >
                Add Admin
              </Button>
            </div>
          }
        >
          <ul className="divide-y divide-border/50">
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
          </ul>
        </Panel>
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
