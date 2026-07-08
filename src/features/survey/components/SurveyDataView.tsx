import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { surveyApi } from "@/features/survey/api/survey";
import { getErrorMessage } from "@/shared/lib/utils";
import { Panel } from "@/shared/components/ui/Panel";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";

type DeleteMode = "roll-school" | "school" | "class" | null;

function asCount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function SurveyDataView() {
  // Admins act on the globally-selected school; principals/teachers are scoped
  // server-side, so no free-text school field is needed anymore.
  const { schoolName, isAdmin } = useActiveSchool();
  const qc = useQueryClient();
  const [confirmMode, setConfirmMode] = useState<DeleteMode>(null);
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [lastResult, setLastResult] = useState<{
    deleted: number;
    mode: string;
  } | null>(null);

  // Used to source class options and show an impact preview (record counts)
  // before an irreversible delete.
  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60_000,
  });

  const classCounts = (surveyStatus?.by_class ?? []).map((c) => {
    const cls = c as Record<string, unknown>;
    const rawName = String(cls.class ?? cls.class_name ?? "").trim();
    return {
      name: rawName || "Unknown Class",
      count: asCount(cls.count) ?? 0,
    };
  });

  const schoolCounts = (surveyStatus?.by_school ?? []).map((s) => {
    const school = s as Record<string, unknown>;
    return {
      name: String(school.school_name ?? ""),
      count: asCount(school.count) ?? 0,
    };
  });

  // Best-effort impact estimate for the active confirmation.
  const impactCount = (() => {
    if (confirmMode === "school") {
      return schoolCounts.find((s) => s.name === schoolName.trim())?.count ?? null;
    }
    if (confirmMode === "class") {
      return classCounts.find((c) => c.name === className.trim())?.count ?? null;
    }
    return null;
  })();

  const { mutate: deleteByRoll, isPending: delByRoll } = useMutation({
    mutationFn: () => surveyApi.deleteByRollSchool(rollNumber, schoolName),
    onSuccess: (r) => {
      toast.success(`Deleted ${r.deleted_count} record(s)`);
      setLastResult({ deleted: r.deleted_count, mode: "roll + school" });
      setConfirmMode(null);
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteBySchool, isPending: delBySchool } = useMutation({
    mutationFn: () => surveyApi.deleteBySchool(schoolName),
    onSuccess: (r) => {
      toast.success(`Deleted ${r.deleted_count} record(s)`);
      setLastResult({ deleted: r.deleted_count, mode: "school" });
      setConfirmMode(null);
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteByClass, isPending: delByClass } = useMutation({
    mutationFn: () =>
      surveyApi.deleteByClass(className, {
        // Admins must supply school_name; principal/teacher are scoped via JWT.
        school_name: isAdmin ? schoolName : undefined,
      }),
    onSuccess: (r) => {
      toast.success(`Deleted ${r.deleted_count} record(s)`);
      setLastResult({ deleted: r.deleted_count, mode: "class" });
      setConfirmMode(null);
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isPending = delByRoll || delBySchool || delByClass;

  return (
    <>
      {lastResult && (
        <Alert variant="success">
          Deleted <strong>{lastResult.deleted}</strong> record(s) by{" "}
          {lastResult.mode}.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Panel
          title="Delete by Roll Number + School"
          description="Remove a specific student's feedback"
          icon={<Trash2 className="h-4 w-4" />}
        >
          <div className="mb-4">
            <Input
              label="Roll Number"
              placeholder="101"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={!rollNumber || (isAdmin && !schoolName)}
            onClick={() => setConfirmMode("roll-school")}
          >
            Delete Student Feedback
          </Button>
        </Panel>

        <Panel
          title="Delete by School"
          description="Remove all feedback from a school"
          icon={<Trash2 className="h-4 w-4" />}
        >
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={isAdmin && !schoolName}
            onClick={() => setConfirmMode("school")}
          >
            Delete All School Feedback
          </Button>
        </Panel>

        <Panel
          title="Delete by Class"
          description="Remove all feedback for a class"
          icon={<Trash2 className="h-4 w-4" />}
        >
          <Input
            label="Class Name"
            placeholder="10th"
            hint="Enter a class like '10' or '10th' (not a section such as '10A')."
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="mb-4"
            list="survey-class-options"
          />
          {classCounts.length > 0 && (
            <datalist id="survey-class-options">
              {classCounts.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          )}
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={!className || (isAdmin && !schoolName)}
            onClick={() => setConfirmMode("class")}
          >
            Delete Class Feedback
          </Button>
        </Panel>
      </div>

      <Modal
        open={!!confirmMode}
        onClose={() => setConfirmMode(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Are you sure?</p>
              <p className="text-sm text-destructive/90 mt-1">
                {confirmMode === "roll-school" && (
                  <>
                    Deleting feedback for{" "}
                    <Badge variant="danger">{rollNumber}</Badge> from{" "}
                    <Badge variant="danger">{schoolName}</Badge>
                  </>
                )}
                {confirmMode === "school" && (
                  <>
                    Deleting ALL feedback from{" "}
                    <Badge variant="danger">{schoolName}</Badge>
                  </>
                )}
                {confirmMode === "class" && (
                  <>
                    Deleting ALL feedback for class{" "}
                    <Badge variant="danger">{className}</Badge>
                    {isAdmin && schoolName && (
                      <>
                        {" "}
                        at <Badge variant="danger">{schoolName}</Badge>
                      </>
                    )}
                  </>
                )}
              </p>
              {impactCount !== null && (
                <p className="text-sm font-semibold text-destructive mt-2">
                  This will permanently delete approximately {impactCount}{" "}
                  record(s).
                </p>
              )}
              <p className="text-xs text-destructive/80 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmMode(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isPending}
              className="flex-1"
              onClick={() => {
                if (confirmMode === "roll-school") deleteByRoll();
                else if (confirmMode === "school") deleteBySchool();
                else if (confirmMode === "class") deleteByClass();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
