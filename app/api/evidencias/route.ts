import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import sharp from 'sharp'

const MAX_SIZE_MB  = parseInt(process.env.MAX_PHOTO_SIZE_MB   ?? '1')
const MAX_PHOTOS   = parseInt(process.env.MAX_PHOTOS_PER_ORDER ?? '5')
const IS_VERCEL    = !!process.env.BLOB_READ_WRITE_TOKEN

// POST /api/evidencias — upload photo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  const orderId  = formData.get('orderId') as string | null
  const stage    = (formData.get('stage') as string | null) ?? 'RETIRO'
  const lat      = formData.get('lat') ? parseFloat(formData.get('lat') as string) : null
  const lng      = formData.get('lng') ? parseFloat(formData.get('lng') as string) : null

  if (!file)    return apiError('Archivo requerido')
  if (!orderId) return apiError('orderId requerido')

  const order = await prisma.pickupOrder.findUnique({ where: { id: orderId } })
  if (!order) return apiError('Orden no encontrada', 404)

  if (session.user.role === 'CHOFER' && order.driverId !== session.user.id) {
    return apiError('Acceso denegado', 403)
  }

  const existingCount = await prisma.evidence.count({
    where: { orderId, stage: stage as any },
  })
  if (existingCount >= MAX_PHOTOS) {
    return apiError(`Límite de ${MAX_PHOTOS} fotos alcanzado`)
  }

  // Validar tamaño del archivo original antes de leer a memoria
  const MAX_RAW_MB = 20
  if (file.size > MAX_RAW_MB * 1024 * 1024) {
    return apiError(`El archivo supera el límite de ${MAX_RAW_MB}MB`, 413)
  }

  // Validar tipo MIME declarado (defensa básica; sharp validará el contenido real)
  const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!ALLOWED_MIMES.includes(file.type)) {
    return apiError('Tipo de archivo no permitido. Solo se aceptan imágenes.', 415)
  }

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let compressed: Buffer
  try {
    compressed = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return apiError('El archivo no es una imagen válida', 422)
  }

  const maxBytes = MAX_SIZE_MB * 1024 * 1024
  if (compressed.length > maxBytes) {
    return apiError(`La foto supera el tamaño máximo de ${MAX_SIZE_MB}MB`)
  }

  const filename = `ev_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`
  let imagePath: string

  if (IS_VERCEL) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`evidencias/${filename}`, compressed, {
      access: 'public',
      contentType: 'image/webp',
    })
    imagePath = blob.url
  } else {
    const { writeFile } = await import('fs/promises')
    const { join } = await import('path')
    const uploadDir = process.env.UPLOAD_DIR ?? './public/uploads'
    const filepath  = join(process.cwd(), uploadDir, filename)
    await writeFile(filepath, compressed)
    imagePath = `/uploads/${filename}`
  }

  const evidence = await prisma.evidence.create({
    data: {
      orderId,
      stage:        stage as any,
      imagePath,
      uploadedById: session.user.id,
      ...(lat ? { lat } : {}),
      ...(lng ? { lng } : {}),
    },
  })

  return NextResponse.json({ id: evidence.id, path: evidence.imagePath }, { status: 201 })
}

// DELETE /api/evidencias?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const { searchParams } = req.nextUrl
  const id   = searchParams.get('id')
  const path = searchParams.get('path')

  if (!id && !path) return apiError('id o path requerido')

  const evidence = await prisma.evidence.findFirst({
    where: id ? { id } : { imagePath: path ?? '' },
  })

  if (!evidence) return apiError('Evidencia no encontrada', 404)

  if (session.user.role === 'CHOFER' && evidence.uploadedById !== session.user.id) {
    return apiError('Acceso denegado', 403)
  }

  if (IS_VERCEL) {
    const { del } = await import('@vercel/blob')
    try { await del(evidence.imagePath) } catch { /* already deleted */ }
  } else {
    const { unlink } = await import('fs/promises')
    const { join }   = await import('path')
    try {
      await unlink(join(process.cwd(), 'public', evidence.imagePath))
    } catch { /* file may not exist */ }
  }

  await prisma.evidence.delete({ where: { id: evidence.id } })

  return NextResponse.json({ ok: true })
}
