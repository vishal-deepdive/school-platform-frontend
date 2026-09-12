import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileVideo, RotateCcw, SearchX, Trash2 } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { canManageRecordings, canUploadRecordings } from "@/shared/lib/permissions";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterToolbar } from "@/shared/components/ui/FilterToolbar";
import { Input } from "@/shared/components/ui/Input";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import { useMyChildren } from "@/features/attendance/hooks/useMyChildren";
import { ChildSelector } from "@/features/attendance/components/ChildSelector";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import {
  useRecordingsList,
  useDeleteRecording,
  useBulkDeleteRecordings,
  useBulkRetryRecordings,
  useRetryRecording,
  useDownloadRecording,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";
import { RecordingListItem } from "@/features/recording/components/RecordingListItem";
import type { RecordingListQuery, RecordingSortBy } from "@/features/recording/types";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "date:desc", label: "Recording date (newest)" },
  { value: "class:asc", label: "Class (A–Z)" },
  { value: "subject:asc", label: "Subject (A–Z)" },
  { value: "duration_seconds:desc", label: "Longest" },
  { value: "file_size_bytes:desc", label: "Largest file" },
];
const DEFAULT_SORT = "created_at:desc";

const URL_DEFAULTS: {
  class: string;
  section: string;
  subject: string;
  topic: string;
  date: string;
  sort: string;
  page: number;
} = { class: "", section: "", subject: "", topic: "", date: "", sort: DEFAULT_SORT, page: 1 };

