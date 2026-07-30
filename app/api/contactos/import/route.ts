import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

function canAccessCrm(role: string) {
  return role === 'ADMIN' || role === 'VENTAS'
}

const TEMPERATURES = ['FRIO', 'TIBIO', 'CALIENTE']
const SOURCES = ['WEBSITE', 'WHATSAPP', 'REFERIDO', 'REDES_SOCIALES', 'LLAMADA_FRIA', 'EMAIL', 'FORMULARIO', 'EVENTO', 'IMPORT', 'WEBHOOK', 'OTRO']

interface ImportRow {
  name?: string
  email?: string
  phone?: string
  role?: string
  company?: string
  temperature?: string
  source?: string
}

// POST /api/contactos/import — carga masiva de contactos desde un CSV ya
// parseado en el cliente. Si la empresa no existe se crea automáticamente
// (mismo criterio que el webhook de leads en /api/webhooks/leads).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (!canAccessCrm(session.user.role)) return apiError('Acceso denegado', 403)

  const { rows } = (await req.json()) as { rows: ImportRow[] }
  if (!Array.isArray(rows) || rows.length === 0) return apiError('Sin filas para importar')

  const companyCache = new Map<string, string>()
  let created = 0
  let companiesCreated = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      if (!row.name?.trim()) throw new Error('Falta el nombre')
      if (!row.company?.trim()) throw new Error('Falta la empresa')

      const companyName = row.company.trim()
      const companyKey = companyName.toLowerCase()
      let companyId = companyCache.get(companyKey)
      if (!companyId) {
        let companyRecord = await prisma.company.findFirst({
          where: { name: { equals: companyName, mode: 'insensitive' } },
        })
        if (!companyRecord) {
          companyRecord = await prisma.company.create({ data: { name: companyName } })
          companiesCreated++
        }
        companyId = companyRecord.id
        companyCache.set(companyKey, companyId)
      }

      const temperature = row.temperature?.trim().toUpperCase()
      const source = row.source?.trim().toUpperCase()

      await prisma.contact.create({
        data: {
          companyId,
          name: row.name.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          role: row.role?.trim() || null,
          source: source && SOURCES.includes(source) ? (source as any) : 'IMPORT',
          ...(temperature && TEMPERATURES.includes(temperature) ? { temperature: temperature as any } : {}),
        },
      })
      created++
    } catch (e) {
      errors.push({ row: i + 2, message: e instanceof Error ? e.message : 'Error desconocido' })
    }
  }

  return NextResponse.json({ created, companiesCreated, errors })
}
