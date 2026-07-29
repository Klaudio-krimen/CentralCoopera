'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClockClockwise, X, SpinnerGap, Warning } from '@phosphor-icons/react'

const TIPOS = [
  { value: 'LLAMADA', label: 'Llamada' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REUNION', label: 'Reunión' },
  { value: 'NOTA', label: 'Nota' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
]

interface EmpresaOption { id: string; name: string }

export default function ActividadModal({
  companyId,
  contactId,
  dealId,
  empresas,
}: {
  companyId?: string
  contactId?: string
  dealId?: string
  empresas?: EmpresaOption[]
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    companyId: companyId ?? '',
    type: 'NOTA',
    description: '',
    scheduledAt: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const needsCompanySelect = !companyId && empresas

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyId ?? form.companyId,
          contactId: contactId || null,
          dealId: dealId || null,
          type: form.type,
          description: form.description,
          scheduledAt: form.scheduledAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ companyId: companyId ?? '', type: 'NOTA', description: '', scheduledAt: '' })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <ClockClockwise size={15} />
        Registrar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Registrar actividad</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {needsCompanySelect && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Empresa *</label>
                  <select
                    value={form.companyId}
                    onChange={(e) => set('companyId', e.target.value)}
                    className="input-base"
                    required
                  >
                    <option value="">Selecciona una empresa...</option>
                    {empresas!.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Tipo</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-base">
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Descripción *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Ej: Llamada para coordinar visita al taller"
                  className="input-base"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Programada para (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set('scheduledAt', e.target.value)}
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
                <button type="submit" disabled={loading || !form.description} className="btn-primary flex-1">
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
