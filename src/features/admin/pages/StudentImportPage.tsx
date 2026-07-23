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
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import type { BulkImportResult } from "@/features/admin/types";
import { downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Panel } from "@/shared/components/ui/Panel";
import { StatCard } from "@/shared/components/ui/Card";
import { FileUpload } from "@/shared/components/ui/FileUpload";

const SAMPLE_CSV =
  "roll_no,name,class_name,section,session,dob,guardian_name,guardian_mobile,guardian_relation\n" +
  "1,Aarav Sharma,7,A,2025-26,2013-04-01,Vikram Sharma,9876543210,father\n" +
  "2,Diya Patel,7,A,2025-26,2013-06-15,Meera Patel,9123456780,mother\n";

export function StudentImportPage() {
  // Admins act on the globally-selected school; principals use their own. The
  // SchoolGate guarantees an admin has picked one before this page renders.
  const { schoolId } = useActiveSchool();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    downloadBlob(blob, "student_roster_template.csv");
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
      toast.success(`Imported ${res.created} student(s)`);
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
              CSV columns (header row): <code>roll_no</code> (required),{" "}
              <code>name</code>, <code>class_name</code>, <code>section</code>,{" "}
              <code>session</code>, <code>dob</code> (YYYY-MM-DD, seeds each
              student's default password), <code>guardian_name</code>,{" "}
              <code>guardian_mobile</code>, <code>guardian_email</code>,{" "}
              <code>guardian_relation</code>. Every row gets a login account;
              a guardian mobile is linked as an approved parent automatically
              — siblings sharing a mobile collapse onto one parent account.
              Re-importing is safe — existing students/guardians are reused,
              not duplicated.
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Created"
                value={result.created}
                color="success"
              />
              <StatCard
                label="Skipped (existing)"
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
    </div>
  );
}
