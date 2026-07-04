import { SurveyDataView } from "@/features/survey/components";
import { Alert } from "@/shared/components/ui/Alert";

export function SurveyDataPage() {
  return (
    <div className="space-y-6">
      <Alert variant="warning" title="Destructive Operations">
        Deleting survey data is permanent. This action cannot be undone.
      </Alert>

      <SurveyDataView />
    </div>
  );
}
