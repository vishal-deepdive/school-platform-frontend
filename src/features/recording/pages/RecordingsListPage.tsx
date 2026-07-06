import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, FileVideo, Trash2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { canManageRecordings, canUploadRecordings } from "@/shared/lib/permissions";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { getErrorMessage } from "@/shared/lib/utils";
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

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "date:desc", label: "Recording date (newest)" },
  { value: "class:asc", label: "Class (A–Z)" },
  { value: "subject:asc", label: "Subject (A–Z)" },
  { value: "duration_seconds:desc", label: "Longest" },
  { value: "file_size_bytes:desc", label: "Largest file" },
];

const EMPTY_FILTERS = {
  class: "",
  section: "",
  subject: "",
  recording_subject: "",
  date: "",
};

export function RecordingsListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const canManage = canManageRecordings(role);
  const canUpload = canUploadRecordings(role);

  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState("created_at:desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = filters.class ? getSectionOptions(filters.class) : [];

  // Any filter/sort/page change invalidates the current selection.
  const clearSelection = () => setSelected(new Set());
  const resetView = () => {
    setOffset(0);
    clearSelection();
  };

  // Switching the active school clears class/section filters and resets paging.
  useEffect(() => {
    setFilters((f) => ({ ...f, class: "", section: "" }));
    setOffset(0);
    setSelected(new Set());
  }, [schoolId]);

  const handleClassChange = (className: string) => {
    setFilters((f) => ({ ...f, class: className, section: "" }));
    resetView();
  };
  const setFilterField = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    resetView();
  };
  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setSort("created_at:desc");
    resetView();
  };

  const [sortBy, order] = sort.split(":") as [RecordingSortBy, "asc" | "desc"];
  const query: RecordingListQuery = {
    limit: PAGE_SIZE,
    offset,
    class: filters.class || undefined,
    section: filters.section || undefined,
    subject: filters.subject || undefined,
    recording_subject: filters.recording_subject || undefined,
    date: filters.date || undefined,
    school_name: isAdmin ? schoolName || undefined : undefined,
    sort_by: sortBy,
    order,
  };

  const { data, isLoading, isError, error, refetch, isFetching } =
    useRecordingsList(query);
  const preview = useRecordingPreview();
  const { mutate: deleteRec, isPending: deleting } = useDeleteRecording();
  const { mutate: retryRec, isPending: retrying } = useRetryRecording();
  const { mutate: bulkDelete, isPending: bulkDeleting } = useBulkDeleteRecordings();
  const { mutate: bulkRetry, isPending: bulkRetrying } = useBulkRetryRecordings();
  const { mutate: download } = useDownloadRecording();

  const total = data?.total ?? 0;
  const pagedRecordings = data?.recordings ?? [];

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;
  const goNext = () => {
    setOffset((o) => o + PAGE_SIZE);
    clearSelection();
  };
  const goPrev = () => {
    setOffset((o) => Math.max(0, o - PAGE_SIZE));
    clearSelection();
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOnPageSelected =
    pagedRecordings.length > 0 &&
    pagedRecordings.every((r) => selected.has(r.id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pagedRecordings.forEach((r) => next.delete(r.id));
      else pagedRecordings.forEach((r) => next.add(r.id));
      return next;
    });

  if (isLoading) return <PageSkeleton showStats={false} content="list" />;
  if (isError)
    return (
      <Alert variant="error">
        {getErrorMessage(error) || "Failed to load recordings."}
      </Alert>
    );

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-6">
      <FilterBar
        icon={<SlidersHorizontal className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {total > 0 && <Badge variant="primary">{total} total</Badge>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classNameOptions.length > 0 ? (
            <Select
              label="Class"
              placeholder="All classes"
              options={[{ value: "", label: "All classes" }, ...classNameOptions]}
              value={filters.class}
              onChange={(e) => handleClassChange(e.target.value)}
            />
          ) : (
            <Input
              label="Class"
              placeholder="e.g. 9"
              value={filters.class}
              onChange={(e) => handleClassChange(e.target.value)}
            />
          )}
          {sectionOptions.length > 0 ? (
            <Select
              label="Section"
              placeholder="All sections"
              options={[{ value: "", label: "All sections" }, ...sectionOptions]}
              value={filters.section}
              onChange={(e) => setFilterField("section", e.target.value)}
            />
          ) : (
            <Input
              label="Section"
              placeholder="e.g. A"
              value={filters.section}
              onChange={(e) => setFilterField("section", e.target.value)}
            />
          )}
          <Input
            label="Subject"
            placeholder="e.g. Mathematics"
            value={filters.subject}
            onChange={(e) => setFilterField("subject", e.target.value)}
          />
          <Input
            label="Topic"
            placeholder="e.g. Quadratic Equations"
            value={filters.recording_subject}
            onChange={(e) => setFilterField("recording_subject", e.target.value)}
          />
          <DatePicker
            label="Date"
            value={filters.date}
            onChange={(iso) => setFilterField("date", iso ?? "")}
          />
          <Select
            label="Sort by"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              resetView();
            }}
          />
        </div>
      </FilterBar>

      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
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

      <Panel
        flush
        actions={
          canManage && pagedRecordings.length > 0 ? (
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
        {pagedRecordings.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileVideo className="h-10 w-10" />}
              title="No recordings found"
              description="No recordings match your filters yet. Adjust the filters or upload a new recording."
              action={
                canUpload ? (
                  <Link
                    to="/recording/upload"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Upload a recording →
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {pagedRecordings.map((rec) => (
              <RecordingListItem
                key={rec.id}
                recording={rec}
                canManage={canManage}
                selectable={canManage}
                selected={selected.has(rec.id)}
                onToggleSelect={toggleSelect}
                onPreview={(id) => void preview.open(id)}
                onDownload={download}
                onRetry={retryRec}
                onDelete={setConfirmDelete}
                retrying={retrying}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={goNext}
        onPrev={goPrev}
      />

      <MarkdownPreviewModal
        open={!!preview.previewId}
        onClose={preview.close}
        result={preview.result}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Recording"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this recording? This action cannot be
          undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() =>
              confirmDelete &&
              deleteRec(confirmDelete, {
                onSuccess: () => setConfirmDelete(null),
              })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title={`Delete ${selected.size} recording(s)`}
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete the {selected.size} selected
          recording(s)? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmBulk(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={bulkDeleting}
            onClick={() =>
              bulkDelete(selectedIds, {
                onSuccess: () => {
                  clearSelection();
                  setConfirmBulk(false);
                },
              })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
