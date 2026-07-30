'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
      toast.success('Actividad registrada')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="crm-btn-outline text-sm">
        <ClockClockwise size={15} />
        Registrar
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-crm-card rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-crm-foreground">Registrar actividad</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-crm-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {needsCompanySelect && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Empresa *</label>
                  <select
                    value={form.companyId}
                    onChange={(e) => set('companyId', e.target.value)}
                    className="crm-input"
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
                <label className="block text-sm font-medium text-crm-foreground">Tipo</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)} className="crm-input">
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Descripción *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Ej: Llamada para coordinar visita al taller"
                  className="crm-input"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Programada para (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set('scheduledAt', e.target.value)}
                  className="crm-input"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-crm-destructive/10 border border-crm-destructive/20 text-sm text-crm-destructive">
                  <Warning size={15} weight="fill" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="crm-btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={loading || !form.description} className="crm-btn-primary flex-1">
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
