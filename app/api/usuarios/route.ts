import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { hash } from 'bcryptjs'

// GET /api/usuarios?role=CHOFER
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const { searchParams } = req.nextUrl
  const role = searchParams.get('role')

  const users = await prisma.user.findMany({
    where: role ? { role: role as any } : {},
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
      _count:    { select: { ordersAsDriver: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

// POST /api/usuarios — crear usuario (solo ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') {
    console.warn('[auth] acceso denegado a POST /api/usuarios', { userId: session.user.id, role: session.user.role })
    return apiError('Acceso denegado', 403)
  }

  const { name, email, password, role } = await req.json()

  if (!name?.trim())     return apiError('Nombre requerido')
  if (!email?.trim())    return apiError('Email requerido')
  if (!password?.trim()) return apiError('Contraseña requerida')
  if (password.length < 8) return apiError('La contraseña debe tener al menos 8 caracteres')
  if (!['CHOFER', 'RECEPCION', 'ADMIN', 'VENTAS', 'BODEGA'].includes(role)) {
    return apiError('Rol inválido')
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) return apiError('Ya existe un usuario con ese email')

  const hashed = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password: hashed,
      role,
    },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}

// PATCH /api/usuarios — editar o desactivar (solo ADMIN)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') {
    console.warn('[auth] acceso denegado a PATCH /api/usuarios', { userId: session.user.id, role: session.user.role })
    return apiError('Acceso denegado', 403)
  }

  const { id, name, email, password, isActive } = await req.json()

  if (!id) return apiError('id requerido')

  // Prevent self-deactivation
  if (id === session.user.id && isActive === false) {
    return apiError('No puedes desactivarte a ti mismo')
  }

  const data: any = {}
  if (name     !== undefined) data.name     = name.trim()
  if (email    !== undefined) data.email    = email.trim().toLowerCase()
  if (isActive !== undefined) data.isActive = isActive
  if (password?.trim()) {
    if (password.length < 8) return apiError('La contraseña debe tener al menos 8 caracteres')
    data.password = await hash(password, 12)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
    },
  })

  return NextResponse.json(user)
}
