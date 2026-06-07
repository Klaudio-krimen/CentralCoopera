import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/reportes?type=discrepancias&from=2026-01-01&to=2026-12-31&format=json|csv
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const { searchParams } = req.nextUrl
  const type     = searchParams.get('type') ?? 'ordenes'
  const from     = searchParams.get('from')
  const to       = searchParams.get('to')
  const driverId = searchParams.get('driverId')
  const companyId= searchParams.get('companyId')
  const format   = searchParams.get('format') ?? 'json'

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to)   dateFilter.lte = new Date(to + 'T23:59:59')

  let data: any[]
  let filename: string
  let csvHeaders: string[]
  let csvRows: (string | number | null)[][]

  if (type === 'discrepancias') {
    data = await prisma.discrepancy.findMany({
      where: {
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        ...(driverId  ? { order: { driverId  } } : {}),
        ...(companyId ? { order: { companyId } } : {}),
      },
      include: {
        order: {
          include: {
            company: { select: { name: true } },
            driver:  { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    filename   = `discrepancias_${new Date().toISOString().slice(0, 10)}.csv`
    csvHeaders = ['Código Orden', 'Empresa', 'Chofer', 'Material', 'Declarado', 'Recibido', 'Diferencia %', 'Severidad', 'Estado', 'Fecha']
    csvRows    = data.map((d) => [
      d.order.orderCode,
      d.order.company.name,
      d.order.driver?.name ?? '',
      d.materialType ?? '',
      d.declaredQuantity ?? '',
      d.receivedQuantity ?? '',
      d.differencePercent ? d.differencePercent.toFixed(2) : '',
      d.severity,
      d.status,
      new Date(d.createdAt).toLocaleDateString('es-CL'),
    ])
  } else if (type === 'choferes') {
    data = await prisma.pickupOrder.groupBy({
      by: ['driverId'],
      where: Object.keys(dateFilter).length ? { createdAt: dateFilter } : {},
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const drivers = await prisma.user.findMany({
      where: { id: { in: data.map((d: any) => d.driverId) } },
      select: { id: true, name: true },
    })
    const driverMap = Object.fromEntries(drivers.map((d) => [d.id, d.name]))

    filename   = `reporte_choferes_${new Date().toISOString().slice(0, 10)}.csv`
    csvHeaders = ['Chofer', 'Total Órdenes']
    csvRows    = data.map((d: any) => [driverMap[d.driverId] ?? d.driverId, d._count.id])
  } else {
    // Default: ordenes
    data = await prisma.pickupOrder.findMany({
      where: {
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        ...(driverId  ? { driverId  } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: { select: { name: true } },
        driver:  { select: { name: true } },
        items:   { select: { materialName: true, declaredQuantity: true, receivedQuantity: true, unit: true } },
        _count:  { select: { discrepancies: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    filename   = `ordenes_${new Date().toISOString().slice(0, 10)}.csv`
    csvHeaders = ['Código', 'Empresa', 'Chofer', 'Estado', 'Materiales', 'Discrepancias', 'Fecha']
    csvRows    = data.map((o: any) => [
      o.orderCode,
      o.company.name,
      o.driver?.name ?? '',
      o.status,
      o.items.map((i: any) => `${i.materialName}: ${i.declaredQuantity}${i.unit}`).join(' | '),
      o._count.discrepancies,
      new Date(o.createdAt).toLocaleDateString('es-CL'),
    ])
  }

  if (format === 'csv') {
    const escape = (v: string | number | null) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const csv = [
      csvHeaders.map(escape).join(','),
      ...csvRows.map((row) => row.map(escape).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ data, total: data.length })
}
