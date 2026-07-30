'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, X, SpinnerGap, Warning } from '@phosphor-icons/react'
import { CONTACT_SOURCE_LABELS } from '@/lib/utils'

interface ContactoInitial {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  temperature?: 'FRIO' | 'TIBIO' | 'CALIENTE'
  score?: number
  source?: keyof typeof CONTACT_SOURCE_LABELS
}

interface EmpresaOption {
  id: string
  name: string
}

export default function ContactoModal({
  companyId,
  empresas,
  initialData,
  trigger,
}: {
  companyId?: string
  empresas?: EmpresaOption[]
  initialData?: ContactoInitial
  trigger?: React.ReactNode
}) {
  const isEdit = !!initialData
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    companyId: companyId ?? '',
    name: initialData?.name ?? '',
    role: initialData?.role ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    notes: initialData?.notes ?? '',
    temperature: initialData?.temperature ?? 'FRIO',
    score: String(initialData?.score ?? 0),
    source: initialData?.source ?? 'OTRO',
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = isEdit
        ? { id: initialData!.id, ...form }
        : { ...form, companyId: companyId ?? form.companyId }
      const res = await fetch('/api/contactos', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      toast.success(isEdit ? 'Contacto actualizado' : 'Contacto creado')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const needsCompanySelect = !companyId && !isEdit && empresas

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <button onClick={() => setOpen(true)} className="crm-btn-outline text-sm py-2 px-3">
          <UserPlus size={15} />
          Contacto
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-crm-card rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-crm-foreground">{isEdit ? 'Editar contacto' : 'Nuevo contacto'}</h2>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Nombre completo"
                    className="crm-input"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Cargo</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                    placeholder="Ej: Jefe de compras"
                    className="crm-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="correo@empresa.cl"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Teléfono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+56 9 xxxx xxxx"
                    className="crm-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Temperatura</label>
                  <select
                    value={form.temperature}
                    onChange={(e) => set('temperature', e.target.value)}
                    className="crm-input"
                  >
                    <option value="FRIO">Frío</option>
                    <option value="TIBIO">Tibio</option>
                    <option value="CALIENTE">Caliente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Score (0-100)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={form.score}
                    onChange={(e) => set('score', e.target.value)}
                    className="crm-input font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Fuente</label>
                <select
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  className="crm-input"
                >
                  {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Opcional"
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
                <button type="submit" disabled={loading || !form.name} className="crm-btn-primary flex-1">
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : isEdit ? 'Guardar' : 'Crear contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
