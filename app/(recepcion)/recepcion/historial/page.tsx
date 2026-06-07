import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { ArrowRight, ClipboardText } from '@phosphor-icons/react/dist/ssr'

export default async function RecepcionHistorialPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const orders = await prisma.pickupOrder.findMany({
    where: {
      status: { in: ['RECIBIDA', 'DISCREPANCIA', 'CERRADA'] },
    },
    include: {
      company: { select: { name: true } },
      driver:  { select: { name: true } },
      items:   { select: { id: true } },
      _count:  { select: { discrepancies: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  })

  const grouped: Record<string, typeof orders> = {}
  for (const order of orders) {
    const key = formatDate(order.updatedAt)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(order)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Historial de recepción</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {orders.length} órdenes recibidas
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardText size={36} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Sin órdenes recibidas aún</p>
          <p className="text-zinc-400 text-sm mt-1">Las órdenes aparecerán aquí una vez recepcionadas</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayOrders]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{date}</p>
            <div className="space-y-2">
              {dayOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/recepcion/recibir/${order.id}`}
                  className="card flex items-center justify-between p-4 hover:shadow-card-hover transition-shadow"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{order.company.name}</p>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">{order.orderCode}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-zinc-400">{order.driver?.name}</p>
                      {order._count.discrepancies > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 font-medium">
                          {order._count.discrepancies} discrepancia{order._count.discrepancies !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status as any} size="sm" />
                    <ArrowRight size={14} className="text-zinc-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
