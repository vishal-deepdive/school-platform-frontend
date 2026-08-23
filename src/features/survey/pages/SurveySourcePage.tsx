import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Power,
  PowerOff,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { usePendingKeys } from "@/shared/hooks/usePendingKeys";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";
import { useSyncJobPolling } from "@/features/survey/hooks/useSyncJobPolling";
import type {
  SourceItem,
  SyncMode,
  HeaderPreviewResponse,
  SurveyType,
  DetachedGroup,
} from "@/features/survey/types";
import { Button } from "@/shared/components/ui/Button";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Skeleton, ListSkeleton } from "@/shared/components/ui/Skeleton";

function SurveySourceSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 sm:px-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <ListSkeleton items={4} />
      </div>
    </div>
  );
}
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Panel } from "@/shared/components/ui/Panel";

const SURVEY_TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic Feedback" },
  { value: "facility", label: "Facility Survey" },
  { value: "teacher_evaluation", label: "Teacher Evaluation" },
];

const SURVEY_TYPE_LABELS: Record<string, string> = {
  general: "General",
  academic: "Academic",
  facility: "Facility",
  teacher_evaluation: "Teacher Eval",
};

// ── Source health ─────────────────────────────────────────────────────────
// Derived entirely from data the API already returns (last_synced_at,
// row_count) — no separate persisted "last sync status" column needed. A
// source that has synced but carries zero rows is exactly the state that
// hid the sync-import bug this whole rework followed from: it doesn't throw
// (so it isn't a "sync error"), it just needs to be visibly different from a
// source with real data.

type SourceHealth = "healthy" | "never_synced" | "no_data";

function getSourceHealth(source: SourceItem): SourceHealth {
  if (!source.last_synced_at) return "never_synced";
  if (source.row_count === 0) return "no_data";
  return "healthy";
}

function SourceHealthBadge({ source }: { source: SourceItem }) {
  const health = getSourceHealth(source);
  if (health === "never_synced") {
    return <Badge variant="default">Never synced</Badge>;
  }
  if (health === "no_data") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Synced, 0 rows
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      Healthy
    </Badge>
  );
}

// ── Column Mapping Table ─────────────────────────────────────────────────────

