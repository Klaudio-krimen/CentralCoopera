import { prisma } from '@/lib/db'
import Link from 'next/link'
import NuevoItemInventarioModal from '@/components/ui/NuevoItemInventarioModal'
import AjustarStockModal from '@/components/ui/AjustarStockModal'
import { Package, ArrowsLeftRight } from '@phosphor-icons/react/dist/ssr'

const CATEGORIA_LABEL: Record<string, string> = {
  MATERIA_PRIMA: 'Materia prima',
  PALLET: 'Pallet',
  OTRO: 'Otro',
}

async function getItems() {
  return prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
}

export default async function StockPage() {
  const items = await getItems()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Stock</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {items.length} ítem{items.length !== 1 ? 's' : ''} en inventario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/inventario/movimientos" className="btn-secondary text-sm py-2.5 px-4">
            <ArrowsLeftRight size={15} />
            Movimientos
          </Link>
          <NuevoItemInventarioModal />
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="panel text-center py-16 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Package size={22} className="text-zinc-400" />
          </div>
          <p className="text-zinc-700 font-medium">Sin ítems registrados</p>
          <p className="text-zinc-500 text-sm mt-1">Agrega el primer ítem de stock</p>
        </div>
      ) : (
        <div className="panel overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="divide-y divide-zinc-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Package size={15} className="text-amber-600" weight="fill" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500">{CATEGORIA_LABEL[item.category] ?? item.category}</p>
                </div>

                <p className="text-sm font-semibold text-zinc-900 font-mono tabular-nums shrink-0">
                  {item.quantity.toLocaleString('es-CL')} {item.unit}
                </p>

                <div className="shrink-0">
                  <AjustarStockModal itemId={item.id} itemName={item.name} unit={item.unit} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
