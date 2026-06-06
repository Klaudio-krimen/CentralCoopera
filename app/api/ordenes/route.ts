import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/ordenes
// Query params: status (comma-separated), driverId=me, code, page, limit
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const { searchParams } = req.nextUrl
  const statusParam  = searchParams.get('status')
  const driverParam  = searchParams.get('driverId')
  const codeParam    = searchParams.get('code')
  const page         = parseInt(searchParams.get('page') ?? '1')
  const limit        = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100)
  const skip         = (page - 1) * limit

  const isChofer = session.user.role === 'CHOFER'

  // Choferes solo pueden ver sus propias órdenes
  const driverFilter =
    isChofer
      ? session.user.id
      : driverParam === 'me'
      ? session.user.id
      : driverParam ?? undefined

  const where: any = {
    ...(driverFilter ? { driverId: driverFilter } : {}),
    ...(statusParam
      ? { status: { in: statusParam.split(',') as any[] } }
      : {}),
    ...(codeParam ? { orderCode: { contains: codeParam.toUpperCase() } } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.pickupOrder.findMany({
      where,
      include: {
        company: { select: { name: true } },
        driver:  { select: { name: true } },
        items:   { select: { id: true, materialName: true, declaredQuantity: true, unit: true } },
        _count:  { select: { discrepancies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.pickupOrder.count({ where }),
  ])

  return NextResponse.json({ orders, total, page, limit })
}

// POST /api/ordenes — crear nueva orden (CHOFER o ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role === 'RECEPCION') return apiError('Acceso denegado', 403)

  const body = await req.json()
  const { companyId } = body

  if (!companyId) return apiError('companyId es requerido')

  const company = await prisma.company.findUnique({ where: { id: companyId, isActive: true } })
  if (!company) return apiError('Empresa no encontrada o inactiva', 404)

  // Generate order code atomically
  const counter = await prisma.orderCounter.update({
    where: { id: 'singleton' },
    data:  { count: { increment: 1 } },
  })

  const year      = new Date().getFullYear()
  const orderCode = `RET-${year}-${String(counter.count).padStart(4, '0')}`

  const order = await prisma.pickupOrder.create({
    data: {
      orderCode,
      status:    'EN_RETIRO',
      driverId:  session.user.id,
      companyId,
    },
    include: {
      company: { select: { name: true } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
