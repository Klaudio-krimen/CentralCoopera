import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

// GET /api/contactos?companyId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return apiError('companyId requerido')

  const contacts = await prisma.contact.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(contacts)
}

// POST /api/contactos — crear contacto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { companyId, name, role, email, phone, notes } = await req.json()

  if (!companyId) return apiError('companyId requerido')
  if (!name?.trim()) return apiError('El nombre es requerido')

  const contact = await prisma.contact.create({
    data: {
      companyId,
      name: name.trim(),
      role: role?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(contact, { status: 201 })
}

// PATCH /api/contactos — editar o desactivar contacto
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { id, name, role, email, phone, notes, isActive } = await req.json()
  if (!id) return apiError('id requerido')

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(role !== undefined ? { role: role?.trim() || null } : {}),
      ...(email !== undefined ? { email: email?.trim() || null } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  })

  return NextResponse.json(contact)
}
