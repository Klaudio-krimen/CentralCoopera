import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

const DEFAULT_STAGES = [
  { name: 'Prospecto', order: 1, color: '#64748b', isWon: false, isLost: false },
  { name: 'Contactado', order: 2, color: '#2563eb', isWon: false, isLost: false },
  { name: 'Propuesta', order: 3, color: '#8b5cf6', isWon: false, isLost: false },
  { name: 'Negociación', order: 4, color: '#ea580c', isWon: false, isLost: false },
  { name: 'Cerrado ganado', order: 5, color: '#16a34a', isWon: true, isLost: false },
  { name: 'Cerrado perdido', order: 6, color: '#dc2626', isWon: false, isLost: true },
]

// Auto-siembra las etapas por defecto la primera vez que alguien abre el pipeline.
async function ensureStages() {
  const count = await prisma.pipelineStage.count()
  if (count === 0) {
    await prisma.pipelineStage.createMany({ data: DEFAULT_STAGES })
  }
}

// GET /api/pipeline — etapas con sus deals (para el tablero Kanban)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  await ensureStages()

  const stages = await prisma.pipelineStage.findMany({
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

  return NextResponse.json(stages)
}

// PATCH /api/pipeline — mover un deal a otra etapa (drag & drop)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { dealId, stageId } = await req.json()
  if (!dealId || !stageId) return apiError('dealId y stageId requeridos')

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { stageId },
  })

  return NextResponse.json(deal)
}
