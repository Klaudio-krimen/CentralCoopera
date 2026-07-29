import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { ensurePipelineStages } from '@/lib/pipeline'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

// GET /api/deals — listado global de deals (para la tabla de Deals)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const deals = await prisma.deal.findMany({
    include: {
      company: { select: { name: true } },
      contact: { select: { name: true } },
      stage: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(deals)
}

// POST /api/deals — crear deal (arranca en la primera etapa del pipeline)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { companyId, contactId, title, value, probability, expectedClose, notes } = await req.json()

  if (!companyId) return apiError('companyId requerido')
  if (!title?.trim()) return apiError('El título es requerido')

  await ensurePipelineStages()
  const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'asc' } })
  if (!firstStage) return apiError('No hay etapas de pipeline configuradas')

  const deal = await prisma.deal.create({
    data: {
      companyId,
      contactId: contactId || null,
      title: title.trim(),
      value: value ? parseFloat(value) : 0,
      probability: probability ? parseInt(probability, 10) : 0,
      expectedClose: expectedClose ? new Date(expectedClose) : null,
      notes: notes?.trim() || null,
      stageId: firstStage.id,
    },
  })

  return NextResponse.json(deal, { status: 201 })
}

// PATCH /api/deals — editar campos del deal (no la etapa — eso es /api/pipeline)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { id, title, value, probability, contactId, expectedClose, notes } = await req.json()
  if (!id) return apiError('id requerido')

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(value !== undefined ? { value: parseFloat(value) } : {}),
      ...(probability !== undefined ? { probability: parseInt(probability, 10) } : {}),
      ...(contactId !== undefined ? { contactId: contactId || null } : {}),
      ...(expectedClose !== undefined ? { expectedClose: expectedClose ? new Date(expectedClose) : null } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
  })

  return NextResponse.json(deal)
}
