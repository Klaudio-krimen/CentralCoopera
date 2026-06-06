'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    setLoading(true)
    setOpen(false)
    await fetch('/api/empresas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: empresaId, isActive: !isActive }),
    })
    router.refresh()
    setLoading(false)
  }

  if (loading) return <SpinnerGap size={14} className="animate-spin text-zinc-400" />

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
      >
        <DotsThree size={18} className="text-zinc-400" weight="bold" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-8 z-20 w-44 bg-white rounded-xl border border-zinc-100 shadow-card-hover py-1 animate-fade-up">
            <button
              onClick={toggle}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'text-zinc-600 hover:bg-zinc-50' : 'text-emerald-600 hover:bg-emerald-50'
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
