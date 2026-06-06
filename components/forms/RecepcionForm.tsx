'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpinnerGap, CheckCircle, Warning } from '@phosphor-icons/react'

interface OrderItem {
  id: string
  materialType: string
  declaredQuantity: number
  unit: string
}

interface Order {
  id: string
  items: OrderItem[]
}

interface ReceivedItem {
  itemId: string
  receivedQuantity: string
}

function calcDiff(declared: number, received: number): { pct: number; label: string; color: string } | null {
  if (!received || isNaN(received)) return null
  const pct = Math.abs(declared - received) / declared * 100
  if (pct <= 2)  return { pct, label: `${pct.toFixed(1)}%`, color: 'text-emerald-600' }
  if (pct <= 5)  return { pct, label: `${pct.toFixed(1)}%`, color: 'text-amber-600' }
  if (pct <= 20) return { pct, label: `${pct.toFixed(1)}%`, color: 'text-orange-600' }
  return { pct, label: `${pct.toFixed(1)}%`, color: 'text-red-600' }
}

export default function RecepcionForm({ order }: { order: Order }) {
  const router = useRouter()

  const [received, setReceived] = useState<ReceivedItem[]>(
    order.items.map((i) => ({ itemId: i.id, receivedQuantity: '' }))
  )
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setQty = (itemId: string, qty: string) => {
    setReceived((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, receivedQuantity: qty } : r)))
  }

  const getQty = (itemId: string) =>
    received.find((r) => r.itemId === itemId)?.receivedQuantity ?? ''

  const allFilled = received.every((r) => r.receivedQuantity.trim() !== '' && !isNaN(parseFloat(r.receivedQuantity)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ordenes/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          receivedItems: received.map((r) => ({
            itemId: r.itemId,
            receivedQuantity: parseFloat(r.receivedQuantity),
          })),
          observations,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/recepcion/dashboard?received=${order.id}`)
    } catch (e: any) {
      setError(e.message ?? 'Error al registrar recepción')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Items */}
      <div className="card divide-y divide-zinc-50">
        {order.items.map((item) => {
          const qty   = getQty(item.id)
          const diff  = qty ? calcDiff(item.declaredQuantity, parseFloat(qty)) : null

          return (
            <div key={item.id} className="px-4 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-700 capitalize">{item.materialType}</p>
                <p className="text-xs text-zinc-400 font-mono">
                  Declarado: {item.declaredQuantity} {item.unit}
                </p>
              </div>

              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder={`Cantidad recibida (${item.unit})`}
                  value={qty}
                  onChange={(e) => setQty(item.id, e.target.value)}
                  className="input-base text-sm pr-16"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  {item.unit}
                </span>
              </div>

              {/* Discrepancy indicator */}
              {diff && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${diff.color}`}>
                  {diff.pct > 2 ? <Warning size={13} weight="fill" /> : <CheckCircle size={13} weight="fill" />}
                  <span>
                    {diff.pct <= 2
                      ? `Dentro de tolerancia (${diff.label})`
                      : `Diferencia: ${diff.label}`}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Observations */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">Observaciones (opcional)</label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Ej: El material llegó bien embalado. Sin novedades."
          rows={3}
          className="input-base resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          <Warning size={15} weight="fill" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!allFilled || loading}
        className="btn-primary w-full"
      >
        {loading ? (
          <>
            <SpinnerGap size={16} className="animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <CheckCircle size={18} weight="fill" />
            Confirmar recepción
          </>
        )}
      </button>
    </form>
  )
}
