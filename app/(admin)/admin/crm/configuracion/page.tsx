import { prisma } from '@/lib/db'
import { ensurePipelineStages } from '@/lib/pipeline'
import PipelineStagesList from '@/components/crm/PipelineStagesList'

async function getStages() {
  await ensurePipelineStages()
  return prisma.pipelineStage.findMany({ orderBy: { order: 'asc' } })
}

export default async function ConfiguracionPage() {
  const stages = await getStages()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Configuración</h1>
        <p className="text-crm-muted text-sm mt-1">Etapas del pipeline de ventas</p>
      </div>

      <PipelineStagesList stages={stages} />
    </div>
  )
}
