import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import EmpresaActions from '@/components/ui/EmpresaActions'
import ContactoModal from '@/components/ui/ContactoModal'
import DealModal from '@/components/ui/DealModal'
import ActividadModal from '@/components/ui/ActividadModal'
import {
  ArrowLeft,
  Buildings,
  Phone,
  User,
  Package,
  UserCircle,
  EnvelopeSimple,
  Users as UsersIcon,
  Note,
  ClockClockwise,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react/dist/ssr'

const ACTIVITY_ICON: Record<string, typeof Phone> = {
  LLAMADA: Phone,
  EMAIL: EnvelopeSimple,
  REUNION: UsersIcon,
  NOTA: Note,
  SEGUIMIENTO: ClockClockwise,
}

const ACTIVITY_LABEL: Record<string, string> = {
  LLAMADA: 'Llamada',
  EMAIL: 'Email',
  REUNION: 'Reunión',
  NOTA: 'Nota',
  SEGUIMIENTO: 'Seguimiento',
}

async function getCliente(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { where: { isActive: true }, orderBy: { name: 'asc' } },
      deals: {
        include: { stage: true, contact: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      },
      orders: {
        select: { id: true, orderCode: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { orders: true } },
    },
  })
}

async function getActividades(companyId: string) {
  return prisma.activity.findMany({
    where: { companyId },
    include: {
      contact: { select: { name: true } },
      deal: { select: { title: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
}

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const cliente = await getCliente(params.id)
  if (!cliente) notFound()

  const actividades = await getActividades(cliente.id)

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/admin/crm/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-crm-muted hover:text-crm-foreground transition-colors animate-fade-up"
      >
        <ArrowLeft size={15} />
        Volver a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">{cliente.name}</h1>
            {cliente.isActive ? (
              <CheckCircle size={16} weight="fill" className="text-crm-success" />
            ) : (
              <XCircle size={16} weight="fill" className="text-crm-muted" />
            )}
          </div>
          <p className="text-crm-muted text-sm mt-1">
            {cliente._count.orders} orden{cliente._count.orders !== 1 ? 'es' : ''} de reciclaje · {cliente.deals.length} deal{cliente.deals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <EmpresaActions empresaId={cliente.id} isActive={cliente.isActive} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
        {/* Info */}
        <div className="crm-card space-y-3">
          <p className="text-xs font-medium text-crm-muted uppercase tracking-wider">Información</p>
          <div className="space-y-2">
            {cliente.address && (
              <div className="flex items-center gap-2 text-sm text-crm-foreground">
                <Buildings size={15} className="text-crm-muted shrink-0" />
                {cliente.address}
              </div>
            )}
            {cliente.contactName && (
              <div className="flex items-center gap-2 text-sm text-crm-foreground">
                <User size={15} className="text-crm-muted shrink-0" />
                {cliente.contactName}
              </div>
            )}
            {cliente.contactPhone && (
              <div className="flex items-center gap-2 text-sm text-crm-foreground">
                <Phone size={15} className="text-crm-muted shrink-0" />
                {cliente.contactPhone}
              </div>
            )}
            {!cliente.address && !cliente.contactName && !cliente.contactPhone && (
              <p className="text-sm text-crm-muted">Sin información de contacto general registrada.</p>
            )}
          </div>
        </div>

        {/* Contactos */}
        <div className="crm-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-crm-muted uppercase tracking-wider">
              Contactos ({cliente.contacts.length})
            </p>
            <ContactoModal companyId={cliente.id} />
          </div>
          {cliente.contacts.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin contactos registrados.</p>
          ) : (
            <div className="space-y-2">
              {cliente.contacts.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 py-1.5">
                  <UserCircle size={18} className="text-crm-muted shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-crm-foreground">
                      {c.name} {c.role && <span className="text-crm-muted font-normal">· {c.role}</span>}
                    </p>
                    <p className="text-xs text-crm-muted truncate">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '160ms' }}>
        {/* Deals */}
        <div className="crm-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-crm-muted uppercase tracking-wider">
              Deals ({cliente.deals.length})
            </p>
            <DealModal companyId={cliente.id} contactos={cliente.contacts.map((c) => ({ id: c.id, name: c.name }))} />
          </div>
          {cliente.deals.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin deals abiertos. Crea uno para seguir una negociación.</p>
          ) : (
            <div className="space-y-2">
              {cliente.deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/admin/crm/deals/${deal.id}`}
                  className="block rounded-xl border border-crm-border p-3 hover:bg-crm-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-crm-foreground truncate">{deal.title}</p>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0"
                      style={{ borderColor: deal.stage.color, color: deal.stage.color }}
                    >
                      {deal.stage.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-semibold text-crm-primary font-mono tabular-nums">
                      {formatCurrency(deal.value)}
                    </span>
                    <span className="text-xs text-crm-muted font-mono tabular-nums">{deal.probability}%</span>
                  </div>
                  {deal.contact && (
                    <p className="text-xs text-crm-muted mt-1">{deal.contact.name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actividades */}
        <div className="crm-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-crm-muted uppercase tracking-wider">
              Actividad ({actividades.length})
            </p>
            <ActividadModal companyId={cliente.id} />
          </div>
          {actividades.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin actividad registrada. Anota una llamada, email o nota.</p>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {actividades.map((a) => {
                const Icon = ACTIVITY_ICON[a.type] ?? Note
                return (
                  <div key={a.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-crm-secondary flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-crm-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-crm-muted bg-crm-secondary px-1.5 py-0.5 rounded-full">
                          {ACTIVITY_LABEL[a.type] ?? a.type}
                        </span>
                        {!a.completedAt && a.scheduledAt && (
                          <span className="text-[11px] text-crm-warning">Pendiente</span>
                        )}
                      </div>
                      <p className="text-sm text-crm-foreground mt-1">{a.description}</p>
                      <p className="text-[11px] text-crm-muted mt-0.5">
                        {a.createdBy.name} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Historial de órdenes de reciclaje (solo lectura) */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <p className="text-xs font-medium text-crm-muted uppercase tracking-wider mb-3">
          Historial de reciclaje
        </p>
        {cliente.orders.length === 0 ? (
          <div className="crm-card text-center py-10">
            <Package size={20} className="text-crm-muted mx-auto mb-2" />
            <p className="text-sm text-crm-muted">Sin órdenes de reciclaje registradas</p>
          </div>
        ) : (
          <div className="crm-card overflow-hidden !p-0">
            <div className="divide-y divide-crm-border">
              {cliente.orders.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                  <p className="text-xs font-mono text-crm-muted tabular-nums w-28 shrink-0">{o.orderCode}</p>
                  <p className="text-xs text-crm-muted flex-1">{formatDate(o.createdAt)}</p>
                  <StatusBadge status={o.status as any} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
