import { prisma } from '@/lib/db'
import KanbanBoard, { type PipelineColumn } from '@/components/ui/KanbanBoard'
import { formatCurrency } from '@/lib/utils'
import { ensurePipelineStages } from '@/lib/pipeline'
import { Target } from 'lucide-react'

async function getStages() {
  await ensurePipelineStages()

  return prisma.pipelineStage.findMany({
    orderBy: { order: 'asc' },
    include: {
      deals: {
        include: {
          company: { select: { name: true } },
          contact: { select: { name: true, temperature: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })
}

export default async function PipelinePage() {
  const stages = await getStages()

  const columns: PipelineColumn[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    deals: s.deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value,
      companyName: d.company.name,
      contactName: d.contact?.name ?? null,
      contactTemperature: d.contact?.temperature ?? null,
      probability: d.probability,
    })),
  }))

  const totalOpen = stages
    .filter((s) => !s.isWon && !s.isLost)
    .flatMap((s) => s.deals)
    .reduce((sum, d) => sum + d.value, 0)

  const openCount = stages.filter((s) => !s.isWon && !s.isLost).flatMap((s) => s.deals).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Pipeline</h1>
          <p className="text-crm-muted text-sm mt-1">
            {openCount} deal{openCount !== 1 ? 's' : ''} abierto{openCount !== 1 ? 's' : ''} · {formatCurrency(totalOpen)} en juego
          </p>
        </div>
      </div>

      {stages.every((s) => s.deals.length === 0) ? (
        <div className="crm-card text-center py-16 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-crm-secondary flex items-center justify-center mx-auto mb-3">
            <Target size={22} className="text-crm-muted" />
          </div>
          <p className="text-crm-foreground font-medium">Sin deals todavía</p>
          <p className="text-crm-muted text-sm mt-1">Crea un deal desde la ficha de un cliente en Clientes</p>
        </div>
      ) : (
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <KanbanBoard initialColumns={columns} />
        </div>
      )}
    </div>
  )
}