export function RecordingsListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const canManage = canManageRecordings(role);
  const canUpload = canUploadRecordings(role);
  const myChildren = useMyChildren();

  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);
  const sort = SORT_OPTIONS.some((o) => o.value === state.sort) ? state.sort : DEFAULT_SORT;

  // Free-text filters are typed locally and committed to the URL once typing pauses.
  const [topic, setTopic] = useUrlSearch(state.topic, (v) => update({ topic: v }));
  const [subject, setSubject] = useUrlSearch(state.subject, (v) => update({ subject: v }));
  const [classText, setClassText] = useUrlSearch(state.class, (v) =>
    update({ class: v, section: "" }),
  );
  const [sectionText, setSectionText] = useUrlSearch(state.section, (v) =>
    update({ section: v }),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = state.class ? getSectionOptions(state.class) : [];
  const hasClassConfig = classNameOptions.length > 0;

  // Class/section belong to the previously active school.
  const lastSchool = useRef(schoolId);
  useEffect(() => {
    if (lastSchool.current === schoolId) return;
    lastSchool.current = schoolId;
    update({ class: "", section: "" });
  }, [schoolId, update]);

  // A different child (parent view) is a different class scope — back to page 1.
  const lastChild = useRef(myChildren.selectedRoll);
  useEffect(() => {
    if (lastChild.current === myChildren.selectedRoll) return;
    lastChild.current = myChildren.selectedRoll;
    update({ page: 1 });
  }, [myChildren.selectedRoll, update]);

  const [sortBy, order] = sort.split(":") as [RecordingSortBy, "asc" | "desc"];
  const query: RecordingListQuery = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    class: state.class || undefined,
    section: state.section || undefined,
    subject: state.subject || undefined,
    recording_subject: state.topic || undefined,
    date: state.date || undefined,
    school_name: isAdmin ? schoolName || undefined : undefined,
    sort_by: sortBy,
    order,
    roll_no: myChildren.isParent ? myChildren.selectedRoll ?? undefined : undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData, isSuccess } =
    useRecordingsList(query);
  const preview = useRecordingPreview();
  const { mutate: deleteRec, isPending: deleting } = useDeleteRecording();
  const { mutate: retryRec, isPending: retrying } = useRetryRecording();
  const { mutate: bulkDelete, isPending: bulkDeleting } = useBulkDeleteRecordings();
  const { mutate: bulkRetry, isPending: bulkRetrying } = useBulkRetryRecordings();
  const { mutate: download } = useDownloadRecording();

  // Any change to what's listed invalidates the current selection.
  const listKey = JSON.stringify(query);
  useEffect(() => {
    setSelected(new Set());
  }, [listKey]);

  const total = data?.total ?? 0;
  const recordings = data?.recordings ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Deleting the last row of the last page shouldn't strand the user on an empty page.
  useEffect(() => {
    if (page > totalPages && isSuccess && !isPlaceholderData) update({ page: totalPages });
  }, [page, totalPages, isSuccess, isPlaceholderData, update]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOnPageSelected = recordings.length > 0 && recordings.every((r) => selected.has(r.id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) recordings.forEach((r) => next.delete(r.id));
      else recordings.forEach((r) => next.add(r.id));
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const selectedIds = Array.from(selected);

  const hasFilters = Boolean(
    state.class || state.section || state.subject || state.topic || state.date || sort !== DEFAULT_SORT,
  );
  const clearFilters = () => {
    setTopic("");
    setSubject("");
    setClassText("");
    setSectionText("");
    update({ class: "", section: "", subject: "", topic: "", date: "", sort: DEFAULT_SORT });
  };

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh recordings"
        />
        {canUpload && (
          <Button asChild size="sm">
            <Link to="/recording/upload">
              <FileVideo className="h-4 w-4" />
              New recording
            </Link>
          </Button>
        )}
      </ModuleHeaderActions>

      {myChildren.showSelector && (
        <ChildSelector
          childrenList={myChildren.children}
          value={myChildren.selectedRoll}
          onChange={myChildren.setSelectedRoll}
        />
      )}

      <FilterToolbar
        hasFilters={hasFilters}
        onClear={clearFilters}
        moreCount={(state.subject ? 1 : 0) + (state.date ? 1 : 0)}
        more={
          <>
            <Input
              label="Subject"
              placeholder="e.g. Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <DatePicker
              label="Recording date"
              value={state.date || undefined}
              onChange={(iso) => update({ date: iso ?? "" })}
            />
          </>
        }
        end={
          <StatLine
            loading={isLoading}
            items={[{ value: total, label: total === 1 ? "recording" : "recordings" }]}
          />
        }
      >
        <SearchInput
          value={topic}
          onChange={setTopic}
          placeholder="Search topics…"
          aria-label="Search by topic"
          className="w-full sm:w-60"
        />
        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          {hasClassConfig ? (
            <Select
              aria-label="Class"
              options={[{ value: "", label: "All classes" }, ...classNameOptions]}
              value={state.class}
              onChange={(e) => update({ class: e.target.value, section: "" })}
            />
          ) : (
            <Input
              aria-label="Class"
              placeholder="Class"
              value={classText}
              onChange={(e) => setClassText(e.target.value)}
            />
          )}
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          {hasClassConfig ? (
            <Select
              aria-label="Section"
              options={[{ value: "", label: "All sections" }, ...sectionOptions]}
              value={state.section}
              disabled={!state.class}
              onChange={(e) => update({ section: e.target.value })}
            />
          ) : (
            <Input
              aria-label="Section"
              placeholder="Section"
              value={sectionText}
              onChange={(e) => setSectionText(e.target.value)}
            />
          )}
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Sort by"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
          />
        </div>
      </FilterToolbar>

      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              loading={bulkRetrying}
              onClick={() => bulkRetry(selectedIds, { onSuccess: clearSelection })}
            >
              Retry selected
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmBulk(true)}
            >
              Delete selected
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {isError ? (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load recordings."}</Alert>
      ) : (
        <Panel
          flush
          actions={
            canManage && recordings.length > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
                Select page
              </label>
            ) : undefined
          }
        >
          {isLoading ? (
            <ListSkeleton items={5} />
          ) : recordings.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={hasFilters ? <SearchX className="h-10 w-10" /> : <FileVideo className="h-10 w-10" />}
              title={hasFilters ? "No recordings match" : "No recordings yet"}
              description={
                hasFilters
                  ? "Try a different topic or clear the filters."
                  : "Recorded lectures and their notes will appear here."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : canUpload ? (
                  <Button asChild size="sm">
                    <Link to="/recording/upload">Upload a recording</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul
              className={cn(
                "divide-y divide-border/50 transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
              aria-busy={isPlaceholderData}
            >
              {recordings.map((rec) => (
                <RecordingListItem
                  key={rec.id}
                  recording={rec}
                  canManage={canManage}
                  showSchool={isAdmin && !schoolName}
                  selectable={canManage}
                  selected={selected.has(rec.id)}
                  onToggleSelect={toggleSelect}
                  onPreview={(id) =>
                    void preview.open(
                      id,
                      myChildren.isParent ? myChildren.selectedRoll ?? undefined : undefined,
                    )
                  }
                  onDownload={download}
                  onRetry={retryRec}
                  onDelete={setConfirmDelete}
                  retrying={retrying}
                />
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsLabel="recordings"
        hasNext={page < totalPages && !isPlaceholderData}
        hasPrev={page > 1}
        onNext={() => update({ page: page + 1 })}
        onPrev={() => update({ page: page - 1 })}
      />

      <MarkdownPreviewModal open={!!preview.previewId} onClose={preview.close} result={preview.result} />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this recording?"
        description="The recording and its generated notes will be removed. This can't be undone."
        confirmLabel="Delete recording"
        loading={deleting}
        onConfirm={() =>
          confirmDelete && deleteRec(confirmDelete, { onSuccess: () => setConfirmDelete(null) })
        }
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulk}
        title={`Delete ${selected.size} ${selected.size === 1 ? "recording" : "recordings"}?`}
        description="The selected recordings and their generated notes will be removed. This can't be undone."
        confirmLabel="Delete selected"
        loading={bulkDeleting}
        onConfirm={() =>
          bulkDelete(selectedIds, {
            onSuccess: () => {
              clearSelection();
              setConfirmBulk(false);
            },
          })
        }
        onClose={() => setConfirmBulk(false)}
      />
    </div>
  );
}
