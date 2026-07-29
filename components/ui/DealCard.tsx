'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency } from '@/lib/utils'

export interface DealCardData {
  id: string
  title: string
  value: number
  companyName: string
  contactName: string | null
  probability: number
}

export default function DealCard({ id, title, value, companyName, contactName, probability }: DealCardData) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card p-3 space-y-2 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-shadow"
    >
      <p className="text-sm font-medium text-zinc-900 leading-tight">{title}</p>
      <p className="text-xs text-zinc-500 truncate">{companyName}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-emerald-700 font-mono tabular-nums">
          {formatCurrency(value)}
        </span>
        <span className="text-xs text-zinc-500 font-mono tabular-nums">{probability}%</span>
      </div>
      {contactName && (
        <p className="text-[11px] text-zinc-400 truncate">{contactName}</p>
      )}
    </div>
  )
}
