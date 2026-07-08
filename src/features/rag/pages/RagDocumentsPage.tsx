import React, { useId, useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Lock,
  UploadCloud,
  Eye,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { Pagination } from "@/shared/components/ui/Pagination";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Panel } from "@/shared/components/ui/Panel";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { Alert } from "@/shared/components/ui/Alert";
import { TableBodySkeleton, SkeletonText } from "@/shared/components/ui/Skeleton";
import { getErrorMessage, sortClassesDescending } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SUBJECT_OPTIONS, RAG_OTHER_SUBJECT } from "@/features/rag/constants";
import { useAuthStore } from "@/features/auth/store/auth";
import { isStaff } from "@/shared/lib/permissions";
import {
  useRagDocuments,
  useRagClassLevels,
  useUploadRagDocument,
  useDeleteRagDocument,
  useRetryRagIngest,
  useDocumentChunks,
  ragKeys,
} from "@/features/rag/hooks/useRag";
import type { DocumentItem } from "@/features/rag/types";

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [offset, setOffset] = useState(0);
  // Tracks which row's delete/retry is in flight so only that row spins.
  const [pendingRow, setPendingRow] = useState<{
    id: string;
    action: "delete" | "retry";
  } | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  // Set when an upload hits a 409 (duplicate) and needs a replace decision.
  const [replaceRequest, setReplaceRequest] = useState<{
    payload: FormData;
    detail: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const uploadFormId = useId();

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
        ...(debouncedSearch && { search: debouncedSearch }),
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
          setReplaceRequest({ payload, detail: getErrorMessage(err) });
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

  // Reset the picked file and fields so a reopened dialog starts clean.
  const closeUpload = () => {
    setIsModalOpen(false);
    setFile(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleDelete = (id: string) => {
    setDocToDelete(null);
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
            <div className="mr-auto flex flex-wrap items-center gap-2">
              <div className="w-40">
                <Select
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                />
              </div>
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setOffset(0);
                }}
                placeholder="Search documents…"
                className="w-full sm:w-56"
                aria-label="Search documents by name, chapter, or subject"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            {canManage && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
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
                          {doc.status.toLowerCase() === "completed" && (
                            <Tooltip content="Preview parsed content" side="left">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDoc(doc)}
                                aria-label="Preview document content"
                                className="mr-1"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
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
                          <Tooltip content="Delete document" side="left">
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              onClick={() => setDocToDelete(doc.id)}
                              loading={pendingRow?.id === doc.id && pendingRow.action === "delete"}
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
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
        totalItems={total}
        itemsLabel="documents"
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={() => setOffset((o) => o + PAGE_SIZE)}
        onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
      />

      <Modal
        open={isModalOpen}
        onClose={closeUpload}
        title="Upload Document"
        size="lg"
        icon={<UploadCloud />}
        description="Add a textbook chapter to the knowledge base for retrieval."
        footer={
          <>
            <Button variant="outline" type="button" onClick={closeUpload}>
              Cancel
            </Button>
            <Button type="submit" form={uploadFormId} loading={isUploading}>
              Upload
            </Button>
          </>
        }
      >
        <form
          id={uploadFormId}
          onSubmit={handleUpload}
          className="space-y-5"
        >
          <FileUpload
            label="Document file"
            accept=".pdf,.docx,.pptx,.md,.txt"
            hint="PDF, DOCX, PPTX, MD or TXT"
            onChange={(files) => setFile(files[0] || null)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={formData.class_level}
              onChange={(e) =>
                setFormData({ ...formData, class_level: e.target.value })
              }
            />
            <Select
              label="Subject"
              options={[
                { value: "", label: "Select subject" },
                ...SUBJECT_OPTIONS,
              ]}
              value={formData.subject}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subject: e.target.value,
                  subject_other: "",
                })
              }
            />
          </div>
          {formData.subject === RAG_OTHER_SUBJECT && (
            <Input
              label="Subject name"
              placeholder="Enter the subject"
              value={formData.subject_other}
              onChange={(e) =>
                setFormData({ ...formData, subject_other: e.target.value })
              }
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Chapter number"
              required
              placeholder="e.g. 4"
              value={formData.chapter_number}
              onChange={(e) =>
                setFormData({ ...formData, chapter_number: e.target.value })
              }
            />
            <Input
              label="Chapter name"
              required
              placeholder="e.g. Photosynthesis"
              value={formData.chapter_name}
              onChange={(e) =>
                setFormData({ ...formData, chapter_name: e.target.value })
              }
            />
          </div>
          {isAdmin && (
            <Input
              label="School ID"
              hint="Leave empty to make this content global to all schools."
              placeholder="Optional"
              value={formData.school_id}
              onChange={(e) =>
                setFormData({ ...formData, school_id: e.target.value })
              }
            />
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={docToDelete !== null}
        title="Delete document?"
        description="This removes the document and all of its indexed chunks from the knowledge base. Questions can no longer cite it. This cannot be undone."
        confirmLabel="Delete document"
        onConfirm={() => docToDelete && handleDelete(docToDelete)}
        onClose={() => setDocToDelete(null)}
      />

      <ConfirmDialog
        open={replaceRequest !== null}
        title="Replace existing document?"
        variant="primary"
        description={
          replaceRequest && (
            <>
              {replaceRequest.detail} Uploading again replaces the existing
              document and re-indexes its content.
            </>
          )
        }
        confirmLabel="Replace document"
        loading={isUploading}
        onConfirm={() => {
          if (replaceRequest) {
            submitUpload(replaceRequest.payload, true);
            setReplaceRequest(null);
          }
        }}
        onClose={() => setReplaceRequest(null)}
      />

      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title="Document preview"
        icon={<Eye />}
        description={
          previewDoc
            ? `${previewDoc.class_level} · ${previewDoc.subject} · Ch ${previewDoc.chapter_number}: ${previewDoc.chapter_name}`
            : undefined
        }
        size="3xl"
      >
        {previewDoc && <DocumentChunksPreview documentId={previewDoc.id} />}
      </Modal>
    </div>
  );
}

/** Loads and renders the indexed chunks of a document inside the preview modal. */
function DocumentChunksPreview({ documentId }: { documentId: string }) {
  const { data, isLoading, isError, error } = useDocumentChunks(documentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 p-3">
            <SkeletonText lines={3} />
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    return <Alert variant="error">{getErrorMessage(error)}</Alert>;
  }
  if (!data || data.chunks.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="No indexed content"
        description="This document has no chunks yet. It may still be processing or failed to parse."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.total} indexed passage{data.total === 1 ? "" : "s"} — this is
        exactly what the retriever can cite.
      </p>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto scrollbar-thin pr-1">
        {data.chunks.map((chunk, i) => (
          <div
            key={chunk.chunk_id ?? i}
            className="rounded-lg border border-border/60 bg-muted/30 p-3"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {chunk.title && (
                <Badge variant="primary">{chunk.title}</Badge>
              )}
              {chunk.page && (
                <span className="text-[11px] text-muted-foreground">
                  p. {chunk.page}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {chunk.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
