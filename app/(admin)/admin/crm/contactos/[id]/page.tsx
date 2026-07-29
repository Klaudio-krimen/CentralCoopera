import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'
import { ArrowLeft, Building2, Calendar, FileText, Phone, Mail } from 'lucide-react'
import TemperatureBadge from '@/components/ui/TemperatureBadge'
import ContactoActions from '@/components/ui/ContactoActions'
import ActividadModal from '@/components/ui/ActividadModal'
import CompletarActividadButton from '@/components/crm/CompletarActividadButton'
import { EmailQuickActions, PhoneQuickActions } from '@/components/crm/ContactQuickActions'

const ACTIVITY_LABEL: Record<string, string> = {
  LLAMADA: 'Llamada',
  EMAIL: 'Email',
  REUNION: 'Reunión',
  NOTA: 'Nota',
  SEGUIMIENTO: 'Seguimiento',
}

async function getContacto(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      company: { select: { name: true } },
      deals: {
        include: { stage: { select: { name: true, color: true } } },
        orderBy: { updatedAt: 'desc' },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
}

export default async function ContactoDetailPage({ params }: { params: { id: string } }) {
  const contacto = await getContacto(params.id)
  if (!contacto) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/crm/contactos"
          aria-label="Volver a contactos"
          className="w-9 h-9 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-crm-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-crm-foreground">{contacto.name}</h1>
            <TemperatureBadge temperature={contacto.temperature} />
          </div>
          <p className="text-crm-muted text-sm">
            Score: {contacto.score}/100 · {contacto.company.name}
          </p>
        </div>
        <ContactoActions contacto={contacto} isActive={contacto.isActive} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información */}
        <div className="crm-card">
          <p className="text-base font-medium text-crm-foreground mb-3">Información</p>
          <div className="space-y-3">
            {contacto.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-crm-muted shrink-0" />
                <EmailQuickActions email={contacto.email} />
              </div>
            )}
            {contacto.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-crm-muted shrink-0" />
                <PhoneQuickActions phone={contacto.phone} />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-crm-muted shrink-0" />
              <span className="text-crm-foreground">{contacto.company.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-crm-muted shrink-0" />
              <span className="text-crm-muted">Creado {formatDate(contacto.createdAt)}</span>
            </div>
            {contacto.notes && (
              <div className="pt-2 border-t border-crm-border">
                <p className="text-sm text-crm-muted">{contacto.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Deals */}
        <div className="crm-card">
          <p className="text-base font-medium text-crm-foreground mb-3">Deals ({contacto.deals.length})</p>
          {contacto.deals.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin deals</p>
          ) : (
            <div className="space-y-3">
              {contacto.deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/admin/crm/deals/${deal.id}`}
                  className="block p-3 rounded-lg border border-crm-border hover:bg-crm-secondary/50 transition-colors"
                >
                  <p className="text-sm font-medium text-crm-foreground">{deal.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-crm-primary font-mono tabular-nums">
                      {formatCurrency(deal.value)}
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full border font-medium"
                      style={{ borderColor: deal.stage.color, color: deal.stage.color }}
                    >
                      {deal.stage.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actividades */}
        <div className="crm-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-crm-foreground">Actividades ({contacto.activities.length})</p>
            <ActividadModal companyId={contacto.companyId} contactId={contacto.id} />
          </div>
          {contacto.activities.length === 0 ? (
            <p className="text-sm text-crm-muted">Sin actividades. Registra una llamada, email o nota.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {contacto.activities.map((a) => {
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
