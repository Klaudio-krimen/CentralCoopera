import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/empresas?active=true&q=texto
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const { searchParams } = req.nextUrl
  const active = searchParams.get('active') === 'true'
  const q = searchParams.get('q') ?? ''

  const isChofer = session.user.role === 'CHOFER'

  const companies = await prisma.company.findMany({
    where: {
      ...(active ? { isActive: true } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    select: {
      id: true,
      name: true,
      // CHOFERs solo necesitan id y nombre para crear órdenes
      ...(isChofer ? {} : {
        address: true,
        contactName: true,
        contactPhone: true,
        isActive: true,
      }),
    },
    orderBy: { name: 'asc' },
    take: 20,
  })

  return NextResponse.json(companies)
}

// POST /api/empresas — solo ADMIN
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const body = await req.json()
  const { name, address, contactName, contactPhone } = body

  if (!name?.trim()) return apiError('El nombre es requerido')

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
    },
  })

  return NextResponse.json(company, { status: 201 })
}

// PATCH /api/empresas — editar empresa (solo ADMIN)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const body = await req.json()
  const { id, name, address, contactName, contactPhone, isActive } = body

  if (!id) return apiError('ID requerido')

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(address !== undefined ? { address: address?.trim() || null } : {}),
      ...(contactName !== undefined ? { contactName: contactName?.trim() || null } : {}),
      ...(contactPhone !== undefined ? { contactPhone: contactPhone?.trim() || null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  })

  return NextResponse.json(company)
}
