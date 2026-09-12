import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  Inbox,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";

const SURVEY_TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic feedback" },
  { value: "facility", label: "Facility survey" },
  { value: "teacher_evaluation", label: "Teacher evaluation" },
];

const SURVEY_TYPE_LABELS: Record<string, string> = {
  general: "General",
  academic: "Academic",
  facility: "Facility",
  teacher_evaluation: "Teacher eval",
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
  if (health === "never_synced") return <Badge variant="default">Never synced</Badge>;
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

// ── Column mapping table ─────────────────────────────────────────────────────

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
  const availableCanonical = preview.canonical_columns.filter((c) => !usedCanonical.has(c));

  return (
    <div className="space-y-4">
      {/* Parse warnings — surfaced BEFORE the user commits to registering,
          instead of only discovering it after a full sync silently adds 0 rows. */}
      {preview.parse_warnings.length > 0 && (
        <Alert variant="warning" title="Some columns didn't parse cleanly">
          <p className="mb-1">
            In the first rows sampled, these columns had values that couldn't be read as expected.
            They'll still import — those specific values will just be blank — but worth checking
            the sheet:
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {preview.parse_warnings.map((w) => (
              <li key={w.column}>
                <span className="font-mono text-xs">{w.column}</span> — {w.unparsed_sample_rows}{" "}
                row(s) in the sample
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {Object.keys(preview.auto_mapped).length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Auto-matched ({Object.keys(preview.auto_mapped).length} columns)
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Sheet column
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Maps to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(preview.auto_mapped).map(([header, dbCol]) => (
                  <tr key={header} className="hover:bg-muted/30">
                    <td className="max-w-[300px] truncate px-4 py-2 text-foreground">{header}</td>
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

      {preview.unmapped.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Unmapped ({preview.unmapped.length} columns)
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            These columns don't match the standard template. Map them to a canonical field, or
            leave them unmapped — they'll be saved but excluded from AI analytics.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Sheet column
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Map to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.unmapped.map((header) => (
                  <tr key={header} className="hover:bg-muted/30">
                    <td className="max-w-[300px] truncate px-4 py-2 text-foreground">{header}</td>
                    <td className="px-4 py-2">
                      <Select
                        aria-label={`Map ${header}`}
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
                          if (e.target.value) next[header] = e.target.value;
                          else delete next[header];
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

// ── Validate sheet modal ─────────────────────────────────────────────────────
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
    if (source?.sheet_url) validate(source.sheet_url);
    else reset();
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
      title="Validate sheet"
      description={source?.label ?? undefined}
      icon={<ShieldCheck className="h-5 w-5" />}
      size="lg"
      footer={
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
      }
    >
      {isPending && !data ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.parse_warnings.length === 0 ? (
            <Alert variant="success" title="Looks good">
              All {Object.keys(data.auto_mapped).length} mapped columns parsed cleanly in the
              sample checked.
            </Alert>
          ) : (
            <Alert variant="warning" title="Some columns didn't parse cleanly">
              <ul className="list-disc space-y-0.5 pl-5">
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
              These aren't mapped to a canonical field and won't be used in AI analytics:{" "}
              {data.unmapped.join(", ")}
            </Alert>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// ── Source row ───────────────────────────────────────────────────────────────

interface SyncWarning {
  outcome: string;
  reasons: string[];
  failedCount: number;
}

function SourceRow({
  source,
  onSync,
  onToggleActive,
  onValidate,
  onConfirm,
  syncing,
  canManage,
  warning,
  onDismissWarning,
}: {
  source: SourceItem;
  onSync: (id: string, mode: SyncMode) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onValidate: (source: SourceItem) => void;
  onConfirm: (source: SourceItem, action: "replace" | "delete") => void;
  syncing: boolean;
  canManage: boolean;
  warning?: SyncWarning;
  onDismissWarning: (id: string) => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const label = source.label || source.sheet_url || "Sheet";

  return (
    <li className={`flex flex-col gap-3 px-4 py-3.5 md:px-5 ${source.is_active ? "" : "opacity-60"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {source.label && (
                <span className="text-sm font-medium text-foreground">{source.label}</span>
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

            <a
              href={source.sheet_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="max-w-md truncate">{source.sheet_url ?? "—"}</span>
            </a>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {source.row_count.toLocaleString()} response
                {source.row_count === 1 ? "" : "s"} imported
              </span>
              <span>
                Last synced:{" "}
                {source.last_synced_at ? formatDateTime(source.last_synced_at) : "never"}
              </span>
              {source.headers_snapshot && <span>{source.headers_snapshot.length} columns</span>}
              {source.column_map && Object.keys(source.column_map).length > 0 && (
                <span>{Object.keys(source.column_map).length} custom mappings</span>
              )}
            </div>
          </div>
        </div>

        {/* Sync/replace/deactivate/remove are admin+principal only server-side;
            teachers get the read-only status above. */}
        {canManage && (
          <div className="flex shrink-0 items-center gap-1 md:justify-end">
            {source.is_active ? (
              <Button
                size="sm"
                onClick={() => onSync(source.id, "append")}
                loading={syncing}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Sync
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleActive(source.id, true)}
                icon={<Power className="h-3.5 w-3.5" />}
              >
                Reactivate
              </Button>
            )}
            <ActionMenu
              label={`More actions for ${label}`}
              items={[
                {
                  label: "Validate sheet",
                  icon: <ShieldCheck />,
                  onSelect: () => onValidate(source),
                },
                {
                  label: "Replace all data",
                  icon: <AlertTriangle />,
                  disabled: syncing,
                  hidden: !source.is_active,
                  onSelect: () => onConfirm(source, "replace"),
                },
                {
                  label: "Deactivate",
                  icon: <PowerOff />,
                  hidden: !source.is_active,
                  onSelect: () => onToggleActive(source.id, false),
                },
                {
                  label: "Remove sheet",
                  icon: <Trash2 />,
                  danger: true,
                  onSelect: () => onConfirm(source, "delete"),
                },
              ]}
            />
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
            aria-expanded={showReasons}
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            {showReasons ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showReasons ? "Hide" : "Show"} error reason
            {warning.reasons.length === 1 ? "" : "s"}
          </button>
          {showReasons && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 font-mono text-xs">
              {warning.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </li>
  );
}

// ── Add source wizard ────────────────────────────────────────────────────────

type WizardStep = "url" | "mapping" | "details";
const STEPS: { id: WizardStep; label: string }[] = [
  { id: "url", label: "Sheet URL" },
  { id: "mapping", label: "Column mapping" },
  { id: "details", label: "Details" },
];

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
      const columnMap = Object.keys(customMap).length > 0 ? customMap : undefined;
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
          `Sheet added: +${sync.records_added} rows imported, but ${sync.records_failed} row(s) failed` +
            (sync.error_reasons[0] ? ` (${sync.error_reasons[0]})` : "") +
            ". Check the sheet for details.",
          { duration: 8000 },
        );
      } else if (sync?.ok && sync.records_added === 0) {
        // A brand-new source importing 0 rows on its first sync is unusual (as
        // opposed to a later re-sync, where 0-new-rows is the normal outcome
        // once everything is already imported) — surface it as a warning, not
        // a plain success, so it isn't mistaken for "added and ready to use."
        toast.warning(
          "Sheet registered, but the first sync imported 0 rows" +
            (sync.records_skipped ? ` (${sync.records_skipped} skipped as duplicates)` : "") +
            ". Sync it again, or check the sheet has data under the header row.",
          { duration: 8000 },
        );
      } else if (sync?.ok) {
        toast.success(
          `Sheet added & synced: +${sync.records_added} rows imported` +
            (sync.records_skipped ? `, ${sync.records_skipped} skipped` : ""),
        );
      } else if (sync && !sync.ok) {
        toast.success("Sheet registered.");
        toast.error(
          `Auto-sync failed: ${sync.error ?? "unknown error"}. Use “Sync” on the sheet to retry.`,
          { duration: 7000 },
        );
      } else {
        toast.success("Sheet registered.");
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
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const footer =
    step === "url" ? (
      <>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={() => fetchPreview()}
          loading={loadingPreview}
          disabled={!sheetUrl.trim()}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Fetch &amp; preview columns
        </Button>
      </>
    ) : step === "mapping" ? (
      <>
        <Button variant="outline" onClick={() => setStep("url")} icon={<ArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <Button onClick={() => setStep("details")} icon={<ArrowRight className="h-4 w-4" />}>
          Continue
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="outline"
          onClick={() => setStep("mapping")}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <Button onClick={() => register()} loading={registering} icon={<Plus className="h-4 w-4" />}>
          {registering ? "Adding & syncing…" : "Add & sync sheet"}
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Connect a Google Sheet"
      description="Responses are imported from a published sheet and kept in sync."
      icon={<FileSpreadsheet className="h-5 w-5" />}
      size="xl"
      footer={footer}
    >
      {/* Step indicator */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = i < stepIndex;
          return (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${done || active ? "bg-primary" : "bg-border"}`} />}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === "url" && (
        <Input
          label="Google Sheet URL"
          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          hint="Paste the share URL. The sheet must be public (anyone with the link can view)."
          required
        />
      )}

      {step === "mapping" && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalMapped}</span> of{" "}
              <span className="font-semibold text-foreground">{totalHeaders}</span> columns mapped
              to canonical fields
            </p>
            <Badge variant={preview.unmapped.length === 0 ? "success" : "warning"}>
              {preview.unmapped.length === 0 ? "All mapped" : `${preview.unmapped.length} unmapped`}
            </Badge>
          </div>
          <ColumnMappingTable
            preview={preview}
            customMap={customMap}
            onMapChange={setCustomMap}
          />
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <Input
            label="Label"
            placeholder="e.g. Academic feedback Term 1 2025-26"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint="A descriptive name for this sheet."
          />
          <Input
            label="Term / cycle"
            placeholder="e.g. 2025-T1 (defaults to 'default')"
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            hint="Use a new value each term so the same students aren't skipped as duplicates."
          />
          <Select
            label="Survey type"
            options={SURVEY_TYPE_OPTIONS}
            value={surveyType}
            onChange={(e) => setSurveyType((e.target as HTMLSelectElement).value as SurveyType)}
          />

          {preview && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </p>
              <div className="space-y-0.5 text-sm text-foreground">
                <p>
                  {totalMapped} columns mapped,{" "}
                  {Math.max(0, preview.unmapped.length - Object.keys(customMap).length)} saved to
                  extra
                </p>
                <p className="truncate text-muted-foreground">
                  Sheet:{" "}
                  {sheetUrl.split("/d/")[1]?.split("/")[0]?.slice(0, 20) ?? sheetUrl.slice(0, 40)}…
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Detached responses (admin cleanup) ──────────────────────────────────────
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
        title="Detached responses"
        icon={<Inbox className="h-4 w-4" />}
        description="Rows with no sheet attached — legacy imports, or left behind by an old removal"
        actions={<Badge variant="warning">{data.total_detached.toLocaleString()} rows</Badge>}
      >
        <ul className="divide-y divide-border/50">
          {data.groups.map((g) => (
            <li
              key={g.school_id ?? "unknown"}
              className="flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {g.school_name ?? "Unknown / unassigned school"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.count.toLocaleString()} response{g.count === 1 ? "" : "s"}
                </p>
              </div>
              <ActionMenu
                label={`Actions for ${g.school_name ?? "unassigned responses"}`}
                items={[
                  {
                    label: "Purge responses",
                    icon: <Trash2 />,
                    danger: true,
                    onSelect: () => setConfirmGroup(g),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <ConfirmDialog
        open={!!confirmGroup}
        title="Purge detached responses?"
        description={
          confirmGroup && (
            <>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">
                {confirmGroup.count.toLocaleString()}
              </span>{" "}
              survey response{confirmGroup.count === 1 ? "" : "s"} for “
              {confirmGroup.school_name ?? "this group"}” that have no sheet attached. This can't
              be undone.
            </>
          )
        }
        confirmLabel="Permanently delete"
        loading={purging}
        onConfirm={() => purge(confirmGroup?.school_id ?? undefined)}
        onClose={() => setConfirmGroup(null)}
      />
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function SurveySourcePage() {
  const qc = useQueryClient();
  // School comes from the global active-school selection: the picked school for
  // admins, or `undefined` for principals (scoped server-side by their session).
  const { schoolId, schoolName, ready } = useActiveSchool();
  const schoolParam = schoolName || undefined;
  const role = useAuthStore((s) => s.user?.role);
  // Registering/syncing/deleting sheets is admin+principal only server-side;
  // a teacher gets a read-only list of connected sheets.
  const canManage = isSchoolAdmin(role);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<SourceItem | null>(null);
  const [confirm, setConfirm] = useState<{
    source: SourceItem;
    action: "replace" | "delete";
  } | null>(null);
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
  const importedRows = sources.reduce((n, s) => n + s.row_count, 0);
  const needAttention = activeSources.filter((s) => getSourceHealth(s) !== "healthy").length;

  // Per-source, not a single shared boolean — otherwise clicking Sync on one
  // source disabled/loading-spun every source's buttons, not just that one.
  const syncPending = usePendingKeys();
  const { mutate: syncSource } = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: SyncMode }) => surveyApi.syncSource(id, mode),
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
            `${res.summary.records_failed} row(s) failed — see the sheet for details.`,
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

  const { mutate: deleteSource, isPending: deleting } = useMutation({
    mutationFn: (id: string) => surveyApi.deleteSourceById(id),
    onSuccess: (res) => {
      toast.success(
        res.deleted_rows
          ? `Sheet removed — ${res.deleted_rows.toLocaleString()} imported response(s) deleted.`
          : "Sheet removed.",
      );
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      setConfirm(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      surveyApi.updateSource(id, { is_active: active }),
    onSuccess: (_res, { active }) => {
      toast.success(active ? "Sheet reactivated." : "Sheet deactivated.");
      qc.invalidateQueries({ queryKey: surveyKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const dismissWarning = (id: string) =>
    setSyncWarnings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const rowProps = {
    onSync: (id: string, mode: SyncMode) => syncSource({ id, mode }),
    onToggleActive: (id: string, active: boolean) => toggleActive({ id, active }),
    onValidate: setValidateTarget,
    onConfirm: (source: SourceItem, action: "replace" | "delete") => setConfirm({ source, action }),
    canManage,
    onDismissWarning: dismissWarning,
  };

  const runConfirmed = () => {
    if (!confirm) return;
    if (confirm.action === "delete") deleteSource(confirm.source.id);
    else {
      syncSource({ id: confirm.source.id, mode: "replace" });
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && ready && (
        <ModuleHeaderActions>
          <Button size="sm" onClick={() => setWizardOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Connect<span className="hidden sm:inline">&nbsp;a sheet</span>
          </Button>
        </ModuleHeaderActions>
      )}

      {ready && (
        <>
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-64" />
              <Panel flush>
                <ListSkeleton items={3} />
              </Panel>
            </>
          ) : sources.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-12 w-12" />}
              title="No sheets connected"
              description={
                canManage
                  ? "Connect a public Google Sheet to start importing survey responses. You can add several — one per term or survey type."
                  : "No Google Sheets are connected for this school yet. Ask an admin or principal to add one."
              }
              action={
                canManage ? (
                  <Button size="sm" onClick={() => setWizardOpen(true)} icon={<Plus className="h-4 w-4" />}>
                    Connect a sheet
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <StatLine
                items={[
                  {
                    value: activeSources.length,
                    label: activeSources.length === 1 ? "active sheet" : "active sheets",
                  },
                  {
                    value: importedRows,
                    label: importedRows === 1 ? "response imported" : "responses imported",
                  },
                  {
                    value: needAttention,
                    label: "need attention",
                    tone: "warning",
                    hidden: needAttention === 0,
                  },
                  {
                    value: inactiveSources.length,
                    label: "inactive",
                    hidden: inactiveSources.length === 0,
                  },
                ]}
              />

              {activeSources.length > 0 && (
                <Panel flush>
                  <ul className="divide-y divide-border/50">
                    {activeSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        syncing={syncPending.has(source.id)}
                        warning={syncWarnings[source.id]}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                </Panel>
              )}

              {inactiveSources.length > 0 && (
                <Panel
                  flush
                  title="Inactive"
                  description="Kept for their imported data, but no longer synced"
                >
                  <ul className="divide-y divide-border/50">
                    {inactiveSources.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        syncing={syncPending.has(source.id)}
                        warning={syncWarnings[source.id]}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}

          {/* Detached-response cleanup — same gate as sheet management
              (admin+principal); the backend scopes a principal to their own
              school automatically (see controller.get_detached_responses). */}
          {canManage && <DetachedResponsesPanel />}
        </>
      )}

      <AddSourceWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        schoolParam={schoolParam}
        onSynced={trackSyncJob}
      />

      <ValidateSheetModal source={validateTarget} onClose={() => setValidateTarget(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === "delete" ? "Remove this sheet?" : "Replace all imported data?"}
        description={
          confirm &&
          (confirm.action === "delete" ? (
            confirm.source.row_count > 0 ? (
              <>
                This permanently deletes{" "}
                <span className="font-medium text-foreground">
                  {confirm.source.row_count.toLocaleString()} imported response
                  {confirm.source.row_count === 1 ? "" : "s"}
                </span>{" "}
                along with the sheet registration. This can't be undone.
              </>
            ) : (
              <>Remove this sheet registration? It has no imported responses yet.</>
            )
          ) : (
            <>
              This deletes every imported response for “{confirm.source.school_name}” in term “
              {confirm.source.cycle || "default"}”, then re-imports the entire sheet. This can't be
              undone.
            </>
          ))
        }
        confirmLabel={
          confirm?.action === "delete"
            ? confirm.source.row_count > 0
              ? `Delete sheet & ${confirm.source.row_count.toLocaleString()} response${confirm.source.row_count === 1 ? "" : "s"}`
              : "Remove sheet"
            : "Replace all data"
        }
        loading={deleting}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
