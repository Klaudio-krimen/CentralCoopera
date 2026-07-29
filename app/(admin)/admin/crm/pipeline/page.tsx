import { prisma } from '@/lib/db'
import KanbanBoard, { type PipelineColumn } from '@/components/ui/KanbanBoard'
import { formatCurrency } from '@/lib/utils'
import { Target } from '@phosphor-icons/react/dist/ssr'

const DEFAULT_STAGES = [
  { name: 'Prospecto', order: 1, color: '#64748b', isWon: false, isLost: false },
  { name: 'Contactado', order: 2, color: '#2563eb', isWon: false, isLost: false },
  { name: 'Propuesta', order: 3, color: '#8b5cf6', isWon: false, isLost: false },
  { name: 'Negociación', order: 4, color: '#ea580c', isWon: false, isLost: false },
  { name: 'Cerrado ganado', order: 5, color: '#16a34a', isWon: true, isLost: false },
  { name: 'Cerrado perdido', order: 6, color: '#dc2626', isWon: false, isLost: true },
]

async function getStages() {
  const count = await prisma.pipelineStage.count()
  if (count === 0) {
    await prisma.pipelineStage.createMany({ data: DEFAULT_STAGES })
  }

  return prisma.pipelineStage.findMany({
    orderBy: { order: 'asc' },
    include: {
      deals: {
        include: {
          company: { select: { name: true } },
          contact: { select: { name: true } },
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Pipeline</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {openCount} deal{openCount !== 1 ? 's' : ''} abierto{openCount !== 1 ? 's' : ''} · {formatCurrency(totalOpen)} en juego
          </p>
        </div>
      </div>

      {stages.every((s) => s.deals.length === 0) ? (
        <div className="panel text-center py-16 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Target size={22} className="text-zinc-400" />
          </div>
          <p className="text-zinc-700 font-medium">Sin deals todavía</p>
          <p className="text-zinc-500 text-sm mt-1">Crea un deal desde la ficha de un cliente en Clientes</p>
        </div>
      ) : (
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <KanbanBoard initialColumns={columns} />
        </div>
      )}
    </div>
  )
}
