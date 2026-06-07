import { prisma } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import OrdenesFilter from '@/components/ui/OrdenesFilter'
import { ArrowRight, Package } from '@phosphor-icons/react/dist/ssr'

const PAGE_SIZE = 25

async function getOrdenes(searchParams: Record<string, string>) {
  const status    = searchParams.status
  const driverId  = searchParams.driverId
  const companyId = searchParams.companyId
  const from      = searchParams.from
  const to        = searchParams.to
  const page      = parseInt(searchParams.page ?? '1')

  const where: any = {
    ...(status    ? { status: { in: status.split(',') as any[] } } : {}),
    ...(driverId  ? { driverId } : {}),
    ...(companyId ? { companyId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to + 'T23:59:59') } : {}),
          },
        }
      : {}),
  }

  const [orders, total, drivers, companies] = await Promise.all([
    prisma.pickupOrder.findMany({
      where,
      include: {
        company:      { select: { name: true } },
        driver:       { select: { name: true } },
        items:        { select: { id: true } },
        _count:       { select: { discrepancies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    PAGE_SIZE,
      skip:    (page - 1) * PAGE_SIZE,
    }),
    prisma.pickupOrder.count({ where }),
    prisma.user.findMany({
      where:   { role: 'CHOFER', isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.company.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return { orders, total, page, drivers, companies }
}

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const { orders, total, page, drivers, companies } = await getOrdenes(searchParams)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Órdenes</h1>
          <p className="text-zinc-500 text-sm mt-1">{total.toLocaleString('es-CL')} órdenes en total</p>
        </div>
      </div>

      {/* Filters */}
      <OrdenesFilter drivers={drivers} companies={companies} />

      {/* Table */}
      {orders.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl">
          <Package size={36} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-600 font-medium">Sin resultados</p>
          <p className="text-zinc-400 text-sm mt-1">Ajusta los filtros para ver órdenes</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Head */}
          <div className="grid grid-cols-[1fr_1.5fr_1.2fr_120px_80px_40px] gap-4 px-5 py-3 border-b border-zinc-50 bg-zinc-50/60">
            {['Código', 'Empresa', 'Chofer', 'Estado', 'Items / Disc.', ''].map((h) => (
              <p key={h} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {h}
              </p>
            ))}
          </div>

          <div className="divide-y divide-zinc-50">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/ordenes/${order.id}`}
                className="grid grid-cols-[1fr_1.5fr_1.2fr_120px_80px_40px] gap-4 px-5 py-3.5 items-center hover:bg-zinc-50/80 transition-colors"
              >
                <div>
                  <p className="text-xs font-mono text-zinc-500">{order.orderCode}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                  </p>
                </div>

                <p className="text-sm text-zinc-800 truncate">{order.company.name}</p>
                <p className="text-sm text-zinc-600 truncate">{order.driver?.name ?? '—'}</p>

                <StatusBadge status={order.status as any} size="sm" />

                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-800">{order.items.length}</p>
                  {order._count.discrepancies > 0 && (
                    <p className="text-[11px] text-red-500 font-semibold">
                      {order._count.discrepancies} disc.
                    </p>
                  )}
                </div>

                <ArrowRight size={14} className="text-zinc-300 justify-self-end" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} searchParams={searchParams} />
      )}
    </div>
  )
}

function Pagination({
  current,
  total,
  searchParams,
}: {
  current: number
  total: number
  searchParams: Record<string, string>
}) {
  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...searchParams, page: String(p) })
    return `/admin/ordenes?${params}`
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-zinc-400">
        Página {current} de {total}
      </p>
      <div className="flex gap-2">
        {current > 1 && (
          <Link href={buildHref(current - 1)} className="btn-secondary py-2 px-4 text-xs">
            Anterior
          </Link>
        )}
        {current < total && (
          <Link href={buildHref(current + 1)} className="btn-secondary py-2 px-4 text-xs">
            Siguiente
          </Link>
        )}
      </div>
    </div>
  )
}
