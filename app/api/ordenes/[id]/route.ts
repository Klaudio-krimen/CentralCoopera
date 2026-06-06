import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError, calculateDiscrepancy } from '@/lib/utils'

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN

// GET /api/ordenes/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const order = await prisma.pickupOrder.findUnique({
    where: { id: params.id },
    include: {
      company:      { select: { name: true, address: true, contactName: true } },
      driver:       { select: { name: true, email: true } },
      items:        { include: { materialType: true } },
      evidences:    true,
      discrepancies: true,
    },
  })

  if (!order) return apiError('Orden no encontrada', 404)

  // Choferes solo ven sus propias órdenes
  if (session.user.role === 'CHOFER' && order.driverId !== session.user.id) {
    return apiError('Acceso denegado', 403)
  }

  return NextResponse.json(order)
}

// PATCH /api/ordenes/:id
// Handles multiple actions based on body content:
//   - Update items (action omitted)
//   - Save signature (signatureDataUrl + clientSignerName)
//   - Confirm pickup / change status (status)
//   - Receive order (action: 'receive', receivedItems)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)

  const order = await prisma.pickupOrder.findUnique({
    where:   { id: params.id },
    include: { items: true },
  })

  if (!order) return apiError('Orden no encontrada', 404)

  // Authorization
  if (
    session.user.role === 'CHOFER' &&
    order.driverId !== session.user.id
  ) return apiError('Acceso denegado', 403)

  const body = await req.json()
  const { action } = body

  // ── Action: RECEIVE ────────────────────────────────────────────────────────
  if (action === 'receive') {
    if (session.user.role === 'CHOFER') return apiError('Acceso denegado', 403)
    if (order.status !== 'EN_TRANSITO') return apiError('La orden no está en tránsito')

    const { receivedItems, observations } = body as {
      receivedItems: { itemId: string; receivedQuantity: number }[]
      observations?: string
    }

    const threshold = parseFloat(process.env.DISCREPANCY_THRESHOLD_PERCENT ?? '2')

    // Use a transaction to update items + create discrepancies atomically
    const result = await prisma.$transaction(async (tx) => {
      let hasDiscrepancy = false
      const discrepanciasToCreate: any[] = []

      for (const ri of receivedItems) {
        const item = order.items.find((i) => i.id === ri.itemId)
        if (!item) continue

        await tx.orderItem.update({
          where: { id: ri.itemId },
          data:  { receivedQuantity: ri.receivedQuantity },
        })

        const { percentage, severity } = calculateDiscrepancy(
          item.declaredQuantity,
          ri.receivedQuantity
        )

        if (percentage > threshold && severity) {
          hasDiscrepancy = true
          discrepanciasToCreate.push({
            orderId:          params.id,
            orderItemId:      item.id,
            materialType:     item.materialName,
            declaredQuantity: item.declaredQuantity,
            receivedQuantity: ri.receivedQuantity,
            differencePercent: percentage,
            severity,
            detectedById:    session.user.id,
            description: `Diferencia de ${percentage.toFixed(1)}% en ${item.materialName}`,
          })
        }
      }

      const newStatus = hasDiscrepancy ? 'DISCREPANCIA' : 'RECIBIDA'

      const updated = await tx.pickupOrder.update({
        where: { id: params.id },
        data: {
          status:      newStatus,
          deliveredAt: new Date(),
          ...(observations ? { notes: observations } : {}),
        },
      })

      if (discrepanciasToCreate.length > 0) {
        await tx.discrepancy.createMany({ data: discrepanciasToCreate })
      }

      return updated
    })

    return NextResponse.json(result)
  }

  // ── Action: SAVE SIGNATURE ────────────────────────────────────────────────
  if (body.signatureDataUrl) {
    if (session.user.role !== 'CHOFER' && session.user.role !== 'ADMIN') {
      return apiError('Acceso denegado', 403)
    }

    const { signatureDataUrl, clientSignerName } = body
    if (!clientSignerName?.trim()) return apiError('El nombre del firmante es requerido')

    // Save signature image
    const base64  = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer  = Buffer.from(base64, 'base64')
    const filename = `firma_${params.id}_${Date.now()}.png`
    let signaturePath: string

    if (IS_VERCEL) {
      const { put } = await import('@vercel/blob')
      const blob = await put(`firmas/${filename}`, buffer, {
        access: 'public',
        contentType: 'image/png',
      })
      signaturePath = blob.url
    } else {
      const { writeFile } = await import('fs/promises')
      const { join }      = await import('path')
      const uploadDir = process.env.UPLOAD_DIR ?? './public/uploads'
      await writeFile(join(process.cwd(), uploadDir, filename), buffer)
      signaturePath = `/uploads/${filename}`
    }

    const updated = await prisma.pickupOrder.update({
      where: { id: params.id },
      data: {
        signatureImagePath: signaturePath,
        clientSignerName:   clientSignerName.trim(),
      },
    })

    return NextResponse.json(updated)
  }

  // ── Action: UPDATE ITEMS ──────────────────────────────────────────────────
  if (body.items !== undefined) {
    if (session.user.role === 'RECEPCION') return apiError('Acceso denegado', 403)

    const { items } = body as {
      items: { materialTypeId: string; declaredQuantity: number; unit: string }[]
    }

    // Fetch material names for snapshot
    const materialIds = items.map((i) => i.materialTypeId)
    const materials   = await prisma.materialType.findMany({
      where: { id: { in: materialIds } },
    })
    const materialMap = Object.fromEntries(materials.map((m) => [m.id, m]))

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: params.id } }),
      prisma.orderItem.createMany({
        data: items.map((item) => ({
          orderId:          params.id,
          materialTypeId:   item.materialTypeId,
          materialName:     materialMap[item.materialTypeId]?.name ?? item.materialTypeId,
          declaredQuantity: item.declaredQuantity,
          unit:             item.unit,
        })),
      }),
    ])

    const updated = await prisma.pickupOrder.findUnique({
      where:   { id: params.id },
      include: { items: true },
    })

    return NextResponse.json(updated)
  }

  // ── Action: CHANGE STATUS ─────────────────────────────────────────────────
  if (body.status) {
    const { status, lat, lng } = body

    const allowed: Record<string, string[]> = {
      CHOFER:    ['EN_TRANSITO'],
      RECEPCION: [],
      ADMIN:     ['EN_RETIRO', 'EN_TRANSITO', 'RECIBIDA', 'DISCREPANCIA', 'CERRADA'],
    }

    if (!allowed[session.user.role]?.includes(status)) {
      return apiError(`No puedes cambiar la orden a ${status}`, 403)
    }

    const updated = await prisma.pickupOrder.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === 'EN_TRANSITO' ? { pickupAt: new Date() } : {}),
        ...(lat ? { pickupLat: lat }  : {}),
        ...(lng ? { pickupLng: lng } : {}),
      },
    })

    return NextResponse.json(updated)
  }

  return apiError('Acción no reconocida')
}
