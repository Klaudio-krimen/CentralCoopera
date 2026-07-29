import { Users, Briefcase, DollarSign, Flame } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface CrmStats {
  totalContacts: number
  activeDeals: number
  pipelineValue: number
  hotLeads: number
}

export default function KPICards({ stats }: { stats: CrmStats }) {
  const cards = [
    {
      label: 'Total Contactos',
      value: stats.totalContacts.toLocaleString('es-CL'),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Deals Activos',
      value: stats.activeDeals.toLocaleString('es-CL'),
      icon: Briefcase,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Valor en Pipeline',
      value: formatCurrency(stats.pipelineValue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Leads Calientes',
      value: stats.hotLeads.toLocaleString('es-CL'),
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="crm-card">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-crm-muted">{label}</p>
            <span className={`rounded-lg p-2 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </span>
          </div>
          <p className="text-2xl font-bold text-crm-foreground font-mono tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}
