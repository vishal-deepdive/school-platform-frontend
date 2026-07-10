import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "@/shared/lib/toast";
import { recordingApi } from "@/features/recording/api/recording";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import type {
  MarkdownResult,
  Recording,
  RecordingListQuery,
} from "@/features/recording/types";

/**
 * Centralised React Query keys for the recording feature. Using a factory keeps
 * cache reads/writes consistent and makes invalidation refactor-safe.
 *
 * `list`/`audit` include the page offset so React Query refetches each page
 * server-side instead of us holding (and slicing) one giant client-side array.
 */
export const recordingKeys = {
  all: ["recordings"] as const,
  list: (query: RecordingListQuery) =>
    ["recordings", "list", query] as const,
  search: (query: string, rollNo?: string) =>
    ["recordings", "search", query, rollNo] as const,
  audit: (limit: number, offset: number) =>
    ["recording-audit", limit, offset] as const,
};

/** Drop undefined/empty values so they never reach the query string. */
function toParams(query: RecordingListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params[k] = v;
  }
  return params;
}

export function useRecordingsList(query: RecordingListQuery) {
  return useQuery({
    queryKey: recordingKeys.list(query),
    queryFn: () => recordingApi.listRecordings(toParams(query)),
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

export function useSearchRecordings(query: string, rollNo?: string) {
  return useQuery({
    queryKey: recordingKeys.search(query, rollNo),
    queryFn: () =>
      recordingApi.searchRecordings({
        q: query,
        ...(rollNo ? { roll_no: rollNo } : {}),
      }),
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

export function useBulkDeleteRecordings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => recordingApi.bulkDeleteRecordings(ids),
    onSuccess: (res) => {
      toast.success(res.message ?? "Recordings deleted");
      qc.invalidateQueries({ queryKey: recordingKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBulkRetryRecordings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => recordingApi.retryRecording(id)),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      return { ok, total: ids.length };
    },
    onSuccess: ({ ok, total }) => {
      toast.success(`Queued ${ok}/${total} recording(s) for retry`);
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
    mutationFn: (rec: Recording) => recordingApi.downloadResult(rec.job_id!, "pdf"),
    onSuccess: (blob: Blob, rec: Recording) => {
      const className = String(rec.class || "class").trim().replace(/[^a-zA-Z0-9]/g, '_');
      const subject = String(rec.subject || "subject").trim().replace(/[^a-zA-Z0-9]/g, '_');
      const chapter = String(rec.recording_subject || "chapter").trim().replace(/[^a-zA-Z0-9]/g, '_');
      let base = `${className}_${subject}_${chapter}`.replace(/_+/g, '_').replace(/^_|_$/g, '');
      if (!base) base = `recording-${rec.job_id}`;
      downloadBlob(blob, `${base}.pdf`);
    },
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

  const open = async (id: string, rollNo?: string) => {
    setPreviewId(id);
    setResult(null);
    setResult(await recordingApi.getRecordingMarkdown(id, rollNo));
  };

  const close = () => {
    setPreviewId(null);
    setResult(null);
  };

  return { previewId, result, open, close };
}
