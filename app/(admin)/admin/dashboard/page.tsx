import { prisma } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Truck,
  Warning,
  ArrowRight,
  ArrowUpRight,
  Package,
} from '@phosphor-icons/react/dist/ssr'

async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalMes, activas, discrepancias, recentOrders] = await Promise.all([
    prisma.pickupOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.pickupOrder.count({ where: { status: { in: ['EN_RETIRO', 'EN_TRANSITO'] } } }),
    prisma.discrepancy.count({ where: { status: 'PENDIENTE' } }),
    prisma.pickupOrder.findMany({
      where: { status: { in: ['DISCREPANCIA', 'EN_TRANSITO', 'RECIBIDA'] } },
      include: {
        company:       { select: { name: true } },
        driver:        { select: { name: true } },
        discrepancies: { where: { status: 'PENDIENTE' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
  ])

  return { totalMes, activas, discrepancias, recentOrders }
}

export default async function AdminDashboardPage() {
  const { totalMes, activas, discrepancias, recentOrders } = await getDashboardData()

  const metrics = [
    {
      label: 'Órdenes este mes',
      value: totalMes.toLocaleString('es-CL'),
      icon: Package,
      tone: 'text-zinc-900',
      iconBg: 'bg-zinc-100 text-zinc-500',
    },
    {
      label: 'En curso',
      value: activas.toString(),
      icon: Truck,
      tone: 'text-blue-700',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Discrepancias pendientes',
      value: discrepancias.toString(),
      icon: Warning,
      tone: discrepancias > 0 ? 'text-red-700' : 'text-zinc-900',
      iconBg: discrepancias > 0 ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500',
      href: '/admin/discrepancias',
    },
  ]

  return (
    <div className="space-y-9">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-none">
          Dashboard
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          Resumen operacional ·{' '}
          {new Date().toLocaleDateString('es-CL', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </header>

      {/* Metrics — grouped by borders, not boxed cards (anti-card-overuse) */}
      <section
        className="panel grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70 animate-fade-up"
        style={{ animationDelay: '60ms' }}
      >
        {metrics.map(({ label, value, icon: Icon, tone, iconBg, href }) => {
          const body = (
            <div className="p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={15} weight="fill" />
                </span>
              </div>
              <div className="flex items-end justify-between">
                <p className={`text-[2.5rem] font-semibold tracking-tight leading-none font-mono tabular-nums ${tone}`}>
                  {value}
                </p>
                {href && (
                  <ArrowUpRight
                    size={16}
                    className="text-zinc-300 group-hover:text-zinc-500 transition-colors mb-1"
                  />
                )}
              </div>
            </div>
          )
          return href ? (
            <Link key={label} href={href} className="group hover:bg-zinc-50/60 transition-colors">
              {body}
            </Link>
          ) : (
            <div key={label}>{body}</div>
          )
        })}
      </section>

      {/* Recent orders */}
      <section className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Órdenes recientes</h2>
          <Link
            href="/admin/ordenes"
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors"
          >
            Ver todas <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        <div className="panel overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                <Package size={20} className="text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700">Sin órdenes activas</p>
              <p className="text-xs text-zinc-500 mt-0.5">Las órdenes en curso aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/ordenes/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/70 transition-colors group"
                >
                  <p className="text-xs font-mono text-zinc-400 w-28 shrink-0 tabular-nums">{order.orderCode}</p>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{order.company.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{order.driver?.name}</p>
                  </div>

                  {order.discrepancies.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium shrink-0">
                      Discrepancia
                    </span>
                  )}

                  <StatusBadge status={order.status as any} size="sm" />

                  <ArrowRight
                    size={14}
                    className="text-zinc-300 shrink-0 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
