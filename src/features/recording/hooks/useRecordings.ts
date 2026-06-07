import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recordingApi } from "@/features/recording/api/recording";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";

/**
 * Centralised React Query keys for the recording feature. Using a factory keeps
 * cache reads/writes consistent and makes invalidation refactor-safe.
 */
export const recordingKeys = {
  all: ["recordings"] as const,
  list: () => ["recordings"] as const,
  search: (query: string) => ["recordings", "search", query] as const,
  audit: () => ["recording-audit"] as const,
};

export function useRecordingsList() {
  return useQuery({
    queryKey: recordingKeys.list(),
    queryFn: () => recordingApi.listRecordings({ limit: 999, offset: 0 }),
    staleTime: 60_000,
  });
}

export function useRecordingAuditLogs() {
  return useQuery({
    queryKey: recordingKeys.audit(),
    queryFn: () => recordingApi.listAuditLogs({ limit: 999, offset: 0 }),
    staleTime: 30_000,
  });
}

export function useSearchRecordings(query: string) {
  return useQuery({
    queryKey: recordingKeys.search(query),
    queryFn: () => recordingApi.searchRecordings({ q: query }),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recordingApi.deleteRecording(id),
    onSuccess: () => {
      toast.success("Recording deleted");
      qc.invalidateQueries({ queryKey: recordingKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRetryRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recordingApi.retryRecording(id),
    onSuccess: () => {
      toast.success("Recording queued for retry");
      qc.invalidateQueries({ queryKey: recordingKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDownloadRecording() {
  return useMutation({
    mutationFn: (jobId: string) => recordingApi.downloadResult(jobId, "md"),
    onSuccess: (blob: Blob, jobId) =>
      downloadBlob(blob, `recording-notes-${jobId}.md`),
    onError: () => toast.error("Failed to download notes"),
  });
}

/**
 * Encapsulates the "open a recording's generated study materials in a modal"
 * flow shared by the list and search pages: tracks which recording is being
 * previewed, lazily fetches its markdown, and falls back to a placeholder.
 */
export function useRecordingPreview() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const open = async (id: string) => {
    setPreviewId(id);
    setMarkdown(null);
    try {
      setMarkdown(await recordingApi.getRecordingMarkdown(id));
    } catch {
      setMarkdown("*Study materials not yet available for this recording.*");
    }
  };

  const close = () => {
    setPreviewId(null);
    setMarkdown(null);
  };

  return { previewId, markdown, open, close };
}
