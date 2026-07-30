import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { ensureWebhookConfig } from '@/lib/webhook'

// Mapeo de sinónimos español/inglés → campo estándar. Port de
// auto-crm/src/app/api/webhook/route.ts (FIELD_MAP), con "role"/"cargo" y
// "source"/"fuente" agregados (campos que ya existen en el modelo Contact
// de Central Coopera pero que auto-crm no tiene).
const FIELD_MAP: Record<string, string> = {
  name: 'name',
  nombre: 'name',
  full_name: 'name',
  fullname: 'name',
  nombre_completo: 'name',
  email: 'email',
  correo: 'email',
  email_address: 'email',
  correo_electronico: 'email',
  phone: 'phone',
  telefono: 'phone',
  phone_number: 'phone',
  cel: 'phone',
  celular: 'phone',
  whatsapp: 'phone',
  movil: 'phone',
  company: 'company',
  empresa: 'company',
  company_name: 'company',
  negocio: 'company',
  organizacion: 'company',
  role: 'role',
  cargo: 'role',
  puesto: 'role',
  position: 'role',
  notes: 'notes',
  notas: 'notes',
  message: 'notes',
  mensaje: 'notes',
  comments: 'notes',
  comentarios: 'notes',
  descripcion: 'notes',
  source: 'source',
  fuente: 'source',
}

const SOURCES = ['WEBSITE', 'WHATSAPP', 'REFERIDO', 'REDES_SOCIALES', 'LLAMADA_FRIA', 'EMAIL', 'FORMULARIO', 'EVENTO', 'IMPORT', 'WEBHOOK', 'OTRO']

// Quita tildes (NFD descompone "é" en "e" + acento combinante U+0300-U+036F,
// luego se filtran esos code points) para que "Teléfono"/"Descripción" calcen
// contra las claves de FIELD_MAP (sin tilde). Array.from itera por code point
// completo (no por code unit UTF-16), así que sobrevive a caracteres fuera
// del BMP sin partir un surrogate pair a la mitad.
function stripAccents(text: string): string {
  return Array.from(text.normalize('NFD'))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code < 0x0300 || code > 0x036f
    })
    .join('')
}

