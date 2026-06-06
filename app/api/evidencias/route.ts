import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { writeFile, unlink } from 'fs/promises'
import { join, basename } from 'path'
import sharp from 'sharp'

const MAX_SIZE_MB  = parseInt(process.env.MAX_PHOTO_SIZE_MB   ?? '1')
const MAX_PHOTOS   = parseInt(process.env.MAX_PHOTOS_PER_ORDER ?? '5')
const UPLOAD_DIR   = process.env.UPLOAD_DIR ?? './public/uploads'

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

  // Validate order exists and user has access
  const order = await prisma.pickupOrder.findUnique({ where: { id: orderId } })
  if (!order) return apiError('Orden no encontrada', 404)

  if (session.user.role === 'CHOFER' && order.driverId !== session.user.id) {
    return apiError('Acceso denegado', 403)
  }

  // Count existing photos for this order+stage
  const existingCount = await prisma.evidence.count({
    where: { orderId, stage: stage as any },
  })
  if (existingCount >= MAX_PHOTOS) {
    return apiError(`Límite de ${MAX_PHOTOS} fotos alcanzado`)
  }

  // Read file buffer
  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Compress with sharp (max 1MB, WebP)
  const compressed = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const maxBytes = MAX_SIZE_MB * 1024 * 1024
  if (compressed.length > maxBytes) {
    return apiError(`La foto supera el tamaño máximo de ${MAX_SIZE_MB}MB`)
  }

  // Save file
  const filename  = `ev_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`
  const filepath  = join(process.cwd(), UPLOAD_DIR, filename)

  await writeFile(filepath, compressed)

  const evidence = await prisma.evidence.create({
    data: {
      orderId,
      stage:       stage as any,
      imagePath:   `/uploads/${filename}`,
      uploadedById: session.user.id,
      ...(lat ? { lat } : {}),
      ...(lng ? { lng } : {}),
    },
  })

  return NextResponse.json({ id: evidence.id, path: evidence.imagePath }, { status: 201 })
}

// DELETE /api/evidencias?id=xxx  OR  ?path=/uploads/xxx.webp
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

  // Only uploader, or ADMIN, can delete
  if (session.user.role === 'CHOFER' && evidence.uploadedById !== session.user.id) {
    return apiError('Acceso denegado', 403)
  }

  // Delete file from disk
  try {
    const diskPath = join(process.cwd(), 'public', evidence.imagePath)
    await unlink(diskPath)
  } catch {
    // File may not exist — continue
  }

  await prisma.evidence.delete({ where: { id: evidence.id } })

  return NextResponse.json({ ok: true })
}
