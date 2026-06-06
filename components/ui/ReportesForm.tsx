'use client'

import { useState } from 'react'
import { DownloadSimple, SpinnerGap } from '@phosphor-icons/react'

interface Props {
  drivers:   { id: string; name: string }[]
  companies: { id: string; name: string }[]
}

const REPORT_TYPES = [
  { value: 'ordenes',       label: 'Órdenes' },
  { value: 'discrepancias', label: 'Discrepancias' },
  { value: 'choferes',      label: 'Por chofer' },
]

const SEVERITIES = [
  { value: '',         label: 'Todas las severidades' },
  { value: 'MENOR',    label: 'Menor' },
  { value: 'MODERADA', label: 'Moderada' },
  { value: 'GRAVE',    label: 'Grave' },
]

export default function ReportesForm({ drivers, companies }: Props) {
  const [type,      setType]      = useState('ordenes')
  const [from,      setFrom]      = useState('')
  const [to,        setTo]        = useState('')
  const [driverId,  setDriverId]  = useState('')
  const [companyId, setCompanyId] = useState('')
  const [severity,  setSeverity]  = useState('')
  const [loading,   setLoading]   = useState(false)

  const buildUrl = (format: 'csv' | 'json') => {
    const params = new URLSearchParams({ type, format })
    if (from)      params.set('from',      from)
    if (to)        params.set('to',        to)
    if (driverId)  params.set('driverId',  driverId)
    if (companyId) params.set('companyId', companyId)
    if (severity && type === 'discrepancias') params.set('severity', severity)
    return `/api/reportes?${params}`
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const res  = await fetch(buildUrl('csv'))
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `reporte_${type}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Type */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">Tipo de reporte</label>
        <div className="flex gap-2 flex-wrap">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setType(r.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                type === r.value
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_2px_8px_rgba(34,197,94,0.25)]'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-base"
          />
        </div>
      </div>

      {/* Driver + Company */}
      <div className="grid grid-cols-2 gap-4">
        {type !== 'choferes' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">Chofer (opcional)</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="input-base"
            >
              <option value="">Todos</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">Empresa (opcional)</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="input-base"
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Severity filter (only for discrepancias) */}
      {type === 'discrepancias' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">Severidad (opcional)</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input-base"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="btn-primary flex-1"
        >
          {loading ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <DownloadSimple size={17} weight="bold" />
              Descargar CSV
            </>
          )}
        </button>

        <a
          href={buildUrl('json')}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary px-4"
        >
          Ver JSON
        </a>
      </div>
    </div>
  )
}
