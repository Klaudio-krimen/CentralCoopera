'use client'

import { useRef, useState } from 'react'
import { Camera, X, SpinnerGap, ImageSquare } from '@phosphor-icons/react'
import Image from 'next/image'

export interface EvidenciaPhoto {
  id: string
  url: string       // local blob URL for preview
  path?: string     // server path after upload
  uploading?: boolean
  error?: boolean
}

interface EvidenciaUploaderProps {
  orderId: string
  photos: EvidenciaPhoto[]
  onChange: (photos: EvidenciaPhoto[]) => void
  maxPhotos?: number
  disabled?: boolean
}

export default function EvidenciaUploader({
  orderId,
  photos,
  onChange,
  maxPhotos = 5,
  disabled = false,
}: EvidenciaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return

    const available = maxPhotos - photos.length
    const toProcess = Array.from(files).slice(0, available)

    const previews: EvidenciaPhoto[] = toProcess.map((f) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      uploading: true,
    }))

    onChange([...photos, ...previews])

    // Upload each photo
    await Promise.all(
      previews.map(async (preview, idx) => {
        const file = toProcess[idx]
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('orderId', orderId)

          const res = await fetch('/api/evidencias', { method: 'POST', body: formData })
          const data = await res.json()

          onChange((prev: EvidenciaPhoto[]) =>
            prev.map((p) =>
              p.id === preview.id
                ? { ...p, path: data.path, uploading: false, error: !res.ok }
                : p
            )
          )
        } catch {
          onChange((prev: EvidenciaPhoto[]) =>
            prev.map((p) => (p.id === preview.id ? { ...p, uploading: false, error: true } : p))
          )
        }
      })
    )
  }

  const handleRemove = async (photo: EvidenciaPhoto) => {
    if (photo.path) {
      await fetch(`/api/evidencias?path=${encodeURIComponent(photo.path)}`, { method: 'DELETE' })
    }
    URL.revokeObjectURL(photo.url)
    onChange(photos.filter((p) => p.id !== photo.id))
  }

  const canAdd = photos.length < maxPhotos && !disabled

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200"
          >
            <Image
              src={photo.url}
              alt="Evidencia"
              fill
              className="object-cover"
              sizes="120px"
            />

            {/* Uploading overlay */}
            {photo.uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <SpinnerGap size={22} className="text-white animate-spin" />
              </div>
            )}

            {/* Error overlay */}
            {photo.error && (
              <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                <span className="text-white text-[10px] font-medium px-1 text-center">Error al subir</span>
              </div>
            )}

            {/* Remove button */}
            {!photo.uploading && (
              <button
                type="button"
                onClick={() => handleRemove(photo)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={12} className="text-white" weight="bold" />
              </button>
            )}
          </div>
        ))}

        {/* Add photo button */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 hover:border-emerald-400 bg-zinc-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-1.5 transition-colors group"
          >
            <Camera size={24} className="text-zinc-400 group-hover:text-emerald-500 transition-colors" />
            <span className="text-[11px] text-zinc-400 group-hover:text-emerald-600 transition-colors font-medium">
              Foto
            </span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <ImageSquare size={14} />
          <span>Mínimo 1 foto requerida</span>
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-zinc-400">
        {photos.length}/{maxPhotos} fotos
        {photos.length >= maxPhotos && (
          <span className="ml-2 text-amber-600 font-medium">Límite alcanzado</span>
        )}
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => ((e.target as HTMLInputElement).value = '')}
      />
    </div>
  )
}
