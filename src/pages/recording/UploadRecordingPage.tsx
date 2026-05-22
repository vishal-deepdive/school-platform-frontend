import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Mic2, CheckCircle2, XCircle, Clock, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { recordingApi } from '@/api/recording'
import { getErrorMessage } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FileUpload } from '@/components/ui/FileUpload'
import { Badge } from '@/components/ui/Badge'
import type { JobStatus } from '@/types/recording'

const statusConfig: Record<JobStatus, { label: string; color: 'default' | 'info' | 'success' | 'danger'; icon: React.ReactNode }> = {
  pending: { label: 'Queued', color: 'default', icon: <Clock className="h-4 w-4" /> },
  running: { label: 'Processing', color: 'info', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  completed: { label: 'Completed', color: 'success', icon: <CheckCircle2 className="h-4 w-4" /> },
  failed: { label: 'Failed', color: 'danger', icon: <XCircle className="h-4 w-4" /> },
}

export function UploadRecordingPage() {
  const [file, setFile] = useState<File[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [params, setParams] = useState({
    school_name: '',
    class_name: '',
    section: '',
    subject: '',
    recording_subject: '',
  })

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: ({ f, p }: { f: File; p: Record<string, string> }) =>
      recordingApi.processAudio(f, p),
    onSuccess: (data) => {
      setJobId(data.job_id)
      toast.success('Upload successful! Processing your recording…')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { data: jobStatus } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => recordingApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'running' ? 3000 : false
    },
  })

  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobId && !markdown) {
      recordingApi.getResultMarkdown(jobId).then(setMarkdown).catch(() => {})
    }
  }, [jobStatus?.status, jobId, markdown])

  const handleUpload = () => {
    if (!file[0]) { toast.error('Please select an audio file'); return }
    if (!params.school_name || !params.class_name) {
      toast.error('School name and class are required')
      return
    }
    upload({ f: file[0], p: params })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Lecture Recording</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload audio to generate transcripts, notes, summaries, and exam questions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recording Details" />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="School Name"
                placeholder="Delhi Public School"
                value={params.school_name}
                onChange={(e) => setParams((p) => ({ ...p, school_name: e.target.value }))}
              />
              <Input
                label="Class"
                placeholder="10"
                value={params.class_name}
                onChange={(e) => setParams((p) => ({ ...p, class_name: e.target.value }))}
              />
              <Input
                label="Section (optional)"
                placeholder="A"
                value={params.section}
                onChange={(e) => setParams((p) => ({ ...p, section: e.target.value }))}
              />
              <Input
                label="Subject (optional)"
                placeholder="Mathematics"
                value={params.subject}
                onChange={(e) => setParams((p) => ({ ...p, subject: e.target.value }))}
              />
              <Input
                label="Recording Topic (optional)"
                placeholder="Chapter 5: Quadratic Equations"
                className="col-span-2"
                value={params.recording_subject}
                onChange={(e) => setParams((p) => ({ ...p, recording_subject: e.target.value }))}
              />
            </div>

            <FileUpload
              label="Audio File"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/*"
              maxSize={100 * 1024 * 1024}
              onChange={setFile}
              hint="MP3, WAV, M4A. Max 100 MB."
            />

            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!!jobId && (jobStatus?.status === 'pending' || jobStatus?.status === 'running')}
              icon={<Mic2 className="h-4 w-4" />}
            >
              {uploading ? 'Uploading…' : 'Process Recording'}
            </Button>
          </div>
        </Card>

        {jobId && jobStatus && (
          <Card>
            <CardHeader title="Processing Status" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {statusConfig[jobStatus.status].icon}
                <div>
                  <Badge variant={statusConfig[jobStatus.status].color}>
                    {statusConfig[jobStatus.status].label}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">Job ID: {jobId}</p>
                </div>
              </div>

              {jobStatus.progress && (
                <p className="text-sm text-gray-600">{jobStatus.progress}</p>
              )}

              {jobStatus.status === 'running' && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">
                    AI is transcribing and generating study materials. This may take 1–3 minutes.
                  </p>
                </div>
              )}

              {jobStatus.status === 'failed' && (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-700">{jobStatus.error ?? 'Processing failed.'}</p>
                </div>
              )}

              {jobStatus.status === 'completed' && !markdown && (
                <p className="text-sm text-gray-500">Loading study materials…</p>
              )}
            </div>
          </Card>
        )}
      </div>

      {markdown && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Generated Study Materials</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([markdown], { type: 'text/markdown' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `study-materials-${jobId}.md`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Download .md
            </Button>
          </div>
          <div className="prose prose-sm max-w-none overflow-y-auto max-h-[60vh] rounded-lg bg-gray-50 p-4">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  )
}
