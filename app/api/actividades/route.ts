import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

// GET /api/actividades?companyId=xxx — timeline de una empresa, más reciente primero
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return apiError('companyId requerido')

  const activities = await prisma.activity.findMany({
    where: { companyId },
    include: {
      contact: { select: { name: true } },
      deal: { select: { title: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(activities)
}

// POST /api/actividades — registrar una actividad
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { companyId, contactId, dealId, type, description, scheduledAt } = await req.json()

  if (!companyId) return apiError('companyId requerido')
  if (!['LLAMADA', 'EMAIL', 'REUNION', 'NOTA', 'SEGUIMIENTO'].includes(type)) {
    return apiError('Tipo de actividad inválido')
  }
  if (!description?.trim()) return apiError('La descripción es requerida')

  const activity = await prisma.activity.create({
    data: {
      companyId,
      contactId: contactId || null,
      dealId: dealId || null,
      type,
      description: description.trim(),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(activity, { status: 201 })
}

// PATCH /api/actividades — marcar como completada
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { id } = await req.json()
  if (!id) return apiError('id requerido')

  const activity = await prisma.activity.update({
    where: { id },
    data: { completedAt: new Date() },
  })

  return NextResponse.json(activity)
}
