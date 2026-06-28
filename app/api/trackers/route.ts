import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/trackers — lista de trackers (solo ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const trackers = await prisma.tracker.findMany({
    select: {
      id:       true,
      label:    true,
      type:     true,
      kind:     true,
      isActive: true,
    },
    orderBy: { label: 'asc' },
  })

  return NextResponse.json(trackers)
}
