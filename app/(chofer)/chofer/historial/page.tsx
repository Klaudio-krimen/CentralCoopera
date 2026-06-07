import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { ArrowRight, ClipboardText } from '@phosphor-icons/react/dist/ssr'

export default async function HistorialPage() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.pickupOrder.findMany({
    where: { driverId: session!.user.id },
    include: {
      company: { select: { name: true } },
      items:   { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Group by day
  const grouped: Record<string, typeof orders> = {}
  for (const order of orders) {
    const key = formatDate(order.createdAt)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(order)
  }

  return (
    <div className="pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Historial</h1>
        <p className="text-zinc-500 text-sm mt-1">Tus últimas {orders.length} órdenes</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardText size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Sin órdenes aún</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayOrders]) => (
          <div key={date}>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{date}</p>
            <div className="space-y-2">
              {dayOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/chofer/orden/${order.id}`}
                  className="card flex items-center justify-between p-4 hover:shadow-card-hover transition-shadow"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{order.company.name}</p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{order.orderCode}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {order.items.length} material{order.items.length !== 1 ? 'es' : ''}
                    </p>
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
