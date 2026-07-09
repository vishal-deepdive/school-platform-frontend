import { Building2 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";

/**
 * Shown inside an admin's dashboard analytics section when no school is
 * selected. These cross-domain sections scope to the active school, so without
 * one there is nothing school-specific to show. Rather than silently rendering
 * platform-wide numbers under a school-scoped heading (the old behaviour, which
 * made every school look identical), we prompt the admin to pick a school from
 * the switcher at the top of the dashboard.
 */
export function SelectSchoolPrompt({ label }: { label: string }) {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Select a school</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Choose a school from the switcher above to view its {label}.
        </p>
      </div>
    </Card>
  );
}
