import React, { useState } from "react";
import { Plus, Trash2, RefreshCw, FileText, Lock } from "lucide-react";
import toast from "@/shared/lib/toast";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { Pagination } from "@/shared/components/ui/Pagination";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Panel } from "@/shared/components/ui/Panel";
import { Alert } from "@/shared/components/ui/Alert";
import { TableBodySkeleton } from "@/shared/components/ui/Skeleton";
import { getErrorMessage, sortClassesDescending } from "@/shared/lib/utils";
import { SUBJECT_OPTIONS, RAG_OTHER_SUBJECT } from "@/features/rag/constants";
import { useAuthStore } from "@/features/auth/store/auth";
import { isStaff } from "@/shared/lib/permissions";
import {
  useRagDocuments,
  useRagClassLevels,
  useUploadRagDocument,
  useDeleteRagDocument,
  useRetryRagIngest,
  ragKeys,
} from "@/features/rag/hooks/useRag";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const PAGE_SIZE = 50;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const EMPTY_FORM = {
  class_level: "",
  subject: "",
  subject_other: "",
  chapter_number: "",
  chapter_name: "",
  school_id: "",
};

export function RagDocumentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = isStaff(role);
  const isAdmin = role === "admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  // Tracks which row's delete/retry is in flight so only that row spins.
  const [pendingRow, setPendingRow] = useState<{
    id: string;
    action: "delete" | "retry";
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: classData } = useRagClassLevels();
  const sortedClasses = sortClassesDescending(classData?.class_levels ?? []);
  const classOptions = [
    { value: "", label: "Select class" },
    ...sortedClasses.map((c) => ({ value: c, label: c })),
  ];

  // Auto-refresh while any document is still being ingested.
  const { data, isLoading, isError, error, refetch, isFetching } =
    useRagDocuments(
      {
        limit: PAGE_SIZE,
        offset,
        ...(statusFilter && { status: statusFilter }),
      },
      {
        refetchInterval: (query: any) => {
          const items = query.state.data?.items ?? [];
          const stillWorking = items.some(
            (d: { status: string }) =>
              !TERMINAL_STATUSES.has(d.status.toLowerCase()),
          );
          return stillWorking ? 4000 : false;
        },
      },
    );

  const total = data?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  // GET /documents now requires a rag_access grant; surface a clean message
  // instead of the generic "failed to load" error on a 403.
  const isForbidden = isError && isAxiosError(error) && error.response?.status === 403;

  const { mutate: uploadDoc, isPending: isUploading } = useUploadRagDocument();
  const { mutate: deleteDoc } = useDeleteRagDocument();
  const { mutate: retryDoc } = useRetryRagIngest();

  const resolvedSubject =
    formData.subject === RAG_OTHER_SUBJECT
      ? formData.subject_other.trim()
      : formData.subject;

  const submitUpload = (payload: FormData, replace = false) => {
    if (replace) {
      payload.set("replace", "true");
    }
    uploadDoc(payload, {
      onSuccess: () => {
        toast.success("Document uploaded successfully. Ingestion started.");
        setIsModalOpen(false);
        setFile(null);
        setFormData({ ...EMPTY_FORM });
        queryClient.invalidateQueries({ queryKey: ragKeys.all });
      },
      onError: (err) => {
        if (isAxiosError(err) && err.response?.status === 409) {
          const detail = getErrorMessage(err);
          if (
            confirm(
              `${detail}\n\nDo you want to replace the existing document?`,
            )
          ) {
            submitUpload(payload, true);
            return;
          }
          return;
        }
        toast.error(getErrorMessage(err));
      },
    });
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!formData.class_level) {
      toast.error("Please select a class.");
      return;
    }
    if (!resolvedSubject) {
      toast.error("Please select or enter a subject.");
      return;
    }
    if (!formData.chapter_number.trim() || !formData.chapter_name.trim()) {
      toast.error("Chapter number and chapter name are required.");
      return;
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("class_level", formData.class_level);
    payload.append("subject", resolvedSubject);
    payload.append("chapter_number", formData.chapter_number.trim());
    payload.append("chapter_name", formData.chapter_name.trim());
    if (formData.school_id) {
      payload.append("school_id", formData.school_id);
    }

    submitUpload(payload);
  };

  const handleDelete = (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this document? All associated chunks will be removed.",
      )
    )
      return;
    setPendingRow({ id, action: "delete" });
    deleteDoc(id, {
      onSuccess: () => {
        toast.success("Document deleted.");
        queryClient.invalidateQueries({ queryKey: ragKeys.all });
      },
      onError: (err) => toast.error(getErrorMessage(err)),
      onSettled: () => setPendingRow(null),
    });
  };

  const handleRetry = (id: string) => {
    setPendingRow({ id, action: "retry" });
    retryDoc(id, {
      onSuccess: () => {
        toast.success("Ingestion retry queued.");
        queryClient.invalidateQueries({ queryKey: ragKeys.all });
      },
      onError: (err) => toast.error(getErrorMessage(err)),
      onSettled: () => setPendingRow(null),
    });
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setOffset(0);
  };

  const getStatusBadge = (status: string, error?: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "failed":
        return (
          <span title={error}>
            <Badge variant="danger">Failed</Badge>
          </span>
        );
      case "pending":
      case "processing":
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  if (isForbidden) {
    return (
      <EmptyState
        icon={<Lock className="h-12 w-12" />}
        title="No access to the document library"
        description="Your account doesn't have a knowledge-base access grant yet. Ask an admin to enable RAG access for you."
      />
    );
  }

  const items = data?.items ?? [];
  const colSpan = canManage ? 4 : 3;

  return (
    <div className="space-y-6">
      <Panel
        flush
        actions={
          <>
            {total > 0 && (
              <Badge variant="primary">
                {total} indexed
              </Badge>
            )}
            <div className="w-40">
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
                Upload Document
              </Button>
            )}
          </>
        }
      >
        {isError ? (
          <div className="p-4">
            <Alert variant="error">
              Failed to load documents. {getErrorMessage(error)}
            </Alert>
          </div>
        ) : !isLoading && items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title={statusFilter ? "No matching documents" : "No documents yet"}
              description={
                statusFilter
                  ? "No documents match this status filter. Try a different status."
                  : canManage
                    ? "Upload a textbook document to start building your knowledge base."
                    : "The knowledge base is empty. Ask a teacher or admin to upload textbooks."
              }
              action={
                canManage && !statusFilter ? (
                  <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
                    Upload Document
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class / Chapter</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border/30">
                {isLoading ? (
                  <TableBodySkeleton rows={6} columns={colSpan} />
                ) : (
                  items.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-sm font-medium text-foreground">{doc.original_filename}</div>
                            <div className="text-xs text-muted-foreground">{(doc.file_size / 1024).toFixed(1)} KB • {doc.parser}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{doc.class_level}, {doc.subject}</div>
                        <div className="text-xs text-muted-foreground">Ch {doc.chapter_number}: {doc.chapter_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status, doc.error)}
                        {doc.status.toLowerCase() === 'failed' && doc.error && (
                          <div className="text-xs text-destructive mt-1 max-w-xs truncate" title={doc.error}>{doc.error}</div>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {doc.status.toLowerCase() === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetry(doc.id)}
                              loading={pendingRow?.id === doc.id && pendingRow.action === "retry"}
                              className="text-primary hover:text-primary/80 mr-2"
                            >
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            loading={pendingRow?.id === doc.id && pendingRow.action === "delete"}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={() => setOffset((o) => o + PAGE_SIZE)}
        onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
      />

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <FileUpload
            label="Document File (PDF, DOCX, PPTX, MD, TXT)"
            accept=".pdf,.docx,.pptx,.md,.txt"
            onChange={(files) => setFile(files[0] || null)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={formData.class_level}
              onChange={(e) => setFormData({ ...formData, class_level: e.target.value })}
            />
            <Select
              label="Subject"
              options={[{ value: "", label: "Select subject" }, ...SUBJECT_OPTIONS]}
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value, subject_other: "" })
              }
            />
          </div>
          {formData.subject === RAG_OTHER_SUBJECT && (
            <Input
              label="Subject name"
              placeholder="Enter the subject"
              value={formData.subject_other}
              onChange={(e) => setFormData({ ...formData, subject_other: e.target.value })}
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Chapter Number" required value={formData.chapter_number} onChange={(e) => setFormData({ ...formData, chapter_number: e.target.value })} />
            <Input label="Chapter Name" required value={formData.chapter_name} onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })} />
          </div>
          {isAdmin && (
            <Input label="School ID (Optional)" placeholder="Leave empty for global content" value={formData.school_id} onChange={(e) => setFormData({ ...formData, school_id: e.target.value })} />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isUploading}>Upload</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
