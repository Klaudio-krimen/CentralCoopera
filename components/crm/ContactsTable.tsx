'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Download } from 'lucide-react'
import TemperatureBadge from '@/components/ui/TemperatureBadge'
import { formatDate } from '@/lib/utils'

export interface ContactRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  temperature: 'FRIO' | 'TIBIO' | 'CALIENTE'
  score: number
  createdAt: string | Date
  company: { name: string }
}

const TEMP_FILTERS: { value: 'FRIO' | 'TIBIO' | 'CALIENTE' | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'CALIENTE', label: 'Caliente' },
  { value: 'TIBIO', label: 'Tibio' },
  { value: 'FRIO', label: 'Frío' },
]

export default function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tempFilter, setTempFilter] = useState<'FRIO' | 'TIBIO' | 'CALIENTE' | null>(null)

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (tempFilter && c.temperature !== tempFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company.name.toLowerCase().includes(q)
      )
    })
  }, [contacts, search, tempFilter])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contactos, empresa..."
            className="crm-input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {TEMP_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setTempFilter(f.value)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  tempFilter === f.value
                    ? 'bg-crm-primary text-white border-crm-primary'
                    : 'border-crm-border text-crm-muted hover:bg-crm-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <a href="/api/contactos/export" className="crm-btn-outline">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-crm-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-secondary/50">
              <th className="text-left font-medium text-crm-muted px-3 py-2">Nombre</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden sm:table-cell">Empresa</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden md:table-cell">Cargo</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2">Temperatura</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden md:table-cell">Score</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden lg:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/admin/crm/contactos/${c.id}`)}
                className="border-b border-crm-border last:border-0 hover:bg-crm-secondary/50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-crm-foreground">{c.name}</p>
                  {c.email && <p className="text-xs text-crm-muted">{c.email}</p>}
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell text-crm-foreground">{c.company.name}</td>
                <td className="px-3 py-2.5 hidden md:table-cell text-crm-muted">{c.role ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <TemperatureBadge temperature={c.temperature} size="sm" />
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-crm-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-crm-primary rounded-full" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-xs text-crm-muted font-mono tabular-nums">{c.score}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-crm-muted text-xs">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-crm-muted">{filtered.length} de {contacts.length} contactos</p>
    </div>
  )
}
