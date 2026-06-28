import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, FileVideo } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { canManageRecordings, canUploadRecordings } from "@/shared/lib/permissions";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { Pagination } from "@/shared/components/ui/Pagination";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage } from "@/shared/lib/utils";
import {
  useRecordingsList,
  useDeleteRecording,
  useRetryRecording,
  useDownloadRecording,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";
import { RecordingListItem } from "@/features/recording/components/RecordingListItem";

const PAGE_SIZE = 10;

export function RecordingsListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canManageRecordings(role);
  const canUpload = canUploadRecordings(role);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useRecordingsList(
    PAGE_SIZE,
    offset,
  );
  const preview = useRecordingPreview();
  const { mutate: deleteRec, isPending: deleting } = useDeleteRecording();
  const { mutate: retryRec, isPending: retrying } = useRetryRecording();
  const { mutate: download } = useDownloadRecording();

  const total = data?.total ?? 0;
  const pagedRecordings = data?.recordings ?? [];

  // Server-driven pagination: the API returns only the current page, so we
  // derive page info from the reported total and step `offset` by PAGE_SIZE.
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;
  const goNext = () => setOffset((o) => o + PAGE_SIZE);
  const goPrev = () => setOffset((o) => Math.max(0, o - PAGE_SIZE));

  if (isLoading) return <PageSpinner />;
  if (isError) return <Alert variant="error">{getErrorMessage(error) || "Failed to load recordings."}</Alert>;

  return (
    <div className="space-y-6">
      <Card padding="none">
        <CardHeader
          title="All Recordings"
          description={`${total} recording(s) total`}
          className="px-6 pt-6"
          bordered
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          }
        />
        {pagedRecordings.length === 0 ? (
          <EmptyState
            className="py-10 border-0 rounded-none"
            icon={<FileVideo className="h-10 w-10" />}
            title="No recordings yet"
            description="Recordings will appear here once they have been uploaded and processed."
            action={
              canUpload ? (
                <Link
                  to="/recording/upload"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Upload your first recording →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {pagedRecordings.map((rec) => (
              <RecordingListItem
                key={rec.id}
                recording={rec}
                canManage={canManage}
                onPreview={preview.open}
                onDownload={download}
                onRetry={retryRec}
                onDelete={setConfirmDelete}
                retrying={retrying}
              />
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}
