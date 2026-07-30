'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DotsThree, ToggleLeft, ToggleRight, SpinnerGap } from '@phosphor-icons/react'

export default function EmpresaActions({
  empresaId,
  isActive,
}: {
  empresaId: string
  isActive:  boolean
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const router = useRouter()

  const toggle = async () => {
    const verb = isActive ? 'desactivar' : 'activar'
    if (!confirm(`¿Seguro que quieres ${verb} esta empresa?`)) {
      setOpen(false)
      return
    }
    setOpen(false)
    setLoading(true)
    try {
      const res = await fetch('/api/empresas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: empresaId, isActive: !isActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(isActive ? 'Empresa desactivada' : 'Empresa activada')
      router.refresh()
    } catch {
      toast.error(`No se pudo ${verb} la empresa`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SpinnerGap size={14} className="animate-spin text-crm-muted" />

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Acciones de la empresa"
        className="w-7 h-7 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
      >
        <DotsThree size={18} className="text-crm-muted" weight="bold" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-8 z-20 w-44 bg-crm-card rounded-xl border border-crm-border shadow-card-hover py-1 animate-fade-up">
            <button
              onClick={toggle}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'text-crm-muted hover:bg-crm-secondary' : 'text-crm-success hover:bg-crm-secondary'
              }`}
            >
              {isActive ? (
                <>
                  <ToggleLeft size={15} />
                  Desactivar empresa
                </>
              ) : (
                <>
                  <ToggleRight size={15} />
                  Activar empresa
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
