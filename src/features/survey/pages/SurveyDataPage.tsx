import { Link } from "react-router-dom";
import { SurveyDataView } from "@/features/survey/components";
import { Alert } from "@/shared/components/ui/Alert";

export function SurveyDataPage() {
  return (
    <div className="space-y-6">
      {/* Says what people actually get wrong here, rather than restating
          "destructive" above three buttons that already read as destructive. */}
      <Alert variant="warning" title="Deletions are permanent">
        This removes imported responses from the platform. The{" "}
        <Link to="/survey/source" className="font-medium underline underline-offset-2">
          connected sheets
        </Link>{" "}
        are untouched — the original rows stay in Google Sheets, and a later sync will
        import them again unless you disconnect the sheet first.
      </Alert>

      <SurveyDataView />
    </div>
  );
}
