/**
 * Bulk student roster import (CSV) — so a school never types 500 students by hand.
 *
 * Uploads a CSV to POST /admin/schools/{id}/students/bulk. Every row gets a
 * managed login account (roll-based, password defaults to DOB when given)
 * and, when a guardian_mobile is supplied, a deduped-or-created guardian
 * account is linked pre-verified — no approval queue, since the school
 * itself is the source. Shows a result summary (created / skipped / errored
 * rows plus guardian stats). The target school is the principal's own
 * school, or — for platform admins — the school currently selected in the
 * global active-school switcher.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  UploadCloud,
  Wrench,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import type { BulkImportResult, ReconcileStudentsResult } from "@/features/admin/types";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { FormActions } from "@/shared/components/ui/FormActions";
import { FormSection } from "@/shared/components/ui/FormSection";
import { KpiStrip } from "@/shared/components/ui/KpiStrip";
import { Panel } from "@/shared/components/ui/Panel";
import { StatLine } from "@/shared/components/ui/StatLine";

const SAMPLE_CSV =
  "roll_no,class_roll_no,name,class_name,section,session,dob,guardian_name,guardian_mobile,guardian_relation\n" +
  "2026-7A-014,1,Aarav Sharma,7,A,2025-26,2013-04-01,Vikram Sharma,9876543210,father\n" +
  "2026-7A-015,2,Diya Patel,7,A,2025-26,2013-06-15,Meera Patel,9123456780,mother\n";

export function StudentImportPage() {
  // Admins act on the globally-selected school; principals use their own. The
  // SchoolGate guarantees an admin has picked one before this page renders.
  const { schoolId } = useActiveSchool();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconcileStudentsResult | null>(null);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    downloadBlob(blob, "student_roster_template.csv");
  };

  const handleReconcile = async () => {
    if (!schoolId) {
      toast.error("Your account is not linked to a school");
      return;
    }
    setReconciling(true);
    try {
      const res = await adminApi.reconcileOrphanedStudents(schoolId);
      setReconcileResult(res);
      if (res.repaired > 0) {
        toast.success(
          `Repaired login access for ${res.repaired} student(s)` +
            (res.has_more ? " — run again to continue" : ""),
        );
      } else {
        toast.success("No students needed repair — everyone already has login access");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReconciling(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    if (!schoolId) {
      toast.error("Your account is not linked to a school");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await adminApi.bulkImportStudents(schoolId, file);
      setResult(res);
      toast.success(
        `Imported ${res.created} student(s)` + (res.repaired ? `, repaired ${res.repaired}` : ""),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <FormSection
          title="Upload the roster"
          description="One row per student. Re-importing is safe — existing students and guardians are reused."
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadSample}
            >
              Template
            </Button>
          }
        >
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              Columns (header row required): <code>roll_no</code> (required — the permanent
              admission number, used for login and never reassigned, even after promotion),{" "}
              <code>class_roll_no</code> (optional — this year&apos;s roll-call number, e.g. 22;
              reassigned each promotion and not checked for uniqueness), <code>name</code>,{" "}
              <code>class_name</code>, <code>section</code>, <code>session</code>,{" "}
              <code>dob</code> (seeds the student&apos;s default password — accepts{" "}
              <code>YYYY-MM-DD</code> or <code>DD-MM-YYYY</code>, separated by <code>-</code>,{" "}
              <code>/</code> or <code>.</code>), <code>guardian_name</code>,{" "}
              <code>guardian_mobile</code>, <code>guardian_email</code>,{" "}
              <code>guardian_relation</code>.
              <br />
              Class names are matched to the school&apos;s class roster — &ldquo;10&rdquo;,
              &ldquo;10th&rdquo; and &ldquo;Class 10&rdquo; all import as{" "}
              <code>Class 10</code>, so imported students show up under the same class
              staff pick from in attendance and recordings.
              <br />
              Every row gets a login account, and a guardian mobile is linked as an approved
              parent automatically — siblings sharing a mobile collapse onto one parent account. A
              row missing a date of birth or guardian mobile gets it filled in from the new file
              rather than being skipped.
            </div>
          </div>

          <div className="mt-4">
            <FileUpload
              accept=".csv,text/csv"
              maxSize={5 * 1024 * 1024}
              hint="CSV file with a header row. Max 5 MB."
              onChange={(files) => {
                setFile(files[0] ?? null);
                setResult(null);
              }}
            />
          </div>
        </FormSection>
      </Panel>

      <FormActions info={file ? `${file.name} ready to import` : "Choose a CSV file to import."}>
        <Button
          onClick={handleUpload}
          disabled={busy || !file}
          loading={busy}
          icon={<UploadCloud className="h-4 w-4" />}
        >
          {busy ? "Importing…" : "Import students"}
        </Button>
      </FormActions>

      {result && (
        <Panel title="Import complete" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="space-y-4">
            <KpiStrip
              items={[
                { label: "Created", value: result.created, tone: "success" },
                { label: "Repaired", value: result.repaired, tone: "info" },
                { label: "Already complete", value: result.skipped },
                {
                  label: "Errored rows",
                  value: result.errors.length,
                  tone: result.errors.length > 0 ? "danger" : "success",
                },
              ]}
            />

            <StatLine
              items={[
                { value: result.guardians_created, label: "guardian accounts created" },
                { value: result.guardians_linked, label: "guardian links created" },
              ]}
            />

            {result.errors.length > 0 && (
              <Alert variant="error" title={`${result.errors.length} row(s) skipped`}>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs">
                  {result.errors.slice(0, 50).map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.dob_warnings.length > 0 && (
              <Alert
                variant="warning"
                title={`${result.dob_warnings.length} date of birth value(s) could not be read`}
              >
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs">
                  {result.dob_warnings.slice(0, 50).map((w) => (
                    <li key={w.row}>
                      Row {w.row}: {w.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.guardian_conflicts.length > 0 && (
              <Alert
                variant="warning"
                title={`${result.guardian_conflicts.length} guardian mobile(s) could not be linked`}
              >
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs">
                  {result.guardian_conflicts.slice(0, 50).map((c) => (
                    <li key={`${c.roll_no}-${c.guardian_mobile}`}>
                      Roll {c.roll_no} ({c.guardian_mobile}): {c.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("/attendance/enroll")}>
                Next: enroll faces
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/attendance/manage")}>
                View the roster
              </Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Repair existing students" icon={<Wrench className="h-4 w-4" />}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              A few students may have been added before login accounts were required — they appear
              on rosters and attendance but cannot sign in. This finds them and provisions a login
              (plus a guardian link, where guardian details are on file) from their existing roster
              data. Safe to run anytime: it never touches a student who can already sign in.
            </p>
          </div>
          <Button
            onClick={handleReconcile}
            disabled={reconciling}
            loading={reconciling}
            icon={<Wrench className="h-4 w-4" />}
            variant="outline"
            className="self-start"
          >
            {reconciling ? "Checking…" : "Check & repair student logins"}
          </Button>

          {reconcileResult && (
            <div className="space-y-3">
              <KpiStrip
                items={[
                  { label: "Repaired", value: reconcileResult.repaired, tone: "success" },
                  {
                    label: "Guardian accounts",
                    value: reconcileResult.guardians_created,
                    tone: "info",
                  },
                  {
                    label: "Guardian links",
                    value: reconcileResult.guardians_linked,
                    tone: "info",
                  },
                ]}
              />

              {reconcileResult.has_more && (
                <Alert variant="warning" title="More students may still need repair">
                  <p className="text-xs">
                    This run hit its per-check limit. Run it again to continue.
                  </p>
                </Alert>
              )}

              {reconcileResult.guardian_conflicts.length > 0 && (
                <Alert
                  variant="warning"
                  title={`${reconcileResult.guardian_conflicts.length} guardian mobile(s) could not be linked`}
                >
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs">
                    {reconcileResult.guardian_conflicts.slice(0, 50).map((c) => (
                      <li key={`${c.roll_no}-${c.guardian_mobile}`}>
                        Roll {c.roll_no} ({c.guardian_mobile}): {c.reason}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {reconcileResult.repaired_students.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">
                    View repaired students ({reconcileResult.repaired_students.length})
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto">
                    {reconcileResult.repaired_students.map((s) => (
                      <li key={s.roll_no}>
                        {s.name ?? "—"} · Roll #{s.roll_no}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
