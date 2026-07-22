import { Users } from "lucide-react";
import { Select } from "@/shared/components/ui/Select";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import type { ChildItem } from "@/features/attendance/types";

interface ChildSelectorProps {
  childrenList: ChildItem[];
  value: string | null;
  onChange: (roll: string) => void;
}

function childLabel(c: ChildItem): string {
  const name = c.student_name || `Roll ${c.roll_no}`;
  const klass = c.class_name
    ? ` · Class ${c.class_name}${c.section ? ` ${c.section}` : ""}`
    : "";
  return `${name}${klass}`;
}

/**
 * Child picker for parents linked to more than one student. Callers render it
 * only when there is a real choice (see `useMyChildren().showSelector`); a
 * single-child parent needs no selector because the server auto-resolves.
 */
export function ChildSelector({ childrenList, value, onChange }: ChildSelectorProps) {
  return (
    <FilterBar title="Viewing child" icon={<Users className="h-4 w-4" />}>
      <Select
        label="Child"
        options={childrenList.map((c) => ({ value: c.roll_no, label: childLabel(c) }))}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </FilterBar>
  );
}
