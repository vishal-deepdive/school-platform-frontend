import { SurveyDataView } from '@/features/survey/components'
import { Alert } from '@/components/ui/Alert'

export function SurveyDataPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Survey Data Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delete survey records by roll number, school, or class.
        </p>
      </div>

      <Alert variant="warning" title="Destructive Operations">
        Deleting survey data is permanent. This action cannot be undone.
      </Alert>

      <SurveyDataView />
    </div>
  )
}
