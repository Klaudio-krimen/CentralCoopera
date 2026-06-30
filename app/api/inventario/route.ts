import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessInventario(role: string) {
  return role === 'ADMIN' || role === 'BODEGA'
}

// GET /api/inventario — listar ítems de stock
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessInventario(session.user.role)) return apiError('Acceso denegado', 403)

  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(items)
}

// POST /api/inventario — crear ítem de stock (cantidad inicial 0)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessInventario(session.user.role)) return apiError('Acceso denegado', 403)

  const { name, category, unit } = await req.json()

  if (!name?.trim()) return apiError('El nombre es requerido')
  if (!['MATERIA_PRIMA', 'PALLET', 'OTRO'].includes(category)) {
    return apiError('Categoría inválida')
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name: name.trim(),
      category,
      unit: unit?.trim() || 'kg',
    },
  })

  return NextResponse.json(item, { status: 201 })
}
