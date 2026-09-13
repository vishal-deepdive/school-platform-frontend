import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Input } from "@/shared/components/ui/Input";
import { Modal, ModalFooter } from "@/shared/components/ui/Modal";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { usePendingKeys } from "@/shared/hooks/usePendingKeys";
import { getErrorMessage } from "@/shared/lib/utils";
import { ALL_CLASS_LEVELS, gradeRangeToClassNames } from "@/shared/lib/classes";
import { schoolClassesApi } from "@/shared/api/schoolClasses";
import type { SchoolClass } from "@/shared/api/schoolClasses";
import { schoolClassesKeys } from "@/shared/hooks/useSchoolClasses";
import type { SchoolDetail } from "@/features/admin/types";

const rosterKey = (schoolId: string) => ["school", "classes", schoolId, "all"] as const;
const usageKey = (schoolId: string) => schoolClassesKeys.usage(schoolId);

const sectionsToText = (sections: string[]) => sections.join(", ");
const textToSections = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The class roster editor — where a school's classes and sections are defined.
 *
 * This roster is what every class and section dropdown in the app reads, so it is
 * the one place classes are configured. Removing a class here deactivates it: its
 * existing students, attendance and recordings keep resolving, they just stop
 * being offered for new entries (the row counts below say how much data each
 * class still has).
 */
