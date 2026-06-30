import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'
import RecepcionSearch from '@/components/ui/RecepcionSearch'
import {
  Truck,
  ArrowRight,
  Package,
  Clock,
  ArrowsClockwise,
} from '@phosphor-icons/react/dist/ssr'

async function getPendingOrders() {
  return prisma.pickupOrder.findMany({
    where: { status: 'EN_TRANSITO' },
    include: {
      company: { select: { name: true } },
      driver:  { select: { name: true } },
      items:   { select: { id: true } },
    },
    orderBy: { updatedAt: 'asc' },
  })
}

export default async function RecepcionDashboardPage() {
  const orders = await getPendingOrders()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Esperando recepción
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {orders.length === 0
              ? 'Sin órdenes pendientes ahora mismo'
              : `${orders.length} orden${orders.length !== 1 ? 'es' : ''} en tránsito`}
          </p>
        </div>

        {/* Manual refresh */}
        <form action="/recepcion/dashboard">
          <button
            type="submit"
            className="btn-ghost text-xs"
            aria-label="Actualizar lista"
          >
            <ArrowsClockwise size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </form>
      </div>

      {/* Search by code */}
      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <RecepcionSearch />
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <div
              key={order.id}
              className="card p-5 hover:shadow-card-hover transition-shadow animate-fade-up"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-zinc-400 tabular-nums">{order.orderCode}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      En tránsito
                    </span>
                  </div>

                  <p className="font-semibold text-zinc-900 text-sm truncate">
                    {order.company.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Truck size={12} />
                      {order.driver?.name ?? 'Sin chofer'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock size={12} />
                      Salida {formatTime(order.updatedAt)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Package size={12} />
                      {order.items.length} tipo{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <Link
                  href={`/recepcion/recibir/${order.id}`}
                  className="btn-primary shrink-0 py-2.5 px-4 text-sm"
                >
                  Recibir
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-refresh note */}
      <p className="text-center text-xs text-zinc-400">
        Se actualiza automáticamente cada 60 segundos
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="panel text-center py-16 animate-fade-up" style={{ animationDelay: '120ms' }}>
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
        <Truck size={22} className="text-zinc-400" />
      </div>
      <p className="text-zinc-700 font-medium">Sin órdenes en tránsito</p>
      <p className="text-zinc-500 text-sm mt-1">
        Las órdenes confirmadas por el chofer aparecerán aquí
      </p>
    </div>
  )
}
