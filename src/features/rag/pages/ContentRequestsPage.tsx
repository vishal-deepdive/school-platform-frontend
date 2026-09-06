import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Inbox, Plus, BookPlus, User, Clock } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Select } from "@/shared/components/ui/Select";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Panel } from "@/shared/components/ui/Panel";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Textarea } from "@/shared/components/ui/Textarea";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { isStaff, isSchoolAdmin } from "@/shared/lib/permissions";
import {
  useContentRequests,
  useCreateContentRequest,
  useUpdateContentRequest,
} from "@/features/rag/hooks/useRag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import type {
  ContentRequestItem,
  ContentRequestStatus,
  RagFilters,
} from "@/features/rag/types";

const TABS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "all", label: "All" },
];

const STATUS_META: Record<
  ContentRequestStatus,
  { label: string; variant: "warning" | "info" | "success" | "default" }
> = {
  open: { label: "Open", variant: "warning" },
  in_progress: { label: "In progress", variant: "info" },
  fulfilled: { label: "Fulfilled", variant: "success" },
  dismissed: { label: "Dismissed", variant: "default" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "dismissed", label: "Dismissed" },
];

import { Skeleton, ListSkeleton } from "@/shared/components/ui/Skeleton";

function ContentRequestsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3 sm:px-6">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-24" />
        </div>
        <ListSkeleton items={5} />
      </div>
    </div>
  );
}

export function ContentRequestsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = isSchoolAdmin(role);

  const [tab, setTab] = useState("open");
  const status = tab === "all" ? undefined : (tab as ContentRequestStatus);
  const { data, isLoading, isError, error } = useContentRequests(status);

  const [createOpen, setCreateOpen] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["rag", "contentRequests"] });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Inbox className="h-4 w-4" />
          {data ? `${data.open_count} open request${data.open_count === 1 ? "" : "s"}` : "Loading…"}
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Request content
        </Button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <ContentRequestsSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookPlus className="h-12 w-12" />}
          title="No requests here"
          description={
            isStaff(role)
              ? "Flag a chapter that's missing from the library and it'll show up here for the team to fill."
              : "No content requests to show."
          }
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Request content
            </Button>
          }
        />
      ) : (
        <Panel flush icon={<Inbox className="h-4 w-4" />} title="Requests">
          <ul className="divide-y divide-border/50">
            {items.map((r) => (
              <RequestRow key={r.id} item={r} canManage={canManage} onChanged={refresh} />
            ))}
          </ul>
        </Panel>
      )}

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          refresh();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function RequestRow({
  item,
  canManage,
  onChanged,
}: {
  item: ContentRequestItem;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { mutate: update, isPending } = useUpdateContentRequest();
  const meta = STATUS_META[item.status];
  const label =
    [item.class_level, item.subject, item.chapter_name].filter(Boolean).join(" · ") ||
    "General request";

  const changeStatus = (next: string) => {
    update(
      { id: item.id, status: next as ContentRequestStatus },
      {
        onSuccess: () => {
          toast.success("Request updated.");
          onChanged();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{label}</p>
          {item.medium && (
            <Badge variant={item.medium === "Hindi" ? "purple" : "info"}>
              {item.medium}
            </Badge>
          )}
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        {item.note && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.note}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {item.requested_by_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {item.requested_by_name}
            </span>
          )}
          {item.created_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDate(item.created_at)}
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <div className="shrink-0">
          <Select
            options={STATUS_OPTIONS}
            value={item.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={isPending}
            aria-label="Update status"
          />
        </div>
      )}
    </li>
  );
}

function CreateRequestModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [filters, setFilters] = useState<RagFilters>({});
  const [note, setNote] = useState("");
  const { mutate: create, isPending } = useCreateContentRequest();

  const canSubmit =
    !!filters.class_level || !!filters.subject || !!filters.chapter_name?.length || !!note.trim();

  const submit = () => {
    create(
      {
        class_level: filters.class_level,
        subject: filters.subject,
        chapter_name: filters.chapter_name?.[0],
        medium: filters.medium,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Request submitted.");
          setFilters({});
          setNote("");
          onCreated();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request content"
      description="Tell the team which chapter or topic is missing from the library."
      icon={<BookPlus className="h-5 w-5" />}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isPending} disabled={!canSubmit} onClick={submit}>
            Submit request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <RagFilterPanel
          filters={filters}
          onChange={setFilters}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        />
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. We need the NCERT Class 9 Science chapter on Sound — students keep asking."
          rows={3}
        />
      </div>
    </Modal>
  );
}
