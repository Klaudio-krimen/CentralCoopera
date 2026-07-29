import { prisma } from '@/lib/db'

export const DEFAULT_STAGES = [
  { name: 'Prospecto', order: 1, color: '#64748b', isWon: false, isLost: false },
  { name: 'Contactado', order: 2, color: '#2563eb', isWon: false, isLost: false },
  { name: 'Propuesta', order: 3, color: '#8b5cf6', isWon: false, isLost: false },
  { name: 'Negociación', order: 4, color: '#ea580c', isWon: false, isLost: false },
  { name: 'Cerrado ganado', order: 5, color: '#16a34a', isWon: true, isLost: false },
  { name: 'Cerrado perdido', order: 6, color: '#dc2626', isWon: false, isLost: true },
]

// Auto-siembra las etapas por defecto la primera vez que alguien abre
// cualquier pantalla del CRM que dependa del pipeline (Dashboard, Pipeline).
export async function ensurePipelineStages() {
  const count = await prisma.pipelineStage.count()
  if (count === 0) {
    await prisma.pipelineStage.createMany({ data: DEFAULT_STAGES })
  }
}
