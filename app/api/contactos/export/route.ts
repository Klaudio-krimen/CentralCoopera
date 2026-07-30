import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, CONTACT_SOURCE_LABELS } from '@/lib/utils'
import { toCsv } from '@/lib/csv'

const TEMPERATURES = ['FRIO', 'TIBIO', 'CALIENTE']

// GET /api/contactos/export?temperature=&search= — descarga CSV del listado global
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN' && session.user.role !== 'VENTAS') {
    return apiError('Acceso denegado', 403)
  }

  const temperature = req.nextUrl.searchParams.get('temperature')
  const search = req.nextUrl.searchParams.get('search')

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

  const csv = toCsv(
    contacts.map((c) => ({
      nombre: c.name,
      empresa: c.company.name,
      cargo: c.role ?? '',
      email: c.email ?? '',
      telefono: c.phone ?? '',
      temperatura: c.temperature,
      score: c.score,
      fuente: CONTACT_SOURCE_LABELS[c.source],
    })),
    [
      { key: 'nombre', label: 'Nombre' },
      { key: 'empresa', label: 'Empresa' },
      { key: 'cargo', label: 'Cargo' },
      { key: 'email', label: 'Email' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'temperatura', label: 'Temperatura' },
      { key: 'score', label: 'Score' },
      { key: 'fuente', label: 'Fuente' },
    ]
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="contactos.csv"',
    },
  })
}
