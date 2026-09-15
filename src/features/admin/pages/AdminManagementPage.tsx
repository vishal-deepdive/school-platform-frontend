import { useId, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { useAuthStore } from "@/features/auth/store/auth";
import { emailField, passwordField } from "@/shared/lib/validators";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Avatar } from "@/shared/components/ui/Avatar";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
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
  onRemove: (admin: AdminUser) => void;
  removing: boolean;
}) {
  const isSelf = admin.id === currentUserId;
  const isMyCreator = currentUserCreatedBy === admin.id;
  const canRemove = !isSelf && !isMyCreator;

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={admin.full_name || admin.email} seed={admin.id} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {admin.full_name || admin.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          <p className="truncate text-xs text-muted-foreground/70">
            {admin.created_by_name ? `Added by ${admin.created_by_name}` : "Bootstrap admin"}
            {admin.created_at ? ` · ${formatDate(admin.created_at)}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSelf && <Badge variant="primary">You</Badge>}
        {isMyCreator && !isSelf && <Badge variant="default">Your creator</Badge>}
        {canRemove && (
          <ActionMenu
            label={`Actions for ${admin.full_name || admin.email}`}
            items={[
              {
                label: "Remove admin",
                icon: <Trash2 />,
                danger: true,
                disabled: removing,
                onSelect: () => onRemove(admin),
              },
            ]}
          />
        )}
      </div>
    </li>
  );
}

export function AdminManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const formId = useId();
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);

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
    setAdminToRemove(null);
    setRemoveError(null);
    setRemovingId(id);
    removeMutation.mutate(id);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    reset();
  };

  const currentAdminRecord = admins?.find((a) => a.id === user?.id);
  const currentUserCreatedBy = currentAdminRecord?.created_by ?? null;

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
          Add<span className="hidden sm:inline">&nbsp;admin</span>
        </Button>
      </ModuleHeaderActions>

      {removeError && <Alert variant="error">{removeError}</Alert>}
      {adminsError && (
        <Alert variant="error">
          {getErrorMessage(adminsQueryError) || "Failed to load admins."}
        </Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={5} />
      ) : (
        !adminsError &&
        admins && (
          <>
            <StatLine
              items={[
                {
                  value: admins.length,
                  label: admins.length === 1 ? "platform admin" : "platform admins",
                  icon: <ShieldCheck />,
                },
              ]}
            />
            <Panel flush>
              <ul className="divide-y divide-border/50">
                {admins.map((admin) => (
                  <AdminRow
                    key={admin.id}
                    admin={admin}
                    currentUserId={user?.id}
                    currentUserCreatedBy={currentUserCreatedBy}
                    onRemove={setAdminToRemove}
                    removing={removingId === admin.id && removeMutation.isPending}
                  />
                ))}
              </ul>
            </Panel>
          </>
        )
      )}

      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title="Add platform admin"
        description="Platform admins can see and manage every school."
        icon={<ShieldCheck className="h-5 w-5" />}
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={createMutation.isPending}>
              Create admin
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <Input label="Full name" placeholder="Jane Doe" hint="Optional" {...register("full_name")} />
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
            <Alert variant="error">{getErrorMessage(createMutation.error)}</Alert>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={adminToRemove !== null}
        title="Remove admin?"
        description={
          adminToRemove && (
            <>
              <span className="font-medium text-foreground">
                {adminToRemove.full_name || adminToRemove.email}
              </span>{" "}
              will immediately lose all platform admin access. They can only be re-added by another
              admin.
            </>
          )
        }
        confirmLabel="Remove admin"
        loading={removeMutation.isPending}
        onConfirm={() => adminToRemove && handleRemove(adminToRemove.id)}
        onClose={() => setAdminToRemove(null)}
      />
    </div>
  );
}
