import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { surveyApi } from "@/features/survey/api/survey";
import { getErrorMessage } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { FormSection } from "@/shared/components/ui/FormSection";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { StatLine } from "@/shared/components/ui/StatLine";

type DeleteMode = "roll-school" | "school" | "class" | null;

function asCount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function SurveyDataView() {
  // Admins act on the globally-selected school; principals/teachers are scoped
  // server-side, so no free-text school field is needed anymore.
  const { schoolName, isAdmin, schoolId, schoolParam } = useActiveSchool();
  const qc = useQueryClient();
  const [confirmMode, setConfirmMode] = useState<DeleteMode>(null);
  const [confirmText, setConfirmText] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [lastResult, setLastResult] = useState<{ deleted: number; mode: string } | null>(null);

  // Sources the class options and shows an impact preview (record counts)
  // before an irreversible delete.
  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status", schoolId ?? "platform"],
    queryFn: () => surveyApi.getStatus(schoolParam.school_name),
    staleTime: 5 * 60_000,
  });

  const classCounts = useMemo(
    () =>
      (surveyStatus?.by_class ?? []).map((c) => {
        const cls = c as Record<string, unknown>;
        const rawName = String(cls.class ?? cls.class_name ?? "").trim();
        return { name: rawName || "Unknown class", count: asCount(cls.count) ?? 0 };
      }),
    [surveyStatus],
  );

  const schoolCounts = useMemo(
    () =>
      (surveyStatus?.by_school ?? []).map((s) => {
        const school = s as Record<string, unknown>;
        return { name: String(school.school_name ?? ""), count: asCount(school.count) ?? 0 };
      }),
    [surveyStatus],
  );

  const schoolTotal =
    schoolCounts.find((s) => s.name === schoolName.trim())?.count ??
    (isAdmin ? null : (surveyStatus?.total_records ?? null));
  const classTotal = classCounts.find((c) => c.name === className.trim())?.count ?? null;

  // Best-effort impact estimate for the active confirmation.
  const impactCount =
    confirmMode === "school" ? schoolTotal : confirmMode === "class" ? classTotal : null;

  const onDeleted = (deleted: number, mode: string) => {
    // "Deleted 0 record(s)" was reported as a success, so a typo'd roll number
    // looked exactly like a completed delete. Nothing matched is not success.
    if (deleted === 0) {
      toast.warning("Nothing matched — no responses were deleted. Check the details.");
    } else {
      toast.success(`Deleted ${deleted.toLocaleString()} record${deleted === 1 ? "" : "s"}`);
    }
    setLastResult({ deleted, mode });
    setConfirmMode(null);
    setConfirmText("");
    qc.invalidateQueries({ queryKey: ["survey"] });
  };

  const { mutate: deleteByRoll, isPending: delByRoll } = useMutation({
    mutationFn: () => surveyApi.deleteByRollSchool(rollNumber, schoolName),
    onSuccess: (r) => onDeleted(r.deleted_count, "roll number"),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteBySchool, isPending: delBySchool } = useMutation({
    mutationFn: () => surveyApi.deleteBySchool(schoolName),
    onSuccess: (r) => onDeleted(r.deleted_count, "school"),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteByClass, isPending: delByClass } = useMutation({
    mutationFn: () =>
      surveyApi.deleteByClass(className, {
        // Admins must supply school_name; principal/teacher are scoped via JWT.
        school_name: isAdmin ? schoolName : undefined,
      }),
    onSuccess: (r) => onDeleted(r.deleted_count, "class"),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isPending = delByRoll || delBySchool || delByClass;
  const blockedForAdmin = isAdmin && !schoolName;

  // Wiping a whole school is the one action with no narrower scope to fall back
  // on, so it asks for the school name to be typed out first.
  const needsTypedConfirm = confirmMode === "school";
  const typedConfirmOk =
    !needsTypedConfirm || confirmText.trim().toLowerCase() === schoolName.trim().toLowerCase();

  const closeConfirm = () => {
    if (isPending) return;
    setConfirmMode(null);
    setConfirmText("");
  };

  const runDelete = () => {
    if (confirmMode === "roll-school") deleteByRoll();
    else if (confirmMode === "school") deleteBySchool();
    else if (confirmMode === "class") deleteByClass();
  };

  return (
    <>
      {lastResult &&
        (lastResult.deleted === 0 ? (
          <Alert variant="warning" title="Nothing was deleted">
            No stored responses matched that {lastResult.mode}. Check the roll number or
            class and try again.
          </Alert>
        ) : (
          <Alert variant="success">
            Deleted <strong>{lastResult.deleted.toLocaleString()}</strong> record
            {lastResult.deleted === 1 ? "" : "s"} by {lastResult.mode}.
          </Alert>
        ))}

      <Panel
        icon={<Trash2 className="h-4 w-4" />}
        title="Delete survey responses"
        description={schoolName ? `Acting on ${schoolName}` : "Acting on your school"}
        actions={
          <StatLine
            items={[
              {
                value: schoolTotal ?? 0,
                label: "responses stored",
                hidden: schoolTotal === null,
              },
            ]}
          />
        }
      >
        <div className="flex flex-col gap-5">
          {blockedForAdmin && (
            <Alert variant="warning" title="Pick a school first">
              Select the school you are working on from the dashboard — these actions are scoped
              to one school at a time.
            </Alert>
          )}

          <FormSection
            title="One student"
            description="Removes every response submitted under a single roll number."
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-48">
                <Input
                  label="Roll number"
                  placeholder="101"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                />
              </div>
              <Button
                variant="danger-ghost"
                icon={<Trash2 className="h-4 w-4" />}
                disabled={!rollNumber.trim() || blockedForAdmin}
                onClick={() => setConfirmMode("roll-school")}
              >
                Delete this student
              </Button>
            </div>
          </FormSection>

          <FormSection
            title="One class"
            description="Removes every response from a class. Use the class, not a section (Class 10, not 10A)."
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-56">
                {classCounts.length > 0 ? (
                  <Select
                    label="Class"
                    placeholder="Select a class"
                    options={classCounts.map((c) => ({
                      value: c.name,
                      label: `${c.name} — ${c.count.toLocaleString()} responses`,
                    }))}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                ) : (
                  <Input
                    label="Class"
                    placeholder="Class 10"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                )}
              </div>
              <Button
                variant="danger-ghost"
                icon={<Trash2 className="h-4 w-4" />}
                disabled={!className.trim() || blockedForAdmin}
                onClick={() => setConfirmMode("class")}
              >
                Delete this class
              </Button>
            </div>
          </FormSection>

          <FormSection
            title="Everything for this school"
            description="Removes every imported response. The connected sheets stay — a re-sync would bring the data back."
          >
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              disabled={blockedForAdmin}
              onClick={() => setConfirmMode("school")}
            >
              Delete all responses
              {schoolTotal !== null ? ` (${schoolTotal.toLocaleString()})` : ""}
            </Button>
          </FormSection>
        </div>
      </Panel>

      <Modal
        open={!!confirmMode}
        onClose={closeConfirm}
        title={
          confirmMode === "school"
            ? "Delete every response for this school?"
            : confirmMode === "class"
              ? "Delete this class's responses?"
              : "Delete this student's responses?"
        }
        icon={<AlertTriangle className="h-5 w-5" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isPending}
              disabled={!typedConfirmOk}
              onClick={runDelete}
            >
              {confirmMode === "school" ? "Delete everything" : "Delete"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirmMode === "roll-school" && (
              <>
                Every survey response submitted under roll number{" "}
                <span className="font-medium text-foreground">{rollNumber}</span>
                {schoolName && (
                  <>
                    {" "}
                    at <span className="font-medium text-foreground">{schoolName}</span>
                  </>
                )}{" "}
                will be permanently deleted.
              </>
            )}
            {confirmMode === "class" && (
              <>
                Every survey response from class{" "}
                <span className="font-medium text-foreground">{className}</span>
                {schoolName && (
                  <>
                    {" "}
                    at <span className="font-medium text-foreground">{schoolName}</span>
                  </>
                )}{" "}
                will be permanently deleted.
              </>
            )}
            {confirmMode === "school" && (
              <>
                Every survey response for{" "}
                <span className="font-medium text-foreground">{schoolName}</span> will be
                permanently deleted — every class, every term.
              </>
            )}{" "}
            This cannot be undone.
          </p>

          {impactCount !== null && (
            <Alert variant="error" title={`About ${impactCount.toLocaleString()} record(s)`}>
              That is the number currently stored for this scope.
            </Alert>
          )}

          {needsTypedConfirm && (
            <Input
              label={`Type "${schoolName}" to confirm`}
              placeholder={schoolName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </Modal>
    </>
  );
}
