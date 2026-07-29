import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "@/shared/lib/toast";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";

const SYNC_POLL_MS = 3000;

/**
 * Polls a background embedding job (Phase 2 of a sync) to completion and
 * surfaces its outcome via toast.
 *
 * Extracted from SurveyDashboardPage, which previously held this as local
 * state reachable only from its own "Sync All Sources" button — a sync
 * started from the Data Source tab (per-source Sync/Replace, or the
 * register-and-autosync flow) returns a `job_id` too, but nothing polled it:
 * the embedding phase's progress and any failure were silently dropped.
 */
export function useSyncJobPolling() {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: job } = useQuery({
    queryKey: surveyKeys.syncStatus(jobId),
    queryFn: () => surveyApi.getSyncStatus(jobId as string),
    enabled: !!jobId,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "done" || status === "failed") return false;
      return SYNC_POLL_MS;
    },
  });

  const isGenerating =
    !!jobId && !!job && job.status !== "done" && job.status !== "failed";

  useEffect(() => {
    if (!jobId || !job) return;
    if (job.status === "done") {
      toast.success("Embeddings generated — search is fully up to date.");
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      setJobId(null);
    } else if (job.status === "failed") {
      toast.error(job.error || "Embedding generation failed.");
      setJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, jobId, qc]);

  /** Start tracking a job returned by a sync/register response. No-ops for a
   * sync that had nothing to embed (job_id undefined/null, or already done). */
  const track = (newJobId?: string | null) => {
    if (newJobId) setJobId(newJobId);
  };

  return { job, isGenerating, track };
}
