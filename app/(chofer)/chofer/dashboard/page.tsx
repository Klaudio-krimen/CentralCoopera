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
      <div className="animate-fade-up">
        <p className="text-zinc-500 text-sm">{greeting},</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{firstName}</h1>
      </div>

      {/* Offline draft banner */}
      <DraftBanner />

      {/* Active order */}
      {activeOrder ? (
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Orden activa</p>
          <div className="card p-4 border-l-4 border-l-emerald-500 rounded-l-none">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{activeOrder.company.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono tabular-nums">{activeOrder.orderCode}</p>
              </div>
              <StatusBadge status={activeOrder.status as any} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-500">
                <ClockClockwise size={13} />
                <span className="text-xs">Iniciada {formatTime(activeOrder.createdAt)}</span>
              </div>
              <Link
                href={`/chofer/nueva-orden?resume=${activeOrder.id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 active:translate-y-[1px] transition-all"
              >
                Continuar
                <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel p-6 text-center animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Truck size={22} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-700 font-medium">Sin orden activa</p>
          <p className="text-xs text-zinc-500 mt-0.5">Crea una nueva orden para comenzar</p>
        </div>
      )}

      {/* Today's orders */}
      {todayOrders.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Hoy</p>
          <div className="space-y-2">
            {todayOrders.map((order, i) => (
              <Link
                key={order.id}
                href={`/chofer/orden/${order.id}`}
                className="card flex items-center justify-between p-4 hover:shadow-card-hover active:translate-y-[1px] transition-all animate-fade-up group"
                style={{ animationDelay: `${160 + i * 50}ms` }}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{order.company.name}</p>
                  <p className="text-xs text-zinc-500 font-mono tabular-nums mt-0.5">{order.orderCode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status as any} size="sm" />
                  <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for today */}
      {todayOrders.length === 0 && !activeOrder && (
        <div className="text-center py-8">
          <p className="text-xs text-zinc-500">Sin órdenes anteriores hoy</p>
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
