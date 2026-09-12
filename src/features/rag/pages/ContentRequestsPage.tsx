import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookPlus,
  CheckCircle2,
  Clock,
  Library,
  PlayCircle,
  Plus,
  RotateCcw,
  User,
  XCircle,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Textarea } from "@/shared/components/ui/Textarea";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { cn, formatDate, getErrorMessage } from "@/shared/lib/utils";
import { isSchoolAdmin, isStaff } from "@/shared/lib/permissions";
import { useAuthStore } from "@/features/auth/store/auth";
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

type TabId = ContentRequestStatus | "all";
const TAB_IDS: TabId[] = ["open", "in_progress", "fulfilled", "all"];
const URL_DEFAULTS: { status: string } = { status: "open" };

const STATUS_META: Record<
  ContentRequestStatus,
  { label: string; variant: "warning" | "info" | "success" | "default" }
> = {
  open: { label: "Open", variant: "warning" },
  in_progress: { label: "In progress", variant: "info" },
  fulfilled: { label: "Fulfilled", variant: "success" },
  dismissed: { label: "Dismissed", variant: "default" },
};

/** The obvious next step for a request, shown as the row's one visible action. */
const NEXT_STEP: Partial<
  Record<ContentRequestStatus, { status: ContentRequestStatus; label: string; icon: React.ReactNode }>
> = {
  open: { status: "in_progress", label: "Start", icon: <PlayCircle className="h-4 w-4" /> },
  in_progress: {
    status: "fulfilled",
    label: "Mark fulfilled",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

const MOVE_TO: { status: ContentRequestStatus; label: string; icon: React.ReactNode }[] = [
  { status: "open", label: "Reopen", icon: <RotateCcw /> },
  { status: "in_progress", label: "Mark in progress", icon: <PlayCircle /> },
  { status: "fulfilled", label: "Mark fulfilled", icon: <CheckCircle2 /> },
  { status: "dismissed", label: "Dismiss", icon: <XCircle /> },
];

const EMPTY_COPY: Record<TabId, string> = {
  open: "No open requests. When someone flags a missing chapter, it shows up here.",
  in_progress: "Nothing is being worked on right now.",
  fulfilled: "No fulfilled requests yet.",
  all: "No content requests to show.",
  dismissed: "No dismissed requests.",
};

export function ContentRequestsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = isSchoolAdmin(role);

  const [state, update] = useUrlState(URL_DEFAULTS);
  const tab: TabId = (TAB_IDS as string[]).includes(state.status)
    ? (state.status as TabId)
    : "open";
  const status = tab === "all" ? undefined : tab;
  const { data, isLoading, isError, error, isPlaceholderData } = useContentRequests(status);

  const [createOpen, setCreateOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rag", "contentRequests"] });

  const items = data?.items ?? [];
  const tabs = [
    { id: "open", label: "Open", count: data?.open_count },
    { id: "in_progress", label: "In progress" },
    { id: "fulfilled", label: "Fulfilled" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Request content
        </Button>
      </ModuleHeaderActions>

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <Tabs
          size="sm"
          tabs={tabs}
          active={tab}
          onChange={(id) => update({ status: id }, { push: true })}
          className="px-2 md:px-3"
        />
        {isLoading ? (
          <ListSkeleton items={5} />
        ) : items.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<BookPlus className="h-10 w-10" />}
            title="No requests here"
            description={
              isStaff(role) || tab !== "open" ? EMPTY_COPY[tab] : "No content requests to show."
            }
            action={
              tab === "open" ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Request content
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul
              className={cn(
                "divide-y divide-border/50 transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
              aria-busy={isPlaceholderData}
            >
              {items.map((r) => (
                <RequestRow key={r.id} item={r} canManage={canManage} onChanged={refresh} />
              ))}
            </ul>
            {data && data.total > items.length && (
              <p className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground md:px-5">
                Showing the latest {items.length} of {data.total.toLocaleString()} requests.
              </p>
            )}
          </>
        )}
      </section>

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
  const navigate = useNavigate();
  const { mutate: update, isPending } = useUpdateContentRequest();
  const meta = STATUS_META[item.status];
  const label =
    [item.class_level, item.subject, item.chapter_name].filter(Boolean).join(" · ") ||
    "General request";
  const next = NEXT_STEP[item.status];

  const changeStatus = (nextStatus: ContentRequestStatus) => {
    update(
      { id: item.id, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(`Request marked ${STATUS_META[nextStatus].label.toLowerCase()}.`);
          onChanged();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const openInLibrary = () => {
    const params = new URLSearchParams();
    if (item.class_level) params.set("class", item.class_level);
    if (item.subject) params.set("subject", item.subject);
    navigate(`/rag/documents?${params.toString()}`);
  };

  const menuItems: ActionMenuItem[] = [
    {
      label: "Open in Textbook Library",
      icon: <Library />,
      onSelect: openInLibrary,
      hidden: !item.class_level,
    },
    ...MOVE_TO.filter((m) => m.status !== item.status && m.status !== next?.status).map((m) => ({
      label: m.label,
      icon: m.icon,
      disabled: isPending,
      onSelect: () => changeStatus(m.status),
    })),
  ];

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{label}</p>
          {item.medium && (
            <Badge variant={item.medium === "Hindi" ? "purple" : "info"}>{item.medium}</Badge>
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
        <div className="flex shrink-0 items-center gap-1">
          {next && (
            <Button
              variant="outline"
              size="sm"
              icon={next.icon}
              loading={isPending}
              onClick={() => changeStatus(next.status)}
            >
              {next.label}
            </Button>
          )}
          <ActionMenu label={`More actions for ${label}`} items={menuItems} />
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
      size="xl"
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
