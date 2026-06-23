import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { surveyApi } from "@/features/survey/api/survey";
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
  const [schoolName, setSchoolName] = useState("");

  const { data: source, isLoading } = useQuery({
    queryKey: ["survey", "source"],
    queryFn: () => surveyApi.getSource(),
  });

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () =>
      surveyApi.registerSource({
        sheet_url: sheetUrl.trim(),
        label: label.trim() || undefined,
        school_name: isAdmin ? schoolName.trim() || undefined : undefined,
      }),
    onSuccess: () => {
      toast.success("Google Sheet registered.");
      setSheetUrl("");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: sync, isPending: syncing } = useMutation({
    mutationFn: () =>
      surveyApi.loadRecent(isAdmin ? source?.school_name ?? undefined : undefined),
    onSuccess: (res) => {
      toast.success(
        `Sync started: +${res.summary.records_added} added, ${res.summary.records_skipped} skipped`,
      );
      qc.invalidateQueries({ queryKey: ["survey", "status"] });
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => surveyApi.deleteSource(),
    onSuccess: () => {
      toast.success("Data source removed.");
      qc.invalidateQueries({ queryKey: ["survey", "source"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <PageSpinner />;

  const configured = source?.configured;
  const canSubmit = !!sheetUrl.trim() && (!isAdmin || !!schoolName.trim());

  return (
    <div className="space-y-6">
      {/* ── Current source ─────────────────────────────────────────────── */}
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
                onClick={() => sync()}
                loading={syncing}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Sync now
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
          </div>
        ) : (
          <Alert variant="info" title="No sheet connected">
            Register a public Google Sheet below to start importing survey
            responses for this school.
          </Alert>
        )}
      </Card>

      {/* ── Register / replace ─────────────────────────────────────────── */}
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
          {isAdmin && (
            <Input
              label="School name"
              placeholder="Exact registered school name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              hint="Required for admins — the school this sheet belongs to."
            />
          )}
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
        automatically. Extra or renamed columns are still imported and preserved,
        but won't appear in AI analytics until they're mapped to canonical fields.
      </Alert>
    </div>
  );
}
