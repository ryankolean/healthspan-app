import { useState, useRef } from 'react'
import { Upload, FileImage, Loader2, ShieldCheck } from 'lucide-react'

interface UploadZoneProps {
  onFile: (base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') => void
  loading?: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AcceptedMimeType = typeof ACCEPTED_TYPES[number]

export default function UploadZone({ onFile, loading = false }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    setError('')
    if (!ACCEPTED_TYPES.includes(file.type as AcceptedMimeType)) {
      setError('Please upload a JPG, PNG, or WebP image of your lab document.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // Strip data URL prefix — keep only the base64 portion
      const base64 = result.split(',')[1]
      onFile(base64, file.type as AcceptedMimeType)
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-[18px] p-10 flex flex-col items-center gap-3 transition-colors ${
          loading
            ? 'cursor-not-allowed opacity-60 border-white/10'
            : dragging
            ? 'border-brand-400 bg-brand-500/10 cursor-pointer'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02] cursor-pointer'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={32} className="text-brand-400 animate-spin" />
            <p className="text-sm text-gray-400">Parsing with Claude Vision…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <FileImage size={22} className="text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">Drop your lab document here</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse — JPG, PNG, WebP</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <Upload size={11} />
              PDF support coming soon
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 text-xs text-gray-600 px-1">
        <ShieldCheck size={12} className="flex-shrink-0 mt-0.5 text-gray-500" />
        <span>
          Your document is sent only to Anthropic's API for parsing. It is never stored on any server.
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  )
}
