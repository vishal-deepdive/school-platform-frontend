import { useRef, useState, useCallback } from 'react'
import { Upload, X, File as FileIcon } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

interface FileUploadProps {
  label?: string
  accept?: string
  multiple?: boolean
  maxSize?: number
  onChange: (files: File[]) => void
  error?: string
  hint?: string
}

/** Returns true when the file's MIME type is covered by the accept string. */
function isTypeAccepted(file: File, accept: string): boolean {
  return accept.split(',').some((token) => {
    const t = token.trim()
    if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -1))
    return file.type === t
  })
}

export function FileUpload({
  label,
  accept,
  multiple = false,
  maxSize,
  onChange,
  error,
  hint,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [rejectMessage, setRejectMessage] = useState<string | null>(null)

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      setRejectMessage(null)
      if (!incoming) return

      const rejections: string[] = []
      const accepted = Array.from(incoming).filter((f) => {
        if (accept && !isTypeAccepted(f, accept)) {
          rejections.push(`"${f.name}" is not a supported file type`)
          return false
        }
        if (maxSize && f.size > maxSize) {
          rejections.push(`"${f.name}" exceeds the ${formatFileSize(maxSize)} size limit`)
          return false
        }
        return true
      })

      if (rejections.length > 0) setRejectMessage(rejections[0])

      if (accepted.length === 0 && rejections.length > 0) return

      const updated = multiple ? [...files, ...accepted] : accepted.slice(0, 1)
      setFiles(updated)
      onChange(updated)
    },
    [files, multiple, maxSize, accept, onChange],
  )

  const remove = (index: number) => {
    setRejectMessage(null)
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onChange(updated)
  }

  const displayError = rejectMessage || error

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border/50 bg-accent/30 hover:border-border hover:bg-accent/50',
          displayError && 'border-destructive/50 bg-destructive/5 hover:border-destructive/70',
        )}
      >
        <Upload className={cn('h-8 w-8 transition-colors', dragOver ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop files here or <span className="text-primary hover:underline">browse</span>
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          {maxSize && (
            <p className="text-xs text-muted-foreground">Max size: {formatFileSize(maxSize)}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 transition-colors hover:bg-accent/30"
            >
              <FileIcon className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex-shrink-0 rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {displayError && (
        <p className="text-xs font-medium text-destructive mt-0.5">{displayError}</p>
      )}
    </div>
  )
}
