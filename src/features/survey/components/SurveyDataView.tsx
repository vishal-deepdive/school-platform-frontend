import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { surveyApi } from "@/features/survey/api/survey";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";

type DeleteMode = "roll-school" | "school" | "class" | null;

export function SurveyDataView() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [confirmMode, setConfirmMode] = useState<DeleteMode>(null);
  const [rollNumber, setRollNumber] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [className, setClassName] = useState("");
  const [lastResult, setLastResult] = useState<{
    deleted: number;
    mode: string;
  } | null>(null);

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
    mutationFn: () => surveyApi.deleteByClass(className),
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
        <Card>
          <CardHeader
            title="Delete by Roll Number + School"
            description="Remove a specific student's feedback."
          />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Roll Number"
              placeholder="101"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
            {user?.role === "admin" && (
              <Input
                label="School Name"
                placeholder="Delhi Public School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            )}
          </div>
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={!rollNumber || (user?.role === "admin" && !schoolName)}
            onClick={() => setConfirmMode("roll-school")}
          >
            Delete Student Feedback
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Delete by School"
            description="Remove all feedback from a school."
          />
          {user?.role === "admin" && (
            <Input
              label="School Name"
              placeholder="Delhi Public School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="mb-4"
            />
          )}
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={user?.role === "admin" && !schoolName}
            onClick={() => setConfirmMode("school")}
          >
            Delete All School Feedback
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Delete by Class"
            description="Remove all feedback for a class."
          />
          <Input
            label="Class Name"
            placeholder="10A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="mb-4"
          />
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            disabled={!className}
            onClick={() => setConfirmMode("class")}
          >
            Delete Class Feedback
          </Button>
        </Card>
      </div>

      <Modal
        open={!!confirmMode}
        onClose={() => setConfirmMode(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Are you sure?</p>
              <p className="text-sm text-red-600 mt-1">
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
                  </>
                )}
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
