import { SurveySearchView } from '@/features/survey/components'

export function SurveySearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Survey Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask questions about student feedback — the AI detects intent and queries the right data.
        </p>
      </div>

      <SurveySearchView />
    </div>
  )
}
