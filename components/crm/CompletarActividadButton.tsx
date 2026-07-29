'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SpinnerGap } from '@phosphor-icons/react'

export default function CompletarActividadButton({ activityId }: { activityId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/actividades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activityId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Actividad completada')
      router.refresh()
    } catch {
      toast.error('No se pudo completar la actividad')
      setLoading(false)
    }
  }

  if (loading) return <SpinnerGap size={12} className="animate-spin text-zinc-400" />

  return (
    <button
      onClick={handleComplete}
      className="text-[11px] px-2 py-0.5 rounded-full border border-crm-warning/40 text-crm-warning hover:bg-crm-warning/10 transition-colors"
    >
      Completar
    </button>
  )
}
