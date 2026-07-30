import { prisma } from '@/lib/db'
import Link from 'next/link'
import EmpresaActions from '@/components/ui/EmpresaActions'
import NuevaEmpresaModal from '@/components/ui/NuevaEmpresaModal'
import {
  Buildings,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Package,
} from '@phosphor-icons/react/dist/ssr'

async function getEmpresas() {
  return prisma.company.findMany({
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function ClientesPage() {
  const empresas = await getEmpresas()
  const activas   = empresas.filter((e) => e.isActive)
  const inactivas = empresas.filter((e) => !e.isActive)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Clientes</h1>
          <p className="text-crm-muted text-sm mt-1">
            {activas.length} activa{activas.length !== 1 ? 's' : ''} · {inactivas.length} inactiva{inactivas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevaEmpresaModal />
      </div>

      {/* Active */}
      {activas.length === 0 ? (
        <div className="crm-card text-center py-16 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-crm-secondary flex items-center justify-center mx-auto mb-3">
            <Buildings size={22} className="text-crm-muted" />
          </div>
          <p className="text-crm-foreground font-medium">Sin empresas registradas</p>
          <p className="text-crm-muted text-sm mt-1">Agrega la primera empresa cliente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
          {activas.map((empresa) => (
            <EmpresaCard key={empresa.id} empresa={empresa as any} />
          ))}
        </div>
      )}

      {/* Inactive */}
      {inactivas.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-crm-muted uppercase tracking-wider">Inactivas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inactivas.map((empresa) => (
              <EmpresaCard key={empresa.id} empresa={empresa as any} muted />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmpresaCard({
  empresa,
  muted = false,
}: {
  empresa: {
    id: string
    name: string
    address: string | null
    contactName: string | null
    contactPhone: string | null
    isActive: boolean
    createdAt: Date
    _count: { orders: number }
  }
  muted?: boolean
}) {
  return (
    <div className={`crm-card space-y-3 ${muted ? 'opacity-60' : ''}`}>
      <Link href={`/admin/crm/clientes/${empresa.id}`} className="block space-y-3">
        {/* Name + status */}
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

        {/* Contact */}
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

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-crm-border">
        <div className="flex items-center gap-1.5 text-xs text-crm-muted">
          <Package size={12} />
          {empresa._count.orders} orden{empresa._count.orders !== 1 ? 'es' : ''}
        </div>
        <EmpresaActions empresaId={empresa.id} isActive={empresa.isActive} />
      </div>
    </div>
  )
}
