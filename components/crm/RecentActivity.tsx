import { Phone, Mail, Users, FileText, Clock } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

const TYPE_ICON: Record<string, typeof Phone> = {
  LLAMADA: Phone,
  EMAIL: Mail,
  REUNION: Users,
  NOTA: FileText,
  SEGUIMIENTO: Clock,
}

export interface RecentActivityItem {
  id: string
  type: string
  description: string
  contactName: string | null
  companyName: string
  createdAt: string | Date
}

export default function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <div className="crm-card h-full">
      <p className="text-base font-medium text-crm-foreground mb-4">Actividad Reciente</p>
      {items.length === 0 ? (
        <p className="text-sm text-crm-muted text-center py-8">Sin actividad reciente</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? FileText
            return (
              <div key={item.id} className="flex gap-3">
                <div className="rounded-full bg-crm-secondary p-2 h-fit shrink-0">
                  <Icon className="h-3.5 w-3.5 text-crm-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-crm-foreground truncate">{item.description}</p>
                  <p className="text-xs text-crm-muted mt-0.5">
                    {item.contactName ?? item.companyName} · {formatRelativeDate(item.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
