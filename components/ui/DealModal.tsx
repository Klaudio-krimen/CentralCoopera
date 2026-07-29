'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, X, SpinnerGap, Warning } from '@phosphor-icons/react'

interface ContactoOption { id: string; name: string }

export default function DealModal({
  companyId,
  contactos,
}: {
  companyId: string
  contactos: ContactoOption[]
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    title: '', value: '', probability: '20', contactId: '', expectedClose: '', notes: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          contactId: form.contactId || null,
          title: form.title,
          value: form.value || 0,
          probability: form.probability || 0,
          expectedClose: form.expectedClose || null,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ title: '', value: '', probability: '20', contactId: '', expectedClose: '', notes: '' })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm py-2 px-3">
        <Target size={15} />
        Deal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Nuevo deal</h2>
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
                <label className="block text-sm font-medium text-zinc-700">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Ej: Suministro mensual de pallets"
                  className="input-base"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Valor (CLP)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.value}
                    onChange={(e) => set('value', e.target.value)}
                    placeholder="0"
                    className="input-base font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Probabilidad (%)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={(e) => set('probability', e.target.value)}
                    className="input-base font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Contacto</label>
                <select value={form.contactId} onChange={(e) => set('contactId', e.target.value)} className="input-base">
                  <option value="">Sin contacto asignado</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Cierre estimado</label>
                <input
                  type="date"
                  value={form.expectedClose}
                  onChange={(e) => set('expectedClose', e.target.value)}
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
                <button type="submit" disabled={loading || !form.title} className="btn-primary flex-1">
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : 'Crear deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
