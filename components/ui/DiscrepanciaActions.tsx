'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpinnerGap, MagnifyingGlass, CheckCircle, ArrowRight } from '@phosphor-icons/react'
import Link from 'next/link'

interface Props {
  discrepanciaId: string
  currentStatus: string
  orderId: string
}

export default function DiscrepanciaActions({ discrepanciaId, currentStatus, orderId }: Props) {
  const [loading, setLoading] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [note, setNote] = useState('')
  const router = useRouter()

  const updateStatus = async (status: string, resolutionNote?: string) => {
    setLoading(true)
    await fetch(`/api/discrepancias`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: discrepanciaId, status, resolutionNote }),
    })
    router.refresh()
    setLoading(false)
    setShowResolve(false)
  }

  if (loading) {
    return (
      <SpinnerGap size={18} className="animate-spin text-zinc-400 shrink-0" />
    )
  }

  return (
    <div className="shrink-0 space-y-2">
      <Link
        href={`/admin/ordenes/${orderId}`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors whitespace-nowrap"
      >
        <MagnifyingGlass size={13} />
        Ver orden
      </Link>

      {currentStatus === 'PENDIENTE' && (
        <button
          onClick={() => updateStatus('EN_INVESTIGACION')}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
        >
          <ArrowRight size={13} />
          Investigar
        </button>
      )}

      {!showResolve ? (
        <button
          onClick={() => setShowResolve(true)}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 transition-colors whitespace-nowrap"
        >
          <CheckCircle size={13} />
          Resolver
        </button>
      ) : (
        <div className="space-y-1.5 w-56">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota de resolución..."
            rows={2}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => updateStatus('RESUELTA', note)}
              disabled={!note.trim()}
              className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-40 hover:bg-emerald-600 transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowResolve(false)}
              className="px-2.5 text-xs py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
