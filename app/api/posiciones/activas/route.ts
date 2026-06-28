import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/posiciones/activas — última posición de cada tracker activo (solo ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  // Prisma `distinct` + orderBy desc → la primera fila por trackerId es la más reciente
  const latest = await prisma.position.findMany({
    where: { tracker: { isActive: true } },
    distinct: ['trackerId'],
    orderBy: { recordedAt: 'desc' },
    include: { tracker: { select: { label: true, kind: true } } },
  })

  const result = latest.map((p) => ({
    trackerId:  p.trackerId,
    label:      p.tracker.label,
    kind:       p.tracker.kind,
    lat:        p.lat,
    lng:        p.lng,
    recordedAt: p.recordedAt,
  }))

  return NextResponse.json(result)
}
