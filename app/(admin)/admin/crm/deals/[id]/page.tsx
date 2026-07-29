import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'
import { ArrowLeft, DollarSign, Percent, Calendar, TrendingUp, FileText } from 'lucide-react'
import DealModal from '@/components/ui/DealModal'
import ActividadModal from '@/components/ui/ActividadModal'
import CompletarActividadButton from '@/components/crm/CompletarActividadButton'

const ACTIVITY_LABEL: Record<string, string> = {
  LLAMADA: 'Llamada',
  EMAIL: 'Email',
  REUNION: 'Reunión',
  NOTA: 'Nota',
  SEGUIMIENTO: 'Seguimiento',
}

async function getDeal(id: string) {
  return prisma.deal.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      stage: { select: { name: true, color: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const deal = await getDeal(params.id)
  if (!deal) notFound()

  const weighted = deal.value * (deal.probability / 100)
  const contactos = deal.contact ? [{ id: deal.contact.id, name: deal.contact.name }] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/crm/deals"
          aria-label="Volver a deals"
          className="w-9 h-9 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-crm-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-crm-foreground">{deal.title}</h1>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border font-medium"
              style={{ borderColor: deal.stage.color, color: deal.stage.color }}
            >
              {deal.stage.name}
            </span>
          </div>
          <p className="text-crm-muted text-sm">
            {deal.company.name}
            {deal.contact && <> · {deal.contact.name}</>}
          </p>
        </div>
        <DealModal
          initialData={{
            id: deal.id,
            title: deal.title,
            value: deal.value,
            probability: deal.probability,
            contactId: deal.contactId,
            expectedClose: deal.expectedClose ? deal.expectedClose.toISOString().slice(0, 10) : null,
            notes: deal.notes,
          }}
          contactos={contactos}
          trigger={<button className="crm-btn-outline">Editar</button>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="crm-card">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-crm-muted">Valor</p>
            <DollarSign className="h-4 w-4 text-crm-primary" />
          </div>
          <p className="text-xl font-bold text-crm-primary font-mono tabular-nums">{formatCurrency(deal.value)}</p>
        </div>
        <div className="crm-card">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-crm-muted">Probabilidad</p>
            <Percent className="h-4 w-4 text-crm-muted" />
          </div>
          <p className="text-xl font-bold text-crm-foreground font-mono tabular-nums">{deal.probability}%</p>
        </div>
        <div className="crm-card">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-crm-muted">Cierre estimado</p>
            <Calendar className="h-4 w-4 text-crm-muted" />
          </div>
          <p className="text-sm font-medium text-crm-foreground">
            {deal.expectedClose ? formatDate(deal.expectedClose) : '—'}
          </p>
        </div>
        <div className="crm-card">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-crm-muted">Valor ponderado</p>
            <TrendingUp className="h-4 w-4 text-crm-success" />
          </div>
          <p className="text-xl font-bold text-crm-success font-mono tabular-nums">{formatCurrency(weighted)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deal.notes && (
          <div className="crm-card">
            <p className="text-base font-medium text-crm-foreground mb-2">Notas</p>
            <p className="text-sm text-crm-muted">{deal.notes}</p>
          </div>
        )}

        <div className={`crm-card ${!deal.notes ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-crm-foreground">Actividades ({deal.activities.length})</p>
            <ActividadModal companyId={deal.company.id} dealId={deal.id} contactId={deal.contact?.id} />
          </div>
          {deal.activities.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin actividades registradas para este deal.</p>
          ) : (
            <div className="space-y-4 max-h-[360px] overflow-y-auto">
              {deal.activities.map((a) => {
                const isPending = !a.completedAt && a.scheduledAt
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="rounded-full bg-crm-secondary p-2 h-fit shrink-0">
                      <FileText className="h-3.5 w-3.5 text-crm-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-crm-secondary text-crm-muted">
                          {ACTIVITY_LABEL[a.type] ?? a.type}
                        </span>
                        {isPending && <CompletarActividadButton activityId={a.id} />}
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
    </div>
  )
}
