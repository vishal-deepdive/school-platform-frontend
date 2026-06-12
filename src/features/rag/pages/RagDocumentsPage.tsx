import React, { useState } from "react";
import { Plus, Trash2, RefreshCw, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { getErrorMessage } from "@/shared/lib/utils";
import { SUBJECT_OPTIONS, RAG_OTHER_SUBJECT } from "@/features/rag/constants";
import {
  useRagDocuments,
  useRagClassLevels,
  useUploadRagDocument,
  useDeleteRagDocument,
  useRetryRagIngest,
  ragKeys,
} from "@/features/rag/hooks/useRag";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

const EMPTY_FORM = {
  class_level: "",
  subject: "",
  subject_other: "",
  chapter_number: "",
  chapter_name: "",
  school_id: "",
};

export function RagDocumentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  // Tracks which row's delete/retry is in flight so only that row spins.
  const [pendingRow, setPendingRow] = useState<{
    id: string;
    action: "delete" | "retry";
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: classData } = useRagClassLevels();
  const classOptions = [
    { value: "", label: "Select class" },
    ...(classData?.class_levels ?? []).map((c) => ({ value: c, label: c })),
  ];

  // Auto-refresh while any document is still being ingested.
  const { data, isLoading, refetch, isFetching } = useRagDocuments(
    { limit: 50, offset: 0 },
    {
      refetchInterval: (query) => {
        const items = query.state.data?.items ?? [];
        const stillWorking = items.some(
          (d: { status: string }) =>
            !TERMINAL_STATUSES.has(d.status.toLowerCase()),
        );
        return stillWorking ? 4000 : false;
      },
    },
  );

  const { mutate: uploadDoc, isPending: isUploading } = useUploadRagDocument();
  const { mutate: deleteDoc } = useDeleteRagDocument();
  const { mutate: retryDoc } = useRetryRagIngest();

  const resolvedSubject =
    formData.subject === RAG_OTHER_SUBJECT
      ? formData.subject_other.trim()
      : formData.subject;

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

    uploadDoc(payload, {
      onSuccess: () => {
        toast.success("Document uploaded successfully. Ingestion started.");
        setIsModalOpen(false);
        setFile(null);
        setFormData({ ...EMPTY_FORM });
        queryClient.invalidateQueries({ queryKey: ragKeys.all });
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage textbook documents for the knowledge base.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
            Upload Document
          </Button>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class / Chapter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading documents...</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No documents found.</td></tr>
              ) : (
                data?.items?.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.original_filename}</div>
                          <div className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB • {doc.parser}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{doc.class_level}, {doc.subject}</div>
                      <div className="text-xs text-gray-500">Ch {doc.chapter_number}: {doc.chapter_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status, doc.error)}
                      {doc.status.toLowerCase() === 'failed' && doc.error && (
                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={doc.error}>{doc.error}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {doc.status.toLowerCase() === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(doc.id)}
                          loading={pendingRow?.id === doc.id && pendingRow.action === "retry"}
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        loading={pendingRow?.id === doc.id && pendingRow.action === "delete"}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <FileUpload
            label="Document File (PDF, DOCX, PPTX, MD, TXT)"
            accept=".pdf,.docx,.pptx,.md,.txt"
            onChange={(files) => setFile(files[0] || null)}
          />
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Chapter Number" required value={formData.chapter_number} onChange={(e) => setFormData({ ...formData, chapter_number: e.target.value })} />
            <Input label="Chapter Name" required value={formData.chapter_name} onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })} />
          </div>
          <Input label="School ID (Optional - Admin Only)" placeholder="Leave empty for global content" value={formData.school_id} onChange={(e) => setFormData({ ...formData, school_id: e.target.value })} />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isUploading}>Upload</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
