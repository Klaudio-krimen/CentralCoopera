'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import {
  Buildings,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Package,
  CaretDown,
  UserCirclePlus,
} from '@phosphor-icons/react'
import EmpresaActions from '@/components/ui/EmpresaActions'
import ContactoModal from '@/components/ui/ContactoModal'
import TemperatureBadge from '@/components/ui/TemperatureBadge'
import { EmailQuickActions, PhoneQuickActions } from '@/components/crm/ContactQuickActions'
import { CONTACT_SOURCE_LABELS } from '@/lib/utils'

export interface ContactoDeEmpresa {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  temperature: 'FRIO' | 'TIBIO' | 'CALIENTE'
  score: number
  source: keyof typeof CONTACT_SOURCE_LABELS
}

export interface EmpresaConContactos {
  id: string
  name: string
  address: string | null
  contactName: string | null
  contactPhone: string | null
  isActive: boolean
  createdAt: Date
  _count: { orders: number }
  contacts: ContactoDeEmpresa[]
}

function matches(empresa: EmpresaConContactos, q: string) {
  if (empresa.name.toLowerCase().includes(q)) return true
  return empresa.contacts.some(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q)
  )
}

export default function ClientesConContactos({ empresas }: { empresas: EmpresaConContactos[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const q = search.trim().toLowerCase()
  const filtradas = useMemo(
    () => (q ? empresas.filter((e) => matches(e, q)) : empresas),
    [empresas, q]
  )
  // Mientras se busca, auto-expande las empresas cuyo match viene de un contacto.
  const autoExpandidas = useMemo(() => {
    if (!q) return expanded
    const s = new Set(expanded)
    for (const e of filtradas) {
      if (!e.name.toLowerCase().includes(q)) s.add(e.id)
    }
    return s
  }, [q, filtradas, expanded])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const activas = filtradas.filter((e) => e.isActive)
  const inactivas = filtradas.filter((e) => !e.isActive)

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa o contacto..."
          className="crm-input pl-9"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="crm-card text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-crm-secondary flex items-center justify-center mx-auto mb-3">
            <Buildings size={22} className="text-crm-muted" />
          </div>
          <p className="text-crm-foreground font-medium">Sin resultados</p>
          <p className="text-crm-muted text-sm mt-1">Prueba con otro nombre de empresa o contacto</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activas.map((empresa) => (
              <EmpresaCard
                key={empresa.id}
                empresa={empresa}
                expanded={autoExpandidas.has(empresa.id)}
                onToggle={() => toggle(empresa.id)}
              />
            ))}
          </div>

          {inactivas.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-crm-muted uppercase tracking-wider">Inactivas</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {inactivas.map((empresa) => (
                  <EmpresaCard
                    key={empresa.id}
                    empresa={empresa}
                    expanded={autoExpandidas.has(empresa.id)}
                    onToggle={() => toggle(empresa.id)}
                    muted
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmpresaCard({
  empresa,
  expanded,
  onToggle,
  muted = false,
}: {
  empresa: EmpresaConContactos
  expanded: boolean
  onToggle: () => void
  muted?: boolean
}) {
  return (
    <div className={`crm-card space-y-3 ${muted ? 'opacity-60' : ''}`}>
      <Link href={`/admin/crm/clientes/${empresa.id}`} className="block space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-crm-foreground leading-tight">{empresa.name}</p>
            {empresa.address && (
              <p className="text-xs text-crm-muted mt-0.5 truncate">{empresa.address}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {empresa.isActive ? (
              <CheckCircle size={14} weight="fill" className="text-crm-success" />
            ) : (
              <XCircle size={14} weight="fill" className="text-crm-muted" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          {empresa.contactName && (
            <div className="flex items-center gap-1.5 text-xs text-crm-muted">
              <User size={12} className="text-crm-muted shrink-0" />
              {empresa.contactName}
            </div>
          )}
          {empresa.contactPhone && (
            <div className="flex items-center gap-1.5 text-xs text-crm-muted">
              <Phone size={12} className="text-crm-muted shrink-0" />
              {empresa.contactPhone}
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between pt-1 border-t border-crm-border">
        <div className="flex items-center gap-1.5 text-xs text-crm-muted">
          <Package size={12} />
          {empresa._count.orders} orden{empresa._count.orders !== 1 ? 'es' : ''}
        </div>
        <EmpresaActions empresaId={empresa.id} isActive={empresa.isActive} />
      </div>

      <div className="border-t border-crm-border pt-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between text-xs font-medium text-crm-muted hover:text-crm-foreground transition-colors py-1"
        >
          <span>Contactos ({empresa.contacts.length})</span>
          <CaretDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="space-y-2.5 mt-2">
            {empresa.contacts.length === 0 ? (
              <p className="text-xs text-crm-muted py-1">Sin contactos registrados.</p>
            ) : (
              empresa.contacts.map((c) => (
                <div key={c.id} className="rounded-lg border border-crm-border p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/crm/contactos/${c.id}`}
                      className="text-sm font-medium text-crm-foreground hover:text-crm-primary truncate"
                    >
                      {c.name} {c.role && <span className="text-crm-muted font-normal">· {c.role}</span>}
                    </Link>
                    <TemperatureBadge temperature={c.temperature} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {c.email && <EmailQuickActions email={c.email} />}
                    {c.phone && <PhoneQuickActions phone={c.phone} />}
                    {!c.email && !c.phone && (
                      <span className="text-xs text-crm-muted">Sin datos de contacto</span>
                    )}
                  </div>
                </div>
              ))
            )}

            <ContactoModal
              companyId={empresa.id}
              trigger={
                <button className="w-full crm-btn-outline text-xs py-1.5 justify-center">
                  <UserCirclePlus size={14} />
                  Nuevo contacto
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
