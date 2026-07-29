import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

// GET /api/actividades/pendientes — seguimientos programados no completados,
// agrupados en vencidos (antes de hoy) y de hoy, cruzando todas las empresas.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const pending = await prisma.activity.findMany({
    where: {
      completedAt: null,
      scheduledAt: { not: null, lt: startOfTomorrow },
    },
    include: {
      contact: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  const overdue = pending.filter((a) => a.scheduledAt! < startOfToday)
  const today = pending.filter((a) => a.scheduledAt! >= startOfToday)

  return NextResponse.json({ overdue, today })
}
