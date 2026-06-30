import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/utils'
import { ArrowsLeftRight, ArrowLeft, ArrowDown, ArrowUp, Equals } from '@phosphor-icons/react/dist/ssr'

const TYPE_CONFIG: Record<string, { label: string; className: string; icon: typeof ArrowDown }> = {
  ENTRADA: { label: 'Entrada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ArrowDown },
  SALIDA:  { label: 'Salida',  className: 'bg-red-50 text-red-700 border-red-200', icon: ArrowUp },
  AJUSTE:  { label: 'Ajuste',  className: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: Equals },
}

async function getMovimientos() {
  return prisma.inventoryMovement.findMany({
    include: {
      item: { select: { name: true, unit: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export default async function MovimientosPage() {
  const movimientos = await getMovimientos()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <Link
          href="/admin/inventario/stock"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-3"
        >
          <ArrowLeft size={15} />
          Volver a Stock
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Movimientos</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Últimos {movimientos.length} movimientos de inventario
        </p>
      </div>

      {movimientos.length === 0 ? (
        <div className="panel text-center py-16 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <ArrowsLeftRight size={22} className="text-zinc-400" />
          </div>
          <p className="text-zinc-700 font-medium">Sin movimientos aún</p>
          <p className="text-zinc-500 text-sm mt-1">Los ajustes de stock aparecerán aquí</p>
        </div>
      ) : (
        <div className="panel overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="divide-y divide-zinc-100">
            {movimientos.map((m) => {
              const cfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.AJUSTE
              const Icon = cfg.icon
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0 ${cfg.className}`}>
                    <Icon size={11} weight="bold" />
                    {cfg.label}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{m.item.name}</p>
                    {m.reason && <p className="text-xs text-zinc-500 truncate">{m.reason}</p>}
                  </div>

                  <p className="text-sm font-semibold text-zinc-900 font-mono tabular-nums shrink-0">
                    {m.type === 'AJUSTE' ? '=' : m.type === 'ENTRADA' ? '+' : '-'}{m.quantity.toLocaleString('es-CL')} {m.item.unit}
                  </p>

                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-zinc-500">{m.user.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {formatDate(m.createdAt)} · {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
