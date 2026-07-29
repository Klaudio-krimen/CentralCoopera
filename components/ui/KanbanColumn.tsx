'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import DealCard, { type DealCardData } from './DealCard'
import { formatCurrency } from '@/lib/utils'

export default function KanbanColumn({
  id,
  name,
  color,
  deals,
}: {
  id: string
  name: string
  color: string
  deals: DealCardData[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[268px] w-[268px] shrink-0 rounded-2xl border transition-colors ${
        isOver ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-50/60 border-zinc-200/70'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200/70">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-medium text-zinc-800 flex-1 truncate">{name}</h3>
        <span className="text-[11px] text-zinc-500 bg-white rounded-full px-2 py-0.5 tabular-nums shrink-0">
          {deals.length}
        </span>
      </div>

      <div className="px-3 py-2 text-xs text-zinc-500 text-center border-b border-zinc-200/70 font-mono tabular-nums">
        {formatCurrency(totalValue)}
      </div>

      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[80px] overflow-y-auto">
          {deals.map((deal) => (
            <DealCard key={deal.id} {...deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
