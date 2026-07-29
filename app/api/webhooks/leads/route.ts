import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { ensureWebhookConfig } from '@/lib/webhook'

// POST /api/webhooks/leads — endpoint público para recibir leads desde
// formularios, landing pages o herramientas tipo Zapier/Make. No usa sesión:
// se autentica con un secreto (header x-webhook-secret o ?secret= en la URL).
// Si la empresa del payload no existe en el catálogo, se crea automáticamente
// (decisión confirmada — igual criterio que /api/contactos/import).
export async function POST(req: NextRequest) {
  const config = await ensureWebhookConfig()

  const providedSecret = req.headers.get('x-webhook-secret') || req.nextUrl.searchParams.get('secret')
  if (!providedSecret || providedSecret !== config.secret) return apiError('Secreto inválido', 401)
  if (!config.enabled) return apiError('Webhook deshabilitado', 403)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Body inválido')

  const { name, email, phone, role, notes, company, source } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) return apiError('name es requerido')
  if (typeof company !== 'string' || !company.trim()) return apiError('company es requerido')

  const companyName = company.trim()
  let companyRecord = await prisma.company.findFirst({
    where: { name: { equals: companyName, mode: 'insensitive' } },
  })
  if (!companyRecord) {
    companyRecord = await prisma.company.create({ data: { name: companyName } })
  }

  const sourceNote = `Lead recibido vía webhook${typeof source === 'string' && source.trim() ? ` (${source.trim()})` : ''} el ${new Date().toLocaleString('es-CL')}`
  const notesText = typeof notes === 'string' ? notes.trim() : ''

  const contact = await prisma.contact.create({
    data: {
      companyId: companyRecord.id,
      name: name.trim(),
      role: typeof role === 'string' ? role.trim() || null : null,
      email: typeof email === 'string' ? email.trim() || null : null,
      phone: typeof phone === 'string' ? phone.trim() || null : null,
      notes: [notesText, sourceNote].filter(Boolean).join('\n\n'),
    },
  })

  return NextResponse.json({ id: contact.id }, { status: 201 })
}
