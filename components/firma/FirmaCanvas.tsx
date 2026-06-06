'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import { Eraser, PenNib } from '@phosphor-icons/react'

interface FirmaCanvasProps {
  onFirmaChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export default function FirmaCanvas({ onFirmaChange, disabled = false }: FirmaCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const padRef     = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty]   = useState(true)
  const [hasDrawn, setHasDrawn] = useState(false)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !padRef.current) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const data = padRef.current.toData()
    canvas.width  = canvas.offsetWidth  * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)
    padRef.current.fromData(data)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width  = canvas.offsetWidth  * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: 'rgb(24,24,27)',
      minWidth: 1.5,
      maxWidth: 3.5,
      velocityFilterWeight: 0.7,
    })

    padRef.current.addEventListener('afterUpdateStroke', () => {
      setIsEmpty(false)
      setHasDrawn(true)
      onFirmaChange(padRef.current!.toDataURL('image/png'))
    })

    window.addEventListener('resize', resizeCanvas)
    return () => {
      padRef.current?.off()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [onFirmaChange, resizeCanvas])

  const handleClear = () => {
    padRef.current?.clear()
    setIsEmpty(true)
    onFirmaChange(null)
  }

  return (
    <div className="space-y-3">
      {/* Canvas wrapper */}
      <div
        className={`relative rounded-2xl overflow-hidden transition-colors duration-200 ${
          disabled
            ? 'bg-zinc-50 border-2 border-dashed border-zinc-200 opacity-60 pointer-events-none'
            : isEmpty
            ? 'bg-white border-2 border-dashed border-zinc-300 hover:border-emerald-400'
            : 'bg-white border-2 border-emerald-400 shadow-emerald-glow'
        }`}
        style={{ height: 220 }}
      >
        {/* Hint overlay (shown when empty) */}
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <PenNib size={28} className="text-zinc-300" />
            <p className="text-zinc-400 text-sm">Firme aquí con el dedo</p>
          </div>
        )}

        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${hasDrawn && !isEmpty ? 'text-emerald-600' : 'text-zinc-400'}`}>
          {hasDrawn && !isEmpty ? 'Firma capturada' : 'Sin firma todavía'}
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <Eraser size={14} />
            Limpiar firma
          </button>
        )}
      </div>
    </div>
  )
}
