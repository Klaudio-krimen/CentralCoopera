'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowsClockwise } from '@phosphor-icons/react'

// Dispara la clasificación por reglas (lib/scoring.ts) para un contacto —
// recalcula score y temperatura a partir de completitud de datos, actividad
// y valor de deals. No se ejecuta sola: el usuario decide cuándo pedirla,
// para no pisar una temperatura que Ventas haya puesto a mano a propósito.
export default function RecalculateScoreButton({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contactos/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al recalcular')
      const [result] = data.updated
      toast.success(`Score: ${result.score}/100 · ${result.temperature}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo recalcular')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-crm-muted hover:text-crm-primary transition-colors disabled:opacity-50"
    >
      <ArrowsClockwise size={12} className={loading ? 'animate-spin' : ''} />
      Recalcular
    </button>
  )
}
