/**
 * Bulk student roster import (CSV) — so a school never types 500 students by hand.
 *
 * Uploads a CSV to POST /admin/schools/{id}/students/bulk and shows a per-row
 * result summary (created / skipped duplicates / errored rows). Principal-scoped:
 * the school is taken from the caller's session.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/features/admin/api/admin";
import { useAuthStore } from "@/features/auth/store/auth";
import type { BulkImportResult } from "@/features/admin/types";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";

const SAMPLE_CSV =
  "roll_no,name,class_name,section,session\n" +
  "1,Aarav Sharma,7,A,2025-26\n" +
  "2,Diya Patel,7,A,2025-26\n";

export function StudentImportPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const schoolId = user?.school_id ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_roster_template.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="mx-auto max-w-2xl space-y-6">
      <Card padding="md" className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            CSV columns (header row): <code>roll_no</code> (required),{" "}
            <code>name</code>, <code>class_name</code>, <code>section</code>,{" "}
            <code>session</code>. Re-importing is safe — existing students are
            skipped, not duplicated.
            <button
              onClick={downloadSample}
              className="ml-1 font-medium text-primary hover:underline"
            >
              Download template
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50">
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {file ? file.name : "Click to choose a .csv file"}
          </span>
          <span className="text-xs text-muted-foreground">Max 5 MB</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>

        <Button onClick={handleUpload} disabled={busy || !file} className="w-full">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              <UploadCloud className="mr-2 h-4 w-4" /> Import students
            </>
          )}
        </Button>
      </Card>

      {result && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-sm font-semibold text-foreground">
              Import complete
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 py-3">
              <p className="text-xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-700/80">Created</p>
            </div>
            <div className="rounded-lg bg-amber-50 py-3">
              <p className="text-xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-amber-700/80">Skipped (existing)</p>
            </div>
            <div className="rounded-lg bg-red-50 py-3">
              <p className="text-xl font-bold text-red-700">
                {result.errors.length}
              </p>
              <p className="text-xs text-red-700/80">Errored rows</p>
            </div>
          </div>

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

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/attendance/enroll")}
            >
              Next: enroll faces
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/dashboard")}
            >
              Back to dashboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
