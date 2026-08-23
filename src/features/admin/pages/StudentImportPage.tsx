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
import { UploadCloud, FileSpreadsheet, CheckCircle2, Wrench, KeyRound } from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import type { BulkImportResult, ReconcileStudentsResult } from "@/features/admin/types";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Panel } from "@/shared/components/ui/Panel";
import { StatCard } from "@/shared/components/ui/Card";
import { FileUpload } from "@/shared/components/ui/FileUpload";

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
  const [reconcileResult, setReconcileResult] =
    useState<ReconcileStudentsResult | null>(null);

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
        `Imported ${res.created} student(s)` +
          (res.repaired ? `, repaired ${res.repaired}` : ""),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              CSV columns (header row): <code>roll_no</code> (required —
              the permanent admission number, used for login and never
              reassigned even after promotion), <code>class_roll_no</code>{" "}
              (optional — this year's roll-call number, e.g. "22";
              reassigned every promotion, not checked for uniqueness),{" "}
              <code>name</code>, <code>class_name</code>, <code>section</code>,{" "}
              <code>session</code>, <code>dob</code> (seeds each student's
              default password — accepts <code>YYYY-MM-DD</code> or{" "}
              <code>DD-MM-YYYY</code>, with <code>-</code>, <code>/</code> or{" "}
              <code>.</code> as the separator), <code>guardian_name</code>,{" "}
              <code>guardian_mobile</code>, <code>guardian_email</code>,{" "}
              <code>guardian_relation</code>. Every row gets a login account;
              a guardian mobile is linked as an approved parent automatically
              — siblings sharing a mobile collapse onto one parent account.
              Re-importing is safe and self-healing — existing students/
              guardians are reused, and a row that's missing a date of birth
              or guardian mobile gets it filled in from the new file instead
              of being skipped.
              <button
                type="button"
                onClick={downloadSample}
                className="ml-1 font-medium text-primary hover:underline"
              >
                Download template
              </button>
            </div>
          </div>

          <FileUpload
            accept=".csv,text/csv"
            maxSize={5 * 1024 * 1024}
            hint="CSV file with a header row"
            onChange={(files) => {
              setFile(files[0] ?? null);
              setResult(null);
            }}
          />

          <Button
            onClick={handleUpload}
            disabled={busy || !file}
            loading={busy}
            icon={!busy ? <UploadCloud className="h-4 w-4" /> : undefined}
            className="self-start"
          >
            {busy ? "Importing…" : "Import students"}
          </Button>
        </div>
      </Panel>

      {result && (
        <Panel
          title="Import complete"
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Created"
                value={result.created}
                color="success"
              />
              <StatCard
                label="Repaired (existing)"
                value={result.repaired}
                color="info"
              />
              <StatCard
                label="Skipped (complete)"
                value={result.skipped}
                color="warning"
              />
              <StatCard
                label="Errored rows"
                value={result.errors.length}
                color="danger"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="New guardian accounts"
                value={result.guardians_created}
                color="info"
              />
              <StatCard
                label="Guardian links created"
                value={result.guardians_linked}
                color="info"
              />
            </div>

            {result.errors.length > 0 && (
              <Alert
                variant="error"
                title={`${result.errors.length} row(s) skipped`}
              >
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
                title={`${result.dob_warnings.length} date of birth value(s) couldn't be read`}
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

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/attendance/enroll")}
              >
                Next: enroll faces
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Back to dashboard
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
              A small number of students may have been added before login
              accounts were required — they show up on rosters and attendance
              but can&apos;t sign in. This scans for any and provisions a
              login (plus a guardian link, if guardian details are on file)
              using their existing roster data. Safe to run anytime — it never
              touches a student who can already log in.
            </p>
          </div>
          <Button
            onClick={handleReconcile}
            disabled={reconciling}
            loading={reconciling}
            icon={!reconciling ? <Wrench className="h-4 w-4" /> : undefined}
            variant="outline"
            className="self-start"
          >
            {reconciling ? "Checking…" : "Check & repair student logins"}
          </Button>

          {reconcileResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Repaired" value={reconcileResult.repaired} color="success" />
                <StatCard
                  label="New guardian accounts"
                  value={reconcileResult.guardians_created}
                  color="info"
                />
                <StatCard
                  label="Guardian links created"
                  value={reconcileResult.guardians_linked}
                  color="info"
                />
              </div>

              {reconcileResult.has_more && (
                <Alert variant="warning" title="More students may still need repair">
                  <p className="text-xs">
                    This run hit its per-check limit. Click the button again to continue.
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