function normalizeKey(key: string): string {
  return stripAccents(key)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Resuelve un label (nombre de campo plano, o título/ref de una pregunta de
// Typeform) a un campo estándar. Primero intenta match exacto contra
// FIELD_MAP (sirve para refs cortos tipo "email" o payloads planos tipo
// {empresa: "..."}). Si no hay match exacto, el label es probablemente una
// pregunta completa en lenguaje natural ("What's your full name?") — se
// tokeniza y se busca alguna palabra suelta que sí sea una clave de
// FIELD_MAP ("name" dentro de "whats_your_full_name").
function resolveField(label: string): string | undefined {
  const normalized = normalizeKey(label)
  if (FIELD_MAP[normalized]) return FIELD_MAP[normalized]
  for (const token of normalized.split('_')) {
    if (FIELD_MAP[token]) return FIELD_MAP[token]
  }
  return undefined
}

// Typeform manda los datos en form_response.answers (arreglo de respuestas
// por pregunta), no en un objeto plano — hay que desanidarlo antes de poder
// mapear campos. El título de la pregunta (definition.fields[].title) suele
// ser una oración completa ("What's your full name?"), no una palabra clave
// corta, así que se agrega también el ref como candidato separado — quien
// arma el formulario a veces sí configura refs cortos tipo "email"/"phone"
// para integraciones, y resolveField() (con match por token) se encarga de
// extraer la palabra clave de un título largo cuando el ref no alcanza.
function unwrapTypeform(payload: Record<string, unknown>): Record<string, unknown> | null {
  const formResponse = payload.form_response
  if (!formResponse || typeof formResponse !== 'object') return null

  const fr = formResponse as Record<string, unknown>
  const answers = Array.isArray(fr.answers) ? (fr.answers as Record<string, unknown>[]) : []
  const definition = fr.definition as Record<string, unknown> | undefined
  const titleById = new Map<string, string>()
  if (definition && Array.isArray(definition.fields)) {
    for (const f of definition.fields as Record<string, unknown>[]) {
      if (typeof f.id === 'string' && typeof f.title === 'string') titleById.set(f.id, f.title)
    }
  }

  const flat: Record<string, unknown> = {}
  let unlabeled = 0
  for (const answer of answers) {
    const field = answer.field as Record<string, unknown> | undefined
    const fieldId = typeof field?.id === 'string' ? field.id : undefined
    const fieldRef = typeof field?.ref === 'string' ? field.ref : undefined
    const title = fieldId ? titleById.get(fieldId) : undefined

    const choice = answer.choice as Record<string, unknown> | undefined
    const choices = answer.choices as Record<string, unknown> | undefined
    const choicesLabels = Array.isArray(choices?.labels) ? (choices!.labels as string[]) : undefined
    const value =
      answer.text ??
      answer.email ??
      answer.phone_number ??
      answer.number ??
      choice?.label ??
      choicesLabels?.join(', ') ??
      answer.boolean
    if (value === undefined || value === null) continue

    // Usa dos claves independientes por respuesta (título y ref) en vez de
    // una sola "mejor" — así extractFields prueba ambas y no importa cuál
    // de las dos resulta matcheable contra FIELD_MAP.
    if (title) flat[title] = value
    if (fieldRef && fieldRef !== title) flat[fieldRef] = value
    if (!title && !fieldRef) flat[`_unlabeled_${unlabeled++}`] = value
  }
  return flat
}

function extractFields(payload: Record<string, unknown>): Record<string, string> {
  const typeformFlat = unwrapTypeform(payload)
  const data =
    typeformFlat ??
    (payload.data && typeof payload.data === 'object' ? (payload.data as Record<string, unknown>) : payload)

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const mappedField = resolveField(key)
    if (mappedField && !result[mappedField]) {
      result[mappedField] = String(value).trim()
    }
  }

  if (!result.name) {
    const firstName = data.first_name || data.nombre || data.firstName || data.primer_nombre
    const lastName = data.last_name || data.apellido || data.lastName || data.apellidos
    if (firstName) {
      result.name = [firstName, lastName].filter(Boolean).join(' ').trim()
    }
  }

  return result
}

// POST /api/webhooks/leads — endpoint público para recibir leads desde
// formularios, landing pages o herramientas tipo Zapier/Make/Typeform/Tally/
// Google Forms. No usa sesión: se autentica con un secreto (header
// x-webhook-secret o ?secret= en la URL). Acepta sinónimos en español/inglés
// y el payload anidado real de Typeform (form_response.answers). Si la
// empresa del payload no existe en el catálogo, se crea automáticamente.
export async function POST(req: NextRequest) {
  const config = await ensureWebhookConfig()

  const providedSecret = req.headers.get('x-webhook-secret') || req.nextUrl.searchParams.get('secret')
  if (!providedSecret || providedSecret !== config.secret) return apiError('Secreto inválido', 401)
  if (!config.enabled) return apiError('Webhook deshabilitado', 403)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Body inválido')

  const fields = extractFields(body as Record<string, unknown>)

  if (!fields.name) {
    return NextResponse.json(
      {
        error: "Campo 'name' o 'nombre' es requerido",
        received: Object.keys(body),
        hint: 'Campos soportados: name/nombre, email/correo, phone/telefono/celular/whatsapp, company/empresa, role/cargo, notes/notas/mensaje, source/fuente. También soporta el payload anidado de Typeform (form_response.answers).',
      },
      { status: 400 }
    )
  }
  if (!fields.company) {
    return NextResponse.json(
      { error: "Campo 'company' o 'empresa' es requerido", received: Object.keys(body) },
      { status: 400 }
    )
  }

  const companyName = fields.company
  let companyRecord = await prisma.company.findFirst({
    where: { name: { equals: companyName, mode: 'insensitive' } },
  })
  if (!companyRecord) {
    companyRecord = await prisma.company.create({ data: { name: companyName } })
  }

  const source = fields.source?.toUpperCase()
  const sourceNote = `Lead recibido vía webhook el ${new Date().toLocaleString('es-CL')}`

  const contact = await prisma.contact.create({
    data: {
      companyId: companyRecord.id,
      name: fields.name,
      role: fields.role || null,
      email: fields.email || null,
      phone: fields.phone || null,
      source: source && SOURCES.includes(source) ? (source as any) : 'WEBHOOK',
      notes: [fields.notes, sourceNote].filter(Boolean).join('\n\n'),
    },
  })

  return NextResponse.json({ id: contact.id }, { status: 201 })
}
