import { prisma } from '@/lib/db'
import { ensurePipelineStages } from '@/lib/pipeline'
import PipelineStagesList from '@/components/crm/PipelineStagesList'
import WebhookSettings from '@/components/crm/WebhookSettings'
import NotificationsToggle from '@/components/crm/NotificationsToggle'

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
        <p className="text-crm-muted text-sm mt-1">Etapas del pipeline, leads automáticos y notificaciones</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PipelineStagesList stages={stages} />
        <div className="space-y-4">
          <WebhookSettings />
          <NotificationsToggle />
        </div>
      </div>
    </div>
  )
}