function ColumnMappingTable({
  preview,
  customMap,
  onMapChange,
}: {
  preview: HeaderPreviewResponse;
  customMap: Record<string, string>;
  onMapChange: (map: Record<string, string>) => void;
}) {
  const usedCanonical = new Set([
    ...Object.values(preview.auto_mapped),
    ...Object.values(customMap),
  ]);
  const availableCanonical = preview.canonical_columns.filter(
    (c) => !usedCanonical.has(c),
  );

  return (
    <div className="space-y-4">
      {/* Parse warnings — surfaced BEFORE the user commits to registering,
          instead of only discovering it after a full sync silently adds 0 rows. */}
      {preview.parse_warnings.length > 0 && (
        <Alert variant="warning" title="Some columns didn't parse cleanly">
          <p className="mb-1">
            In the first rows sampled, these columns had values that couldn't
            be read as expected. They'll still import — those specific values
            will just be blank — but worth checking the sheet:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {preview.parse_warnings.map((w) => (
              <li key={w.column}>
                <span className="font-mono text-xs">{w.column}</span> —{" "}
                {w.unparsed_sample_rows} row(s) in the sample
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Auto-mapped */}
      {Object.keys(preview.auto_mapped).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Auto-matched ({Object.keys(preview.auto_mapped).length} columns)
          </h4>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Sheet Column
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Maps To
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(preview.auto_mapped).map(([header, dbCol]) => (
                  <tr key={header} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-foreground truncate max-w-[300px]">
                      {header}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="success">{dbCol}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unmapped */}
      {preview.unmapped.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Unmapped ({preview.unmapped.length} columns)
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            These columns don't match the standard template. Map them to a
            canonical field, or leave them unmapped — they'll be saved but
            excluded from AI analytics.
          </p>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Sheet Column
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Map To
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.unmapped.map((header) => (
                  <tr key={header} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-foreground truncate max-w-[300px]">
                      {header}
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        options={[
                          { value: "", label: "— skip (save to extra) —" },
                          ...availableCanonical.map((col) => ({ value: col, label: col })),
                          ...(customMap[header]
                            ? [{ value: customMap[header], label: customMap[header] }]
                            : []),
                        ]}
                        value={customMap[header] ?? ""}
                        onChange={(e) => {
                          const next = { ...customMap };
                          if (e.target.value) {
                            next[header] = e.target.value;
                          } else {
                            delete next[header];
                          }
                          onMapChange(next);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Validate Sheet Modal ─────────────────────────────────────────────────────
// Re-runs the same pre-flight check the Add Source wizard does, for a sheet
// that's already registered — lets an admin re-check a sheet's health (e.g.
// after the source owner edited the form) without re-registering it.

function ValidateSheetModal({
  source,
  onClose,
}: {
  source: SourceItem | null;
  onClose: () => void;
}) {
  const { mutate: validate, data, isPending, reset } = useMutation({
    mutationFn: (sheetUrl: string) => surveyApi.previewHeaders(sheetUrl),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  useEffect(() => {
    if (source?.sheet_url) {
      validate(source.sheet_url);
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={!!source}
      onClose={handleClose}
      title={`Validate Sheet${source?.label ? `: ${source.label}` : ""}`}
      size="lg"
    >
      {isPending && !data ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Fetching and checking the sheet…
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.parse_warnings.length === 0 ? (
            <Alert variant="success" title="Looks good">
              All {Object.keys(data.auto_mapped).length} mapped columns parsed
              cleanly in the sample checked.
            </Alert>
          ) : (
            <Alert variant="warning" title="Some columns didn't parse cleanly">
              <ul className="list-disc pl-5 space-y-0.5">
                {data.parse_warnings.map((w) => (
                  <li key={w.column}>
                    <span className="font-mono text-xs">{w.column}</span> —{" "}
                    {w.unparsed_sample_rows} row(s) in the sample
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          {data.unmapped.length > 0 && (
            <Alert variant="info" title={`${data.unmapped.length} unmapped column(s)`}>
              These aren't mapped to a canonical field and won't be used in AI
              analytics: {data.unmapped.join(", ")}
            </Alert>
          )}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

// ── Source Card ──────────────────────────────────────────────────────────────

interface SyncWarning {
  outcome: string;
  reasons: string[];
  failedCount: number;
}

function SourceCard({
  source,
  onSync,
  onDelete,
  onToggleActive,
  onValidate,
  syncing,
  canManage,
  warning,
  onDismissWarning,
}: {
  source: SourceItem;
  onSync: (id: string, mode: SyncMode) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onValidate: (source: SourceItem) => void;
  syncing: boolean;
  canManage: boolean;
  warning?: SyncWarning;
  onDismissWarning: (id: string) => void;
}) {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  return (
    <>
      <li
        className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 ${
          source.is_active ? "" : "opacity-60"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-1.5">
              {/* Title + status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {source.label && (
                  <span className="text-sm font-medium text-foreground">
                    {source.label}
                  </span>
                )}
                <Badge variant={source.is_active ? "success" : "default"}>
                  {source.is_active ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <PowerOff className="mr-1 h-3 w-3" />
                  )}
                  {source.is_active ? "Active" : "Inactive"}
                </Badge>
                <SourceHealthBadge source={source} />
                <Badge variant="info">
                  {SURVEY_TYPE_LABELS[source.survey_type] ?? source.survey_type}
                </Badge>
                {source.cycle && source.cycle !== "default" && (
                  <Badge variant="default">Term: {source.cycle}</Badge>
                )}
              </div>

              {/* URL */}
              <a
                href={source.sheet_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-md">
                  {source.sheet_url ?? "—"}
                </span>
              </a>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {source.row_count.toLocaleString()} response
                  {source.row_count === 1 ? "" : "s"} imported
                </span>
                <span>
                  Last synced:{" "}
                  {source.last_synced_at
                    ? formatDateTime(source.last_synced_at)
                    : "never"}
                </span>
                {source.headers_snapshot && (
                  <span>{source.headers_snapshot.length} columns</span>
                )}
                {source.column_map &&
                  Object.keys(source.column_map).length > 0 && (
                    <span>
                      {Object.keys(source.column_map).length} custom mappings
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Actions — sync/replace/deactivate/remove are admin+principal only
              server-side; teachers get the read-only status above. */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onValidate(source)}
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
              >
                Validate
              </Button>
              {source.is_active ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => onSync(source.id, "append")}
                    loading={syncing}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmReplace(true)}
                    disabled={syncing}
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  >
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleActive(source.id, false)}
                    icon={<PowerOff className="h-3.5 w-3.5" />}
                  >
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => setConfirmDelete(true)}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleActive(source.id, true)}
                    icon={<Power className="h-3.5 w-3.5" />}
                  >
                    Reactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => setConfirmDelete(true)}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sync failure/partial-failure — a persistent alert, not just a toast
            that disappears. A "partial" sync (some rows failed) must never
            read the same as a plain success. */}
        {warning && (
          <Alert
            variant="warning"
            title={`Last sync: ${warning.failedCount} row(s) failed to import`}
            onClose={() => onDismissWarning(source.id)}
          >
            <button
              type="button"
              onClick={() => setShowReasons((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {showReasons ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showReasons ? "Hide" : "Show"} error reason
              {warning.reasons.length === 1 ? "" : "s"}
            </button>
            {showReasons && (
              <ul className="mt-2 list-disc pl-5 space-y-0.5 font-mono text-xs">
                {warning.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
      </li>

      {/* Replace confirmation */}
      <Modal
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="Replace All Data"
        size="md"
      >
        <Alert variant="error" title="Destructive action">
          This will DELETE all imported responses for &quot;
          {source.school_name}&quot; in term &quot;
          {source.cycle || "default"}&quot;, then re-import the entire sheet.
          This cannot be undone.
        </Alert>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmReplace(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmReplace(false);
              onSync(source.id, "replace");
            }}
          >
            Replace All Data
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation — shows the EXACT row count so the impact is
          never a surprise (deleting a source now deletes its rows too, see
          migration 048 / DELETE /source/{id}). */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Remove Data Source"
        size="md"
      >
        {source.row_count > 0 ? (
          <Alert variant="error" title="This will delete imported data">
            This permanently deletes{" "}
            <strong>
              {source.row_count.toLocaleString()} imported response
              {source.row_count === 1 ? "" : "s"}
            </strong>{" "}
            along with the source registration. This cannot be undone.
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            Remove this sheet registration? It has no imported responses yet.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDelete(false);
              onDelete(source.id);
            }}
          >
            {source.row_count > 0
              ? `Delete Source & ${source.row_count.toLocaleString()} Response${source.row_count === 1 ? "" : "s"}`
              : "Remove"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Add Source Wizard ────────────────────────────────────────────────────────

type WizardStep = "url" | "mapping" | "details";

function AddSourceWizard({
  open,
  onClose,
  schoolParam,
  onSynced,
}: {
  open: boolean;
  onClose: () => void;
  schoolParam?: string;
  onSynced: (jobId?: string | null) => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<WizardStep>("url");
  const [sheetUrl, setSheetUrl] = useState("");
  const [preview, setPreview] = useState<HeaderPreviewResponse | null>(null);
  const [customMap, setCustomMap] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [cycle, setCycle] = useState("");
  const [surveyType, setSurveyType] = useState<SurveyType>("general");

  const reset = () => {
    setStep("url");
    setSheetUrl("");
    setPreview(null);
    setCustomMap({});
    setLabel("");
    setCycle("");
    setSurveyType("general");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const { mutate: fetchPreview, isPending: loadingPreview } = useMutation({
    mutationFn: () => surveyApi.previewHeaders(sheetUrl.trim()),
    onSuccess: (data) => {
      setPreview(data);
      setStep("mapping");
      if (data.parse_warnings.length > 0) {
        toast.warning(
          `${data.parse_warnings.length} column(s) had values that didn't parse cleanly in the sample — see details below.`,
        );
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () => {
      const columnMap =
        Object.keys(customMap).length > 0 ? customMap : undefined;
      // The backend registers AND auto-syncs the source in one call, returning
      // the sync outcome in `res.sync` — no separate sync request needed.
      return surveyApi.registerSource({
        sheet_url: sheetUrl.trim(),
        label: label.trim() || undefined,
        cycle: cycle.trim() || undefined,
        survey_type: surveyType,
        school_name: schoolParam,
        column_map: columnMap,
      });
    },
    onSuccess: (res) => {
      const sync = res.sync;
      if (sync?.ok && sync.sync_outcome === "partial") {
        toast.warning(
          `Source added: +${sync.records_added} rows imported, but ${sync.records_failed} row(s) failed` +
            (sync.error_reasons[0] ? ` (${sync.error_reasons[0]})` : "") +
            ". Check the source card for details.",
          { duration: 8000 },
        );
      } else if (sync?.ok && sync.records_added === 0) {
        // A brand-new source importing 0 rows on its first sync is unusual (as
        // opposed to a later re-sync, where 0-new-rows is the normal outcome
        // once everything is already imported) — surface it as a warning, not
        // a plain success, so it isn't mistaken for "added and ready to use."
        toast.warning(
          "Source registered, but the first sync imported 0 rows" +
            (sync.records_skipped ? ` (${sync.records_skipped} skipped as duplicates)` : "") +
            ". Open the source and click Sync again, or check the sheet has data " +
            "under the header row.",
          { duration: 8000 },
        );
      } else if (sync?.ok) {
        toast.success(
          `Source added & synced: +${sync.records_added} rows imported` +
            (sync.records_skipped ? `, ${sync.records_skipped} skipped` : ""),
        );
      } else if (sync && !sync.ok) {
        toast.success("Source registered.");
        toast.error(
          `Auto-sync failed: ${sync.error ?? "unknown error"}. ` +
            "Use “Sync” on the source to retry.",
          { duration: 7000 },
        );
      } else {
        toast.success("Source registered.");
      }
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      onSynced(sync?.job_id);
      handleClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const totalMapped = preview
    ? Object.keys(preview.auto_mapped).length + Object.keys(customMap).length
    : 0;
  const totalHeaders = preview?.headers.length ?? 0;

  return (
    <Modal open={open} onClose={handleClose} title="Add Data Source" size="xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["url", "mapping", "details"] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${step === s || (i === 1 && step === "details") || (i === 2 && step === "details") ? "bg-primary" : "bg-border"}`}
              />
            )}
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["url", "mapping", "details"].indexOf(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s === "url"
                ? "Sheet URL"
                : s === "mapping"
                  ? "Column Mapping"
                  : "Details"}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: URL */}
      {step === "url" && (
        <div className="space-y-4">
          <Input
            label="Google Sheet URL"
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            hint="Paste the share URL. The sheet must be public (Anyone with the link can view)."
            required
          />
          <div className="flex justify-end">
            <Button
              onClick={() => fetchPreview()}
              loading={loadingPreview}
              disabled={!sheetUrl.trim()}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Fetch & Preview Columns
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {totalMapped}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalHeaders}
              </span>{" "}
              columns mapped to canonical fields
            </p>
            <Badge
              variant={
                preview.unmapped.length === 0 ? "success" : "warning"
              }
            >
              {preview.unmapped.length === 0
                ? "All mapped"
                : `${preview.unmapped.length} unmapped`}
            </Badge>
          </div>

          <div className="max-h-[400px] overflow-y-auto rounded-lg">
            <ColumnMappingTable
              preview={preview}
              customMap={customMap}
              onMapChange={setCustomMap}
            />
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep("url")}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            <Button
              onClick={() => setStep("details")}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <Input
            label="Label"
            placeholder="e.g. Academic Feedback Term 1 2025-26"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint="A descriptive name for this data source."
          />
          <Input
            label="Term / Cycle"
            placeholder="e.g. 2025-T1 (defaults to 'default')"
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            hint="Use a new value each term so the same students aren't skipped as duplicates."
          />
          <Select
            label="Survey Type"
            options={SURVEY_TYPE_OPTIONS}
            value={surveyType}
            onChange={(e) =>
              setSurveyType(
                (e.target as HTMLSelectElement).value as SurveyType,
              )
            }
          />

          {preview && (
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Summary
              </p>
              <div className="text-sm text-foreground space-y-0.5">
                <p>
                  {totalMapped} columns mapped, {preview.unmapped.length - Object.keys(customMap).length > 0 ? preview.unmapped.length - Object.keys(customMap).length : 0} saved
                  to extra
                </p>
                <p className="text-muted-foreground truncate">
                  Sheet: {sheetUrl.split("/d/")[1]?.split("/")[0]?.slice(0, 20) ?? sheetUrl.slice(0, 40)}...
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep("mapping")}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            <Button
              onClick={() => register()}
              loading={registering}
              icon={<Plus className="h-4 w-4" />}
            >
              {registering ? "Adding & syncing…" : "Add & Sync Source"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Detached Responses Panel (admin cleanup) ────────────────────────────────
// Rows with no source attached (source_id IS NULL) — legacy imports, or rows
// a source deletion left behind under the pre-migration-048 semantics.
// Nothing here is ever auto-purged; this is a deliberate, reviewed action.

function DetachedResponsesPanel() {
  const qc = useQueryClient();
  const [confirmGroup, setConfirmGroup] = useState<DetachedGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: surveyKeys.detached(),
    queryFn: () => surveyApi.getDetachedResponses(),
    staleTime: 60_000,
  });

  const { mutate: purge, isPending: purging } = useMutation({
    mutationFn: (schoolId?: string) => surveyApi.purgeDetachedResponses(schoolId),
    onSuccess: (res) => {
      toast.success(`Purged ${res.deleted_count.toLocaleString()} detached response(s).`);
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      setConfirmGroup(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading || !data || data.total_detached === 0) return null;

  return (
    <>
      <Panel
        flush
        title="Detached Responses"
        icon={<Inbox className="h-4 w-4" />}
        description="Survey rows with no data source attached — legacy imports, or left behind by an old source removal"
        actions={<Badge variant="warning">{data.total_detached.toLocaleString()} rows</Badge>}
      >
        <ul className="divide-y divide-border/50">
          {data.groups.map((g) => (
            <li
              key={g.school_id ?? "unknown"}
              className="flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {g.school_name ?? "Unknown / unassigned school"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.count.toLocaleString()} response{g.count === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger-ghost"
                onClick={() => setConfirmGroup(g)}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Purge
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Modal
        open={!!confirmGroup}
        onClose={() => setConfirmGroup(null)}
        title="Purge Detached Responses"
        size="md"
      >
        <Alert variant="error" title="Destructive action">
          This permanently deletes{" "}
          <strong>{confirmGroup?.count.toLocaleString()}</strong> survey
          response{confirmGroup?.count === 1 ? "" : "s"} for &quot;
          {confirmGroup?.school_name ?? "this group"}&quot; that have no data
          source attached. This cannot be undone.
        </Alert>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmGroup(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={purging}
            onClick={() => purge(confirmGroup?.school_id ?? undefined)}
          >
            Permanently Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function SurveySourcePage() {
  const qc = useQueryClient();
  // School comes from the global active-school selection: the picked school for
  // admins, or `undefined` for principals (scoped server-side by their session).
  const { schoolId, schoolName, ready } = useActiveSchool();
  const schoolParam = schoolName || undefined;
  const role = useAuthStore((s) => s.user?.role);
  // Registering/syncing/deleting sources is admin+principal only server-side;
  // a teacher gets a read-only list of connected sheets.
  const canManage = isSchoolAdmin(role);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<SourceItem | null>(null);
  const [syncWarnings, setSyncWarnings] = useState<Record<string, SyncWarning>>({});
  const { track: trackSyncJob } = useSyncJobPolling();

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: surveyKeys.sources(schoolId),
    queryFn: () => surveyApi.getSources(schoolParam),
    enabled: ready,
  });

  const sources = sourcesData?.sources ?? [];
  const activeSources = sources.filter((s) => s.is_active);
  const inactiveSources = sources.filter((s) => !s.is_active);

  // Per-source, not a single shared boolean — otherwise clicking Sync on one
  // source disabled/loading-spun every source's Sync/Replace buttons, not
  // just the one actually being synced.
  const syncPending = usePendingKeys();
  const { mutate: syncSource } = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: SyncMode }) =>
      surveyApi.syncSource(id, mode),
    onMutate: ({ id }) => syncPending.start(id),
    onSettled: (_data, _err, { id }) => syncPending.finish(id),
    onSuccess: (res, { id }) => {
      const deleted = res.summary.rows_deleted ?? 0;
      const drift = res.schema_drift;
      if (res.sync_outcome === "partial") {
        setSyncWarnings((prev) => ({
          ...prev,
          [id]: {
            outcome: res.sync_outcome,
            reasons: res.error_reasons,
            failedCount: res.summary.records_failed ?? 0,
          },
        }));
        toast.warning(
          `Sync (${res.mode}): +${res.summary.records_added} added, ` +
            `${res.summary.records_failed} row(s) failed — see the source for details.`,
        );
      } else {
        setSyncWarnings((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.success(
          `Sync (${res.mode}): +${res.summary.records_added} added, ` +
            `${res.summary.records_skipped} skipped` +
            (deleted ? `, ${deleted} replaced` : ""),
        );
      }
      if (drift) {
        toast.warning(
          `Schema changed: ${drift.added.length} columns added, ${drift.removed.length} removed`,
          { duration: 6000 },
        );
      }
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      trackSyncJob(res.job_id);
    },
    // A total failure (sync_outcome "failed") raises a 400 — surfaced here via
    // the normal error toast, never as a disguised success.
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteSource } = useMutation({
    mutationFn: (id: string) => surveyApi.deleteSourceById(id),
    onSuccess: (res) => {
      toast.success(
        res.deleted_rows
          ? `Source removed — ${res.deleted_rows.toLocaleString()} imported response(s) deleted.`
          : "Source removed.",
      );
      qc.invalidateQueries({ queryKey: surveyKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      surveyApi.updateSource(id, { is_active: active }),
    onSuccess: (_res, { active }) => {
      toast.success(active ? "Source reactivated." : "Source deactivated.");
      qc.invalidateQueries({ queryKey: surveyKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading && ready) return <SurveySourceSkeleton />;

  return (
    <div className="space-y-6">
      {ready && (
        <>
          {canManage && (
            <ModuleHeaderActions>
              <Button
                size="sm"
                onClick={() => setWizardOpen(true)}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Source
              </Button>
            </ModuleHeaderActions>
          )}

          {/* Empty state */}
          {sources.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-12 w-12" />}
              title="No data sources"
              description={
                canManage
                  ? "Connect a public Google Sheet to start importing survey responses. You can add multiple sheets for different terms or survey types."
                  : "No Google Sheets are connected for this school yet. Ask an admin or principal to add one."
              }
              action={
                canManage ? (
                  <Button
                    onClick={() => setWizardOpen(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Source
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Active sources */}
              {activeSources.length > 0 && (
                <Panel
                  flush
                  title="Connected Sheets"
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  description="Google Sheets feeding survey responses"
                  actions={
                    <Badge variant="primary">
                      {activeSources.length} active
                    </Badge>
                  }
                >
                  <ul className="divide-y divide-border/50">
                    {activeSources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        onSync={(id, mode) => syncSource({ id, mode })}
                        onDelete={(id) => deleteSource(id)}
                        onToggleActive={(id, active) =>
                          toggleActive({ id, active })
                        }
                        onValidate={setValidateTarget}
                        syncing={syncPending.has(source.id)}
                        canManage={canManage}
                        warning={syncWarnings[source.id]}
                        onDismissWarning={(id) =>
                          setSyncWarnings((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          })
                        }
                      />
                    ))}
                  </ul>
                </Panel>
              )}

              {/* Inactive sources */}
              {inactiveSources.length > 0 && (
                <Panel
                  flush
                  title="Inactive Sources"
                  actions={
                    <Badge variant="default">{inactiveSources.length}</Badge>
                  }
                >
                  <ul className="divide-y divide-border/50">
                    {inactiveSources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        onSync={(id, mode) => syncSource({ id, mode })}
                        onDelete={(id) => deleteSource(id)}
                        onToggleActive={(id, active) =>
                          toggleActive({ id, active })
                        }
                        onValidate={setValidateTarget}
                        syncing={syncPending.has(source.id)}
                        canManage={canManage}
                        warning={syncWarnings[source.id]}
                        onDismissWarning={(id) =>
                          setSyncWarnings((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          })
                        }
                      />
                    ))}
                  </ul>
                </Panel>
              )}

              {/* Info alert */}
              <Alert variant="info" title="Multiple sources">
                Each source can have its own term/cycle and survey type. Students
                are deduplicated within the same (name, roll, school, cycle) —
                use a new cycle value each term so the same students aren't
                skipped.
              </Alert>
            </>
          )}

          {/* Detached responses cleanup — same gate as source management
              (admin+principal); the backend scopes a principal to their own
              school automatically (see controller.get_detached_responses). */}
          {canManage && <DetachedResponsesPanel />}
        </>
      )}

      {/* Add Source Wizard */}
      <AddSourceWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        schoolParam={schoolParam}
        onSynced={trackSyncJob}
      />

      {/* Validate Sheet */}
      <ValidateSheetModal source={validateTarget} onClose={() => setValidateTarget(null)} />
    </div>
  );
}
