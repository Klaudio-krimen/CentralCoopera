'use client'

import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency } from '@/lib/utils'
import TemperatureBadge from './TemperatureBadge'

export interface DealCardData {
  id: string
  title: string
  value: number
  companyName: string
  contactName: string | null
  contactTemperature?: 'FRIO' | 'TIBIO' | 'CALIENTE' | null
  probability: number
}

export default function DealCard({ id, title, value, companyName, contactName, contactTemperature, probability }: DealCardData) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Link
      href={`/admin/crm/deals/${id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="crm-card block no-underline space-y-2 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-shadow"
    >
      <p className="text-sm font-medium text-crm-foreground leading-tight">{title}</p>
      <p className="text-xs text-crm-muted truncate">{companyName}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-crm-primary font-mono tabular-nums">
          {formatCurrency(value)}
        </span>
        {contactTemperature ? (
          <TemperatureBadge temperature={contactTemperature} size="sm" />
        ) : (
          <span className="text-xs text-crm-muted font-mono tabular-nums">{probability}%</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        {contactName && <p className="text-[11px] text-crm-muted/80 truncate">{contactName}</p>}
        {contactTemperature && <span className="text-[11px] text-crm-muted font-mono tabular-nums">{probability}%</span>}
      </div>
    </Link>
  )
}
