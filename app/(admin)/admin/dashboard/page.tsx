import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Truck,
  Warning,
  CheckCircle,
  ArrowRight,
  TrendUp,
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
        company:      { select: { name: true } },
        driver:       { select: { name: true } },
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
      color: 'text-zinc-900',
      bg: 'bg-zinc-50',
    },
    {
      label: 'En curso',
      value: activas.toString(),
      icon: Truck,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Discrepancias pendientes',
      value: discrepancias.toString(),
      icon: Warning,
      color: 'text-red-700',
      bg: 'bg-red-50',
      href: '/admin/discrepancias',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Resumen operacional · {new Date().toLocaleDateString('es-CL', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map(({ label, value, icon: Icon, color, bg, href }) => {
          const inner = (
            <div className={`card p-5 space-y-3 ${href ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} weight="fill" />
                </div>
              </div>
              <p className={`text-3xl font-semibold tracking-tight ${color}`}>{value}</p>
            </div>
          )
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>
        })}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Órdenes recientes</h2>
          <Link href="/admin/ordenes" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Ver todas <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        <div className="card overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={28} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sin órdenes activas</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/ordenes/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/80 transition-colors"
                >
                  {/* Code */}
                  <p className="text-xs font-mono text-zinc-400 w-32 shrink-0">{order.orderCode}</p>

                  {/* Empresa + Chofer */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{order.company.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{order.driver?.name}</p>
                  </div>

                  {/* Discrepancy alert */}
                  {order.discrepancies.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium shrink-0">
                      Discrepancia
                    </span>
                  )}

                  {/* Status */}
                  <StatusBadge status={order.status as any} size="sm" />

                  <ArrowRight size={14} className="text-zinc-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
