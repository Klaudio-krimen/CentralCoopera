'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BuildingsPlus, X, SpinnerGap, Warning } from '@phosphor-icons/react'

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
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <BuildingsPlus size={17} />
        Nueva empresa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Nueva empresa cliente</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ej: Vidrios del Sur SA"
                  className="input-base"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Ej: Av. Pajaritos 3500, Maipú"
                  className="input-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Contacto</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => set('contactName', e.target.value)}
                    placeholder="Nombre del contacto"
                    className="input-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Teléfono</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    placeholder="+56 9 xxxx xxxx"
                    className="input-base"
                  />
                </div>
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
                  disabled={loading || !form.name}
                  className="btn-primary flex-1"
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
