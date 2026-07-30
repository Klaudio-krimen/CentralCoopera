import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, clamp } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

const TEMPERATURES = ['FRIO', 'TIBIO', 'CALIENTE']

// GET /api/contactos?companyId=xxx — contactos de una empresa
// GET /api/contactos?temperature=CALIENTE&search=texto — listado global (todas las empresas)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const companyId = req.nextUrl.searchParams.get('companyId')
  const temperature = req.nextUrl.searchParams.get('temperature')
  const search = req.nextUrl.searchParams.get('search')

  if (companyId) {
    const contacts = await prisma.contact.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(contacts)
  }

  const contacts = await prisma.contact.findMany({
    where: {
      isActive: true,
      ...(temperature && TEMPERATURES.includes(temperature) ? { temperature: temperature as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contacts)
}

const SOURCES = ['WEBSITE', 'WHATSAPP', 'REFERIDO', 'REDES_SOCIALES', 'LLAMADA_FRIA', 'EMAIL', 'FORMULARIO', 'EVENTO', 'IMPORT', 'WEBHOOK', 'SCRAPING', 'OTRO']

// POST /api/contactos — crear contacto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { companyId, name, role, email, phone, notes, temperature, score, source } = await req.json()

  if (!companyId) return apiError('companyId requerido')
  if (!name?.trim()) return apiError('El nombre es requerido')
  if (temperature !== undefined && !TEMPERATURES.includes(temperature)) {
    return apiError('Temperatura inválida')
  }
  if (source !== undefined && !SOURCES.includes(source)) {
    return apiError('Fuente inválida')
  }

  const contact = await prisma.contact.create({
    data: {
      companyId,
      name: name.trim(),
      role: role?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(score !== undefined ? { score: clamp(Number(score) || 0, 0, 100) } : {}),
      ...(source !== undefined ? { source } : {}),
    },
  })

  return NextResponse.json(contact, { status: 201 })
}

// PATCH /api/contactos — editar o desactivar contacto
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { id, name, role, email, phone, notes, isActive, temperature, score, source } = await req.json()
  if (!id) return apiError('id requerido')
  if (temperature !== undefined && !TEMPERATURES.includes(temperature)) {
    return apiError('Temperatura inválida')
  }
  if (source !== undefined && !SOURCES.includes(source)) {
    return apiError('Fuente inválida')
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(role !== undefined ? { role: role?.trim() || null } : {}),
      ...(email !== undefined ? { email: email?.trim() || null } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(score !== undefined ? { score: clamp(Number(score) || 0, 0, 100) } : {}),
      ...(source !== undefined ? { source } : {}),
    },
  })

  return NextResponse.json(contact)
}
