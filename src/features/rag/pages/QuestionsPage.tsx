import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { HelpCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { ragApi } from '@/api/rag'
import { getErrorMessage, downloadFile } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import type { QuestionType, Difficulty, RagFilters } from '@/types/rag'
import type { SelectOption } from '@/types/common'

const qTypeOptions: SelectOption[] = [
  { value: 'MCQ', label: 'Multiple Choice (MCQ)' },
  { value: 'BRIEF', label: 'Short Answer (Brief)' },
]

const difficultyOptions: SelectOption[] = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
]

const difficultyBadge: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
}

export function QuestionsPage() {
  const [filters, setFilters] = useState<RagFilters>({})
  const [qType, setQType] = useState<QuestionType>('MCQ')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [numQuestions, setNumQuestions] = useState(10)
  const [marks, setMarks] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<string | null>(null)

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['rag', 'metadata'],
    queryFn: () => ragApi.getMetadata(),
    staleTime: 10 * 60_000,
  })

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () =>
      ragApi.generateQuestions({
        filters,
        q_type: qType,
        difficulty,
        num_questions: numQuestions,
        ...(marks != null && { marks }),
      }),
    onSuccess: (data) => {
      setResult(data.content)
      toast.success(`${numQuestions} question(s) generated!`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const bookOptions: SelectOption[] = meta?.books?.map((b) => ({ value: b, label: b })) ?? []
  const subjectOptions: SelectOption[] = meta?.subjects?.map((s) => ({ value: s, label: s })) ?? []
  const chapterOptions: SelectOption[] = meta?.chapters?.map((c) => ({ value: c, label: c })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Questions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create exam-ready MCQ or short-answer questions from textbook content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Configuration" />

          {metaLoading ? <PageSpinner /> : (
            <div className="space-y-4">
              <Select
                label="Book"
                options={[{ value: '', label: 'All books' }, ...bookOptions]}
                value={filters.book ?? ''}
                onChange={(e) => setFilters((p) => ({ ...p, book: e.target.value || undefined }))}
              />
              <Select
                label="Subject"
                options={[{ value: '', label: 'All subjects' }, ...subjectOptions]}
                value={filters.subject ?? ''}
                onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value || undefined }))}
              />
              <Select
                label="Chapter"
                options={[{ value: '', label: 'All chapters' }, ...chapterOptions]}
                value={filters.chapter_name?.[0] ?? ''}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    chapter_name: e.target.value ? [e.target.value] : undefined,
                  }))
                }
              />
            </div>
          )}

          <div className="mt-4 space-y-4">
            <Select
              label="Question Type"
              options={qTypeOptions}
              value={qType}
              onChange={(e) => setQType(e.target.value as QuestionType)}
            />
            <Select
              label="Difficulty"
              options={difficultyOptions}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            />
            <Input
              label="Number of Questions"
              type="number"
              min={1}
              max={100}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
            />
            <Input
              label="Marks per Question (optional)"
              type="number"
              min={1}
              max={100}
              placeholder="Leave blank for none"
              value={marks ?? ''}
              onChange={(e) => setMarks(e.target.value ? parseInt(e.target.value) : undefined)}
            />

            <Button
              onClick={() => generate()}
              loading={isPending}
              icon={<HelpCircle className="h-4 w-4" />}
              className="w-full"
            >
              {isPending ? 'Generating…' : 'Generate Questions'}
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          {result ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Generated Questions</h3>
                  <Badge variant={difficultyBadge[difficulty]}>{difficulty}</Badge>
                  <Badge variant="info">{qType}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => downloadFile(result, `questions-${qType}-${difficulty}.md`)}
                >
                  Download
                </Button>
              </div>
              <div className="prose prose-sm max-w-none overflow-y-auto max-h-[65vh] rounded-lg bg-gray-50 p-4">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </Card>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
              <HelpCircle className="h-12 w-12 text-gray-300" />
              <div>
                <p className="font-semibold text-gray-500">No questions generated yet</p>
                <p className="mt-1 text-sm text-gray-400">
                  Configure your settings and click Generate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
