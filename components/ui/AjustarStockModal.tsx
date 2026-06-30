'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowsLeftRight, X, SpinnerGap, Warning } from '@phosphor-icons/react'

const TIPOS = [
  { value: 'ENTRADA', label: 'Entrada (suma)' },
  { value: 'SALIDA', label: 'Salida (resta)' },
  { value: 'AJUSTE', label: 'Ajuste por conteo (fija el valor)' },
]

export default function AjustarStockModal({
  itemId,
  itemName,
  unit,
}: {
  itemId: string
  itemName: string
  unit: string
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({ type: 'ENTRADA', quantity: '', reason: '' })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ type: 'ENTRADA', quantity: '', reason: '' })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
      >
        <ArrowsLeftRight size={13} weight="bold" />
        Ajustar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Ajustar stock</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{itemName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Tipo de movimiento</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="input-base"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">
                  {form.type === 'AJUSTE' ? `Cantidad final (${unit})` : `Cantidad (${unit})`}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  placeholder="0"
                  className="input-base font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Motivo (opcional)</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                  placeholder="Ej: conteo mensual, despacho a cliente..."
                  className="input-base"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  <Warning size={15} weight="fill" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.quantity}
                  className="btn-primary flex-1"
                >
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
