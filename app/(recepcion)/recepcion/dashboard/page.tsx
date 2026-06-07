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
  return prisma.order.findMany({
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
      <div className="flex items-start justify-between">
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
            title="Actualizar"
          >
            <ArrowsClockwise size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </form>
      </div>

      {/* Search by code */}
      <RecepcionSearch />

      {/* Orders list */}
      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-zinc-400">{order.orderCode}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      En tránsito
                    </span>
                  </div>

                  <p className="font-semibold text-zinc-900 text-sm truncate">
                    {order.company.name}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Truck size={12} />
                      {order.driver?.name ?? 'Sin chofer'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock size={12} />
                      Salida {formatTime(order.updatedAt)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
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
    <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl">
      <Truck size={36} className="text-zinc-300 mx-auto mb-3" />
      <p className="text-zinc-600 font-medium">Sin órdenes en tránsito</p>
      <p className="text-zinc-400 text-sm mt-1">
        Las órdenes confirmadas por el chofer aparecerán aquí
      </p>
    </div>
  )
}
