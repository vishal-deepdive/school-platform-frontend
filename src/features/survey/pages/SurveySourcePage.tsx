import { useState } from "react";
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
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { surveyApi } from "@/features/survey/api/survey";
import type {
  SourceItem,
  SyncMode,
  HeaderPreviewResponse,
  SurveyType,
} from "@/features/survey/types";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
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

// ── Source Card ──────────────────────────────────────────────────────────────

function SourceCard({
  source,
  onSync,
  onDelete,
  onToggleActive,
  syncing,
}: {
  source: SourceItem;
  onSync: (id: string, mode: SyncMode) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  syncing: boolean;
}) {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <li
        className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between md:px-5 ${
          source.is_active ? "" : "opacity-60"
        }`}
      >
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

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
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
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
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
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive"
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Remove
              </Button>
            </>
          )}
        </div>
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

      {/* Delete confirmation */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Remove Data Source"
        size="md"
      >
        <p className="text-sm text-muted-foreground">
          Remove this sheet registration? Already-imported survey rows will NOT
          be deleted.
        </p>
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
            Remove
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
}: {
  open: boolean;
  onClose: () => void;
  schoolParam?: string;
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
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () => {
      const columnMap =
        Object.keys(customMap).length > 0 ? customMap : undefined;
      return surveyApi.registerSource({
        sheet_url: sheetUrl.trim(),
        label: label.trim() || undefined,
        cycle: cycle.trim() || undefined,
        survey_type: surveyType,
        school_name: schoolParam,
        column_map: columnMap,
      });
    },
    onSuccess: () => {
      toast.success("Source registered successfully.");
      qc.invalidateQueries({ queryKey: ["survey"] });
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
              Add Source
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function SurveySourcePage() {
  const qc = useQueryClient();
  // School comes from the global active-school selection: the picked school for
  // admins, or `undefined` for principals (scoped server-side by their session).
  const { schoolName, ready } = useActiveSchool();
  const schoolParam = schoolName || undefined;

  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ["survey", "sources", schoolName || "self"],
    queryFn: () => surveyApi.getSources(schoolParam),
    enabled: ready,
  });

  const sources = sourcesData?.sources ?? [];
  const activeSources = sources.filter((s) => s.is_active);
  const inactiveSources = sources.filter((s) => !s.is_active);

  const { mutate: syncSource, isPending: syncing } = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: SyncMode }) =>
      surveyApi.syncSource(id, mode),
    onSuccess: (res) => {
      const deleted = res.summary.rows_deleted ?? 0;
      const drift = res.schema_drift;
      toast.success(
        `Sync (${res.mode}): +${res.summary.records_added} added, ` +
          `${res.summary.records_skipped} skipped` +
          (deleted ? `, ${deleted} replaced` : ""),
      );
      if (drift) {
        toast.warning(
          `Schema changed: ${drift.added.length} columns added, ${drift.removed.length} removed`,
          { duration: 6000 },
        );
      }
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteSource } = useMutation({
    mutationFn: (id: string) => surveyApi.deleteSourceById(id),
    onSuccess: () => {
      toast.success("Source removed.");
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      surveyApi.updateSource(id, { is_active: active }),
    onSuccess: (_res, { active }) => {
      toast.success(active ? "Source reactivated." : "Source deactivated.");
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading && ready) return <PageSkeleton showStats={false} content="list" />;

  return (
    <div className="space-y-6">
      {ready && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => setWizardOpen(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Source
            </Button>
          </div>

          {/* Empty state */}
          {sources.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-12 w-12" />}
              title="No data sources"
              description="Connect a public Google Sheet to start importing survey responses. You can add multiple sheets for different terms or survey types."
              action={
                <Button
                  onClick={() => setWizardOpen(true)}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add Source
                </Button>
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
                        syncing={syncing}
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
                        syncing={syncing}
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
        </>
      )}

      {/* Add Source Wizard */}
      <AddSourceWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        schoolParam={schoolParam}
      />
    </div>
  );
}
