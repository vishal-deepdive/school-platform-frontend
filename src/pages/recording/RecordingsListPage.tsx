import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, RefreshCw, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { formatDate, getErrorMessage } from '@/lib/utils'
import { recordingApi } from '@/api/recording'
import { usePagination } from '@/hooks/usePagination'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import type { Recording } from '@/types/recording'

const PAGE_SIZE = 10

export function RecordingsListPage() {
  const qc = useQueryClient()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['recordings'],
    queryFn: () => recordingApi.listRecordings({ limit: 999, offset: 0 }),
    staleTime: 60_000,
  })

  const total = data?.total ?? 0
  const { offset, currentPage, totalPages, hasNext, hasPrev, goNext, goPrev } =
    usePagination(PAGE_SIZE, total)

  const pagedRecordings = data?.recordings.slice(offset, offset + PAGE_SIZE) ?? []

  const { mutate: deleteRec, isPending: deleting } = useMutation({
    mutationFn: (id: string) => recordingApi.deleteRecording(id),
    onSuccess: () => {
      toast.success('Recording deleted')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['recordings'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handlePreview = async (rec: Recording) => {
    setPreviewId(rec.id)
    setMarkdown(null)
    try {
      const md = await recordingApi.getRecordingMarkdown(rec.id)
      setMarkdown(md)
    } catch {
      setMarkdown('*Study materials not yet available for this recording.*')
    }
  }

  if (isLoading) return <PageSpinner />
  if (isError)   return <Alert variant="error">Failed to load recordings.</Alert>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Recordings</h1>
          <p className="mt-1 text-sm text-gray-500">{total} recording(s) total</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      <Card padding="none">
        <CardHeader title="All Recordings" className="px-6 pt-6" />
        {pagedRecordings.length === 0 ? (
          <div className="px-6 pb-8 text-center text-sm text-gray-400">
            No recordings yet.{' '}
            <Link to="/recording/upload" className="text-indigo-600 hover:underline">
              Upload your first recording.
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pagedRecordings.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {rec.audio_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge>{rec.school_name}</Badge>
                    <Badge variant="info">Class {rec.class}</Badge>
                    {rec.section && <Badge>{rec.section}</Badge>}
                    {rec.subject && <Badge variant="default">{rec.subject}</Badge>}
                    {rec.recording_subject && (
                      <Badge variant="purple">{rec.recording_subject}</Badge>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(rec.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Eye className="h-4 w-4" />}
                    onClick={() => handlePreview(rec)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setConfirmDelete(rec.id)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={goPrev}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={goNext}>
            Next
          </Button>
        </div>
      )}

      <Modal
        open={!!previewId}
        onClose={() => { setPreviewId(null); setMarkdown(null) }}
        title="Study Materials"
        size="xl"
      >
        {!markdown ? (
          <PageSpinner />
        ) : (
          <div className="prose prose-sm max-w-none overflow-y-auto max-h-[60vh]">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Recording"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this recording? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() => confirmDelete && deleteRec(confirmDelete)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
