'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Buildings, X, SpinnerGap, Warning } from '@phosphor-icons/react'

export default function NuevaEmpresaModal() {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', address: '', contactName: '', contactPhone: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ name: '', address: '', contactName: '', contactPhone: '' })
      toast.success('Empresa creada')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="crm-btn-primary">
        <Buildings size={17} />
        Nueva empresa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-crm-card rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-crm-foreground">Nueva empresa cliente</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-crm-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ej: Vidrios del Sur SA"
                  className="crm-input"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-crm-foreground">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Ej: Av. Pajaritos 3500, Maipú"
                  className="crm-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Contacto</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => set('contactName', e.target.value)}
                    placeholder="Nombre del contacto"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-crm-foreground">Teléfono</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    placeholder="+56 9 xxxx xxxx"
                    className="crm-input"
                  />
                </div>
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
                <button
                  type="submit"
                  disabled={loading || !form.name}
                  className="crm-btn-primary flex-1"
                >
                  {loading ? <SpinnerGap size={16} className="animate-spin" /> : 'Agregar empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
