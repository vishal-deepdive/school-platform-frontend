import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { surveyApi } from "@/features/survey/api/survey";
import type { SyncMode } from "@/features/survey/types";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";

/**
 * Data Source settings: register the public Google Sheet a school's survey
 * responses are imported from. Route is gated to admin/principal; admins must
 * additionally name the target school (principals are forced to their own).
 */
export function SurveySourcePage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";

  const [sheetUrl, setSheetUrl] = useState("");
  const [label, setLabel] = useState("");
  const [cycle, setCycle] = useState("");
  // Admins operate on a chosen school; principals are forced to their own, so
  // this stays empty and is ignored by the API for them.
  const [adminSchool, setAdminSchool] = useState("");

  const schoolParam = isAdmin ? adminSchool.trim() || undefined : undefined;
  const adminReady = !isAdmin || !!schoolParam;

  const { data: source, isLoading } = useQuery({
    queryKey: ["survey", "source", isAdmin ? adminSchool.trim() : "self"],
    queryFn: () => surveyApi.getSource(schoolParam),
    enabled: adminReady,
  });

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () =>
      surveyApi.registerSource({
        sheet_url: sheetUrl.trim(),
        label: label.trim() || undefined,
        cycle: cycle.trim() || undefined,
        school_name: schoolParam,
      }),
    onSuccess: () => {
      toast.success("Google Sheet registered.");
      setSheetUrl("");
      setLabel("");
      setCycle("");
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: sync, isPending: syncing } = useMutation({
    mutationFn: (mode: SyncMode) => surveyApi.loadRecent(schoolParam, mode),
    onSuccess: (res) => {
      const deleted = res.summary.rows_deleted ?? 0;
      toast.success(
        `Sync (${res.mode}): +${res.summary.records_added} added, ` +
          `${res.summary.records_skipped} skipped` +
          (deleted ? `, ${deleted} replaced` : ""),
      );
      qc.invalidateQueries({ queryKey: ["survey", "status"] });
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => surveyApi.deleteSource(schoolParam),
    onSuccess: () => {
      toast.success("Data source removed.");
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSync = (mode: SyncMode) => {
    if (mode === "replace") {
      const where = source?.school_name ?? "this school";
      const term = source?.cycle ?? "default";
      const ok = window.confirm(
        `Replace will DELETE all existing imported responses for "${where}" in ` +
          `term "${term}", then re-import the sheet. This cannot be undone.\n\n` +
          `Use this to swap datasets so analytics stop answering from the old ` +
          `sheet. Continue?`,
      );
      if (!ok) return;
    }
    sync(mode);
  };

  if (isLoading) return <PageSpinner />;

  const configured = source?.configured;
  const canSubmit = !!sheetUrl.trim() && adminReady;

  return (
    <div className="space-y-6">
      {/* ── Admin: choose the school ───────────────────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader
            title="School"
            description="Admins manage one school's data source at a time. Enter the exact registered school name."
          />
          <Input
            label="School name"
            placeholder="Exact registered school name"
            value={adminSchool}
            onChange={(e) => setAdminSchool(e.target.value)}
          />
          {!adminReady && (
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a school above to view or change its data source.
            </p>
          )}
        </Card>
      )}

      {adminReady && (
        <>
          {/* ── Current source ─────────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Current Data Source"
              description="The public Google Sheet this school's survey responses are imported from."
            />
            {configured ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Connected
                  </Badge>
                  {source?.school_name && (
                    <span className="text-sm text-muted-foreground">
                      {source.school_name}
                    </span>
                  )}
                  {source?.label && <Badge variant="info">{source.label}</Badge>}
                  {source?.cycle && (
                    <Badge variant="default">Term: {source.cycle}</Badge>
                  )}
                </div>

                <a
                  href={source?.sheet_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  {source?.sheet_url}
                </a>

                <p className="text-xs text-muted-foreground">
                  Last synced:{" "}
                  {source?.last_synced_at
                    ? formatDateTime(source.last_synced_at)
                    : "never"}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleSync("append")}
                    loading={syncing}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Sync new responses
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync("replace")}
                    loading={syncing}
                    icon={<AlertTriangle className="h-4 w-4" />}
                  >
                    Replace all data
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove()}
                    loading={removing}
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Remove
                  </Button>
                </div>

                <Alert variant="info" title="Append vs Replace">
                  <span className="text-sm">
                    <strong>Sync new responses</strong> adds responses that aren't
                    already imported for the current term.{" "}
                    <strong>Replace all data</strong> deletes this term's existing
                    responses first, then re-imports — use it when you switch to a
                    different sheet so the AI stops answering from the old data. To
                    start a NEW term and keep the old data, set a new "Term / cycle"
                    below before syncing.
                  </span>
                </Alert>
              </div>
            ) : (
              <Alert variant="info" title="No sheet connected">
                Register a public Google Sheet below to start importing survey
                responses for this school.
              </Alert>
            )}
          </Card>

          {/* ── Register / replace ───────────────────────────────────────── */}
          <Card>
            <CardHeader
              title={configured ? "Replace Sheet" : "Connect a Google Sheet"}
              description="In Google Sheets: Share → General access → 'Anyone with the link' → Viewer, then paste the URL here."
            />
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) register();
              }}
            >
              <Input
                label="Google Sheet URL"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                hint="The sheet must be public (Anyone with the link can view). We read it via the CSV export."
                required
              />
              <Input
                label="Label (optional)"
                placeholder="e.g. Term 1 2025-26"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                label="Term / cycle (optional)"
                placeholder="e.g. 2025-T1 (defaults to 'default')"
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                hint="Tag for this survey round. Use a new value each term so the same students aren't skipped as duplicates next time."
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={registering}
                  disabled={!canSubmit}
                  icon={<Link2 className="h-4 w-4" />}
                >
                  {configured ? "Replace Sheet" : "Connect Sheet"}
                </Button>
              </div>
            </form>
          </Card>

          <Alert variant="warning" title="Schema tip">
            Use the standard survey Google Form template so columns map
            automatically. Extra or renamed columns are still imported and
            preserved, but won't appear in AI analytics until they're mapped to
            canonical fields.
          </Alert>
        </>
      )}
    </div>
  );
}
