'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, SpinnerGap, Warning } from '@phosphor-icons/react'

interface ContactoInitial {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

export default function ContactoModal({
  companyId,
  initialData,
  trigger,
}: {
  companyId: string
  initialData?: ContactoInitial
  trigger?: React.ReactNode
}) {
  const isEdit = !!initialData
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    role: initialData?.role ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    notes: initialData?.notes ?? '',
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contactos', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: initialData!.id, ...form } : { companyId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-secondary text-sm py-2 px-3">
          <UserPlus size={15} />
          Contacto
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">{isEdit ? 'Editar contacto' : 'Nuevo contacto'}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Nombre completo"
                    className="input-base"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Cargo</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                    placeholder="Ej: Jefe de compras"
                    className="input-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="correo@empresa.cl"
                    className="input-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Teléfono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+56 9 xxxx xxxx"
                    className="input-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Opcional"
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
                <button type="submit" disabled={loading || !form.name} className="btn-primary flex-1">
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
