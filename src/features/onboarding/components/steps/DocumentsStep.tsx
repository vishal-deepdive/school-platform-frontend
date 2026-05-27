import { useCallback } from 'react'
import { FileUpload } from '@/components/ui/FileUpload'
import { Check } from 'lucide-react'

export interface DocumentsStepProps {
  certificate: File | null
  setCertificate: (f: File | null) => void
  certError: string
  setCertError: (e: string) => void
}

export function DocumentsStep({
  certificate,
  setCertificate,
  certError,
  setCertError,
}: DocumentsStepProps) {
  const handleChange = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setCertificate(files[0])
        setCertError('')
      } else {
        setCertificate(null)
      }
    },
    [setCertificate, setCertError],
  )

  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upload your school's{' '}
          <strong className="text-foreground">registration certificate</strong>,
          UDISE affiliation letter, or any official identity document issued by your board or
          government authority.
        </p>
      </div>

      <FileUpload
        label="School Certificate *"
        accept="application/pdf,image/jpeg,image/png"
        maxSize={10 * 1024 * 1024}
        onChange={handleChange}
        error={certError}
        hint="PDF, JPEG or PNG — max 10 MB"
      />

      {certificate && !certError && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Certificate ready to upload</p>
        </div>
      )}
    </div>
  )
}
