import { prisma } from '@/lib/db'
import { AlertCircle, Clock, CheckCircle2, Phone, Mail, Users, FileText, ClockAlert } from 'lucide-react'
import ActividadModal from '@/components/ui/ActividadModal'
import CompletarActividadButton from '@/components/crm/CompletarActividadButton'
import { formatRelativeDate } from '@/lib/utils'

const ACTIVITY_LABEL: Record<string, string> = {
  LLAMADA: 'Llamada',
  EMAIL: 'Email',
  REUNION: 'Reunión',
  NOTA: 'Nota',
  SEGUIMIENTO: 'Seguimiento',
}

const ACTIVITY_ICON: Record<string, typeof Phone> = {
  LLAMADA: Phone,
  EMAIL: Mail,
  REUNION: Users,
  NOTA: FileText,
  SEGUIMIENTO: ClockAlert,
}

async function getData() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const [all, pending, empresas] = await Promise.all([
    prisma.activity.findMany({
      include: {
        contact: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.activity.findMany({
      where: { completedAt: null, scheduledAt: { not: null, lt: startOfTomorrow } },
      include: { contact: { select: { name: true } }, company: { select: { name: true } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const overdue = pending.filter((a) => a.scheduledAt! < startOfToday)
  const today = pending.filter((a) => a.scheduledAt! >= startOfToday)

  return { all, overdue, today, empresas }
}

export default async function ActividadesPage() {
  const { all, overdue, today, empresas } = await getData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Actividades</h1>
          <p className="text-crm-muted text-sm mt-1">{all.length} registradas en total</p>
        </div>
        <ActividadModal empresas={empresas} />
      </div>

      {(overdue.length > 0 || today.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdue.length > 0 && (
            <div className="crm-card border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-crm-destructive" />
                <p className="text-sm font-medium text-crm-destructive">Vencidos ({overdue.length})</p>
              </div>
              <div className="space-y-2">
                {overdue.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-crm-foreground truncate">{a.description}</p>
                    <CompletarActividadButton activityId={a.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {today.length > 0 && (
            <div className="crm-card border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-crm-warning" />
                <p className="text-sm font-medium text-crm-warning">Hoy ({today.length})</p>
              </div>
              <div className="space-y-2">
                {today.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-orange-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-crm-foreground truncate">{a.description}</p>
                    <CompletarActividadButton activityId={a.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="crm-card">
        <p className="text-base font-medium text-crm-foreground mb-4">Todas las Actividades</p>
        {all.length === 0 ? (
          <p className="text-sm text-crm-muted text-center py-8">Sin actividades registradas</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {all.map((a) => {
              const Icon = ACTIVITY_ICON[a.type] ?? FileText
              return (
                <div key={a.id} className="flex gap-3">
                  <div className="rounded-full bg-crm-secondary p-2 h-fit shrink-0">
                    <Icon className="h-3.5 w-3.5 text-crm-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-crm-secondary text-crm-muted">
                        {ACTIVITY_LABEL[a.type] ?? a.type}
                      </span>
                      <span className="text-xs text-crm-muted">{a.contact?.name ?? a.company.name}</span>
                      {a.completedAt ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-crm-success" />
                      ) : a.scheduledAt ? (
                        <CompletarActividadButton activityId={a.id} />
                      ) : null}
                    </div>
                    <p className="text-sm text-crm-foreground mt-1">{a.description}</p>
                    <p className="text-xs text-crm-muted mt-0.5">{formatRelativeDate(a.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
