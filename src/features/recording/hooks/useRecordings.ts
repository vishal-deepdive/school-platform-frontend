import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recordingApi } from "@/features/recording/api/recording";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import type { MarkdownResult } from "@/features/recording/types";

/**
 * Centralised React Query keys for the recording feature. Using a factory keeps
 * cache reads/writes consistent and makes invalidation refactor-safe.
 *
 * `list`/`audit` include the page offset so React Query refetches each page
 * server-side instead of us holding (and slicing) one giant client-side array.
 */
export const recordingKeys = {
  all: ["recordings"] as const,
  list: (limit: number, offset: number) =>
    ["recordings", "list", limit, offset] as const,
  search: (query: string) => ["recordings", "search", query] as const,
  audit: (limit: number, offset: number) =>
    ["recording-audit", limit, offset] as const,
};

export function useRecordingsList(limit: number, offset: number) {
  return useQuery({
    queryKey: recordingKeys.list(limit, offset),
    queryFn: () => recordingApi.listRecordings({ limit, offset }),
    staleTime: 60_000,
  });
}

export function useRecordingAuditLogs(limit: number, offset: number) {
  return useQuery({
    queryKey: recordingKeys.audit(limit, offset),
    queryFn: () => recordingApi.listAuditLogs({ limit, offset }),
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
 * previewed and lazily fetches its markdown. `result` is `null` while the
 * fetch is in flight; afterwards it is a discriminated state (ready /
 * generating / not_found / error) so the modal can show the right thing
 * instead of rendering an error string as markdown.
 */
export function useRecordingPreview() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [result, setResult] = useState<MarkdownResult | null>(null);

  const open = async (id: string) => {
    setPreviewId(id);
    setResult(null);
    setResult(await recordingApi.getRecordingMarkdown(id));
  };

  const close = () => {
    setPreviewId(null);
    setResult(null);
  };

  return { previewId, result, open, close };
}