export function ClassesTab({ school }: { school: SchoolDetail }) {
  const schoolId = school.id;
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [removing, setRemoving] = useState<SchoolClass | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: rosterKey(schoolId),
    // include_inactive: the editor must show classes that were removed, so they
    // can be restored — a dropdown-facing read never asks for these.
    queryFn: () => schoolClassesApi.getRoster(schoolId, true),
    staleTime: 30_000,
  });

  const { data: usage } = useQuery({
    queryKey: usageKey(schoolId),
    queryFn: () => schoolClassesApi.getUsage(schoolId),
    staleTime: 60_000,
  });

  const classes = data?.classes ?? [];
  const activeClasses = classes.filter((c) => c.is_active);
  const inactiveClasses = classes.filter((c) => !c.is_active);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: rosterKey(schoolId) });
    // Every open class picker in the app reads under this prefix.
    queryClient.invalidateQueries({ queryKey: schoolClassesKeys.all });
  };

  const removePending = usePendingKeys();

  const saveClass = useMutation({
    mutationFn: ({ className, sections }: { className: string; sections: string[] }) =>
      schoolClassesApi.addClass(className, sections, schoolId),
    onSuccess: (row) => {
      toast.success(`${row.class_name} saved`);
      invalidate();
      setAddOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateSections = useMutation({
    mutationFn: ({ className, sections }: { className: string; sections: string[] }) =>
      schoolClassesApi.updateSections(className, sections, schoolId),
    onSuccess: (row) => {
      toast.success(`${row.class_name} updated`);
      invalidate();
      setEditing(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removeClass = useMutation({
    mutationFn: (className: string) => schoolClassesApi.removeClass(className, schoolId),
    onMutate: (className) => removePending.start(className),
    onSettled: (_d, _e, className) => removePending.finish(className),
    onSuccess: () => {
      toast.success("Class removed from the roster");
      invalidate();
      setRemoving(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Offered only for an empty roster: fills it from the grade range the school
  // declared at onboarding, which is exactly what a newly approved school gets.
  const declaredRange = useMemo(
    () => gradeRangeToClassNames(school.classes_from ?? "", school.classes_to ?? ""),
    [school.classes_from, school.classes_to],
  );

  const seedFromRange = useMutation({
    mutationFn: () =>
      schoolClassesApi.replaceRoster(
        declaredRange.map((class_name) => ({ class_name, sections: [] })),
        schoolId,
      ),
    onSuccess: (res) => {
      toast.success(`Added ${res.classes.length} classes from the declared range`);
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const takenNames = new Set(classes.map((c) => c.class_name));
  const availableGrades = ALL_CLASS_LEVELS.filter((label) => !takenNames.has(label));

  return (
    <Panel
      flush
      title="Classes & Sections"
      icon={<GraduationCap className="h-4 w-4" />}
      actions={
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setAddOpen(true)}
        >
          Add Class
        </Button>
      }
    >
      <div className="space-y-3 p-4 md:px-5">
        <p className="text-sm text-muted-foreground">
          These classes drive every class and section dropdown in the platform —
          attendance, lecture recordings, the textbook library and student imports.
          Sections you list here appear as the Section options for that class.
        </p>
        {error && <Alert variant="error">{getErrorMessage(error)}</Alert>}
      </div>

      {isLoading ? (
        <div className="p-4">
          <ListSkeleton items={4} />
        </div>
      ) : activeClasses.length === 0 ? (
        <div className="space-y-4 p-4">
          <EmptyState
            icon={<GraduationCap className="h-10 w-10" />}
            title="No classes set up yet"
            description="Until a class is on this roster, class dropdowns across the app have nothing to offer."
          />
          {declaredRange.length > 0 && (
            <Alert variant="info">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  This school registered {declaredRange[0]} to{" "}
                  {declaredRange[declaredRange.length - 1]} at onboarding.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Wand2 className="h-4 w-4" />}
                  loading={seedFromRange.isPending}
                  onClick={() => seedFromRange.mutate()}
                >
                  Add those {declaredRange.length} classes
                </Button>
              </div>
            </Alert>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {activeClasses.map((row) => (
            <li
              key={row.id}
              className="group flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.class_name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {row.sections.length > 0 ? (
                    row.sections.map((section) => (
                      <Badge key={section} variant="default">
                        {section}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No sections — staff type one in when it applies
                    </span>
                  )}
                  {usage?.[row.class_name] ? (
                    <span className="text-xs text-muted-foreground">
                      · {usage[row.class_name].toLocaleString()} records
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => setEditing(row)}
                >
                  Sections
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={removePending.has(row.class_name)}
                  icon={<Trash2 className="h-4 w-4 text-destructive" />}
                  onClick={() => setRemoving(row)}
                  className="text-destructive opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {inactiveClasses.length > 0 && (
        <div className="border-t border-border/50 p-4 md:px-5">
          <p className="text-xs font-medium text-muted-foreground">
            Removed classes — still referenced by existing records; re-add one to
            offer it again
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {inactiveClasses.map((row) => (
              <Button
                key={row.id}
                size="sm"
                variant="outline"
                icon={<Plus className="h-3.5 w-3.5" />}
                loading={saveClass.isPending}
                onClick={() =>
                  saveClass.mutate({ className: row.class_name, sections: row.sections })
                }
              >
                {row.class_name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <AddClassModal
        open={addOpen}
        availableGrades={availableGrades}
        saving={saveClass.isPending}
        onClose={() => setAddOpen(false)}
        onSave={(className, sections) => saveClass.mutate({ className, sections })}
      />

      <EditSectionsModal
        row={editing}
        saving={updateSections.isPending}
        onClose={() => setEditing(null)}
        onSave={(sections) =>
          editing && updateSections.mutate({ className: editing.class_name, sections })
        }
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeClass.mutate(removing.class_name)}
        title={`Remove ${removing?.class_name ?? "class"}?`}
        description={
          removing && usage?.[removing.class_name]
            ? `It will stop appearing in class dropdowns. Its ${usage[
                removing.class_name
              ].toLocaleString()} existing records stay intact and you can re-add the class at any time.`
            : "It will stop appearing in class dropdowns. You can re-add it at any time."
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeClass.isPending}
      />
    </Panel>
  );
}

function AddClassModal({
  open,
  availableGrades,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  availableGrades: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (className: string, sections: string[]) => void;
}) {
  const CUSTOM = "__custom__";
  const [grade, setGrade] = useState("");
  const [custom, setCustom] = useState("");
  const [sectionsText, setSectionsText] = useState("");

  const className = grade === CUSTOM ? custom.trim() : grade;

  const close = () => {
    setGrade("");
    setCustom("");
    setSectionsText("");
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Add Class" size="md">
      <div className="space-y-4">
        <Select
          label="Class"
          placeholder="Select a class"
          options={[
            ...availableGrades.map((g) => ({ value: g, label: g })),
            // The escape hatch for a class the standard vocabulary doesn't model
            // (a stream, a combined section). Everything else stays canonical so
            // the label matches what attendance and the library already store.
            { value: CUSTOM, label: "Something else…" },
          ]}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          hint={
            availableGrades.length === 0
              ? "Every standard class is already on the roster."
              : undefined
          }
        />
        {grade === CUSTOM && (
          <Input
            label="Class name"
            placeholder="e.g. Class 11 Commerce"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
        <Input
          label="Sections"
          hint="Comma-separated, optional — e.g. A, B, C"
          placeholder="A, B"
          value={sectionsText}
          onChange={(e) => setSectionsText(e.target.value)}
        />
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          loading={saving}
          disabled={!className}
          onClick={() => onSave(className, textToSections(sectionsText))}
        >
          Add
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function EditSectionsModal({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: SchoolClass | null;
  saving: boolean;
  onClose: () => void;
  onSave: (sections: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Re-seed the field when a different class is opened, without an effect.
  if (row && row.id !== editingId) {
    setEditingId(row.id);
    setText(sectionsToText(row.sections));
  }

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title={`Sections — ${row?.class_name ?? ""}`}
      size="md"
      description="These become the Section options for this class across attendance, recordings and imports."
    >
      <Input
        label="Sections"
        hint="Comma-separated. Leave empty for a class that isn't split into sections."
        placeholder="A, B"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={saving} onClick={() => onSave(textToSections(text))}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
