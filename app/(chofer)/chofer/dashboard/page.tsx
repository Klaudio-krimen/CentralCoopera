import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getGreeting, formatTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Plus,
  ArrowRight,
  Truck,
  ClockClockwise,
  Warning,
} from '@phosphor-icons/react/dist/ssr'

async function getChoferOrders(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.pickupOrder.findMany({
    where: {
      driverId: userId,
      createdAt: { gte: today },
      status: { not: 'CERRADA' },
    },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function ChoferDashboardPage() {
  const session = await getServerSession(authOptions)
  const orders  = await getChoferOrders(session!.user.id)

  const activeOrder = orders.find(
    (o) => o.status === 'EN_RETIRO' || o.status === 'EN_TRANSITO'
  )
  const todayOrders = orders.filter((o) => o !== activeOrder)

  const greeting = getGreeting()
  const firstName = session!.user.name?.split(' ')[0] ?? 'Chofer'

  return (
    <div className="pt-6 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-zinc-400 text-sm">{greeting},</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{firstName}</h1>
      </div>

      {/* Offline draft banner */}
      <DraftBanner />

      {/* Active order */}
      {activeOrder ? (
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Orden activa</p>
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{activeOrder.company.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">{activeOrder.orderCode}</p>
              </div>
              <StatusBadge status={activeOrder.status as any} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <ClockClockwise size={13} />
                <span className="text-xs">Iniciada {formatTime(activeOrder.createdAt)}</span>
              </div>
              <Link
                href={`/chofer/nueva-orden?resume=${activeOrder.id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Continuar
                <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-center border-dashed">
          <Truck size={28} className="text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500 font-medium">Sin orden activa</p>
          <p className="text-xs text-zinc-400 mt-0.5">Crea una nueva orden para comenzar</p>
        </div>
      )}

      {/* Today's orders */}
      {todayOrders.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Hoy</p>
          <div className="space-y-2">
            {todayOrders.map((order) => (
              <Link
                key={order.id}
                href={`/chofer/orden/${order.id}`}
                className="card flex items-center justify-between p-4 hover:shadow-card-hover transition-shadow"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{order.company.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{order.orderCode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status as any} size="sm" />
                  <ArrowRight size={14} className="text-zinc-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for today */}
      {todayOrders.length === 0 && !activeOrder && (
        <div className="text-center py-8">
          <p className="text-xs text-zinc-400">Sin órdenes anteriores hoy</p>
        </div>
      )}

      {/* CTA — sticky at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[390px] z-10">
        <Link href="/chofer/nueva-orden" className="btn-primary w-full shadow-[0_8px_24px_-4px_rgba(34,197,94,0.4)]">
          <Plus size={18} weight="bold" />
          Nueva orden
        </Link>
      </div>
    </div>
  )
}

// Client component for the offline draft banner
function DraftBanner() {
  return null // rendered client-side — see DraftBannerClient
}
