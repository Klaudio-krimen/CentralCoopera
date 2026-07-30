'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Reclasifica TODOS los contactos activos por reglas (lib/scoring.ts) —
// equivalente al comando /classify de auto-crm en su modo "sin API key".
export default function ClassifyAllButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contactos/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reclasificar')
      toast.success(`${data.count} contacto${data.count !== 1 ? 's' : ''} reclasificado${data.count !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reclasificar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crm-card space-y-3">
      <div>
        <p className="text-base font-medium text-crm-foreground">Clasificación de leads</p>
        <p className="text-xs text-crm-muted mt-0.5">
          Recalcula score y temperatura de todos los contactos por reglas: completitud de
          datos, actividad reciente y valor de deals. No usa IA — es la misma fórmula que
          auto-crm usa sin API key.
        </p>
      </div>
      <button onClick={handleClick} disabled={loading} className="crm-btn-outline">
        {loading ? 'Reclasificando...' : 'Reclasificar todos los contactos'}
      </button>
    </div>
  )
}
