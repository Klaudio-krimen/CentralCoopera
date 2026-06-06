'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DotsThree, LockSimple, LockSimpleOpen, SpinnerGap } from '@phosphor-icons/react'

interface Props {
  userId:   string
  isActive: boolean
}

export default function UsuarioActions({ userId, isActive }: Props) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    setOpen(false)
    await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, isActive: !isActive }),
    })
    router.refresh()
    setLoading(false)
  }

  if (loading) {
    return <SpinnerGap size={16} className="animate-spin text-zinc-400" />
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
      >
        <DotsThree size={18} className="text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl border border-zinc-100 shadow-card-hover py-1 animate-fade-up">
            <button
              onClick={toggle}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {isActive ? (
                <>
                  <LockSimple size={14} />
                  Desactivar
                </>
              ) : (
                <>
                  <LockSimpleOpen size={14} />
                  Activar
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
