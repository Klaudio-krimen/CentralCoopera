'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { FunnelSimple, X } from '@phosphor-icons/react'

const STATUSES = [
  { value: '',            label: 'Todos los estados' },
  { value: 'EN_RETIRO',    label: 'En retiro' },
  { value: 'EN_TRANSITO',  label: 'En tránsito' },
  { value: 'RECIBIDA',     label: 'Recibida' },
  { value: 'DISCREPANCIA', label: 'Discrepancia' },
  { value: 'CERRADA',      label: 'Cerrada' },
]

interface Props {
  drivers:   { id: string; name: string }[]
  companies: { id: string; name: string }[]
}

export default function OrdenesFilter({ drivers, companies }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const sp         = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.push(`${pathname}?${params}`)
    },
    [router, pathname, sp]
  )

  const hasFilters =
    sp.has('status') || sp.has('driverId') || sp.has('companyId') || sp.has('from') || sp.has('to')

  const clear = () => router.push(pathname)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <FunnelSimple size={14} />
        Filtros
      </div>

      {/* Status */}
      <select
        value={sp.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700
          focus:outline-none focus:border-emerald-500 transition-colors"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Driver */}
      <select
        value={sp.get('driverId') ?? ''}
        onChange={(e) => update('driverId', e.target.value)}
        className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700
          focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <option value="">Todos los choferes</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      {/* Company */}
      <select
        value={sp.get('companyId') ?? ''}
        onChange={(e) => update('companyId', e.target.value)}
        className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700
          focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <option value="">Todas las empresas</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={sp.get('from') ?? ''}
          onChange={(e) => update('from', e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700
            focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <span className="text-zinc-400 text-xs">—</span>
        <input
          type="date"
          value={sp.get('to') ?? ''}
          onChange={(e) => update('to', e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700
            focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <X size={13} />
          Limpiar
        </button>
      )}
    </div>
  )
}
