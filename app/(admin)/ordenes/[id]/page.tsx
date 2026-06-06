import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Buildings,
  Truck,
  Package,
  Camera,
  PenNib,
  MapPin,
  Warning,
  Clock,
} from '@phosphor-icons/react/dist/ssr'

const SEVERITY_STYLE = {
  MENOR:    'bg-amber-50 text-amber-700 border-amber-200',
  MODERADA: 'bg-orange-50 text-orange-700 border-orange-200',
  GRAVE:    'bg-red-50 text-red-700 border-red-200',
}

export default async function AdminOrdenDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.pickupOrder.findUnique({
    where: { id: params.id },
    include: {
      company:   { select: { name: true, address: true, contactName: true, contactPhone: true } },
      driver:    { select: { name: true, email: true } },
      items:     { include: { materialType: { select: { name: true } } } },
      evidences: true,
      discrepancies: {
        include: {
          detectedBy: { select: { name: true } },
          resolvedBy: { select: { name: true } },
        },
      },
    },
  })

  if (!order) notFound()

  const retiroEvidences  = order.evidences.filter((e: any) => e.stage === 'RETIRO')
  const recepEvidences   = order.evidences.filter((e: any) => e.stage === 'RECEPCION')

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/ordenes"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver a órdenes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-zinc-400 mb-0.5">{order.orderCode}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {order.company.name}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <Truck size={13} />
              {order.driver?.name}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </span>
          </div>
        </div>
        <StatusBadge status={order.status as any} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Empresa */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Empresa</p>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                <Buildings size={16} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{order.company.name}</p>
                {order.company.address && (
                  <p className="text-xs text-zinc-400 mt-0.5">{order.company.address}</p>
                )}
                {order.company.contactName && (
                  <p className="text-xs text-zinc-400 mt-0.5">Contacto: {order.company.contactName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-50 bg-zinc-50/60">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Materiales
              </p>
            </div>
            {order.items.length === 0 ? (
              <div className="px-5 py-6 flex items-center gap-2 text-zinc-400 text-sm">
                <Package size={14} />
                Sin ítems registrados
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {order.items.map((item: any) => {
                  const diff =
                    item.receivedQuantity !== null
                      ? Math.abs(item.declaredQuantity - item.receivedQuantity)
                      : null
                  const pct =
                    diff !== null && item.declaredQuantity > 0
                      ? (diff / item.declaredQuantity) * 100
                      : null

                  return (
                    <div key={item.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-800">
                          {item.materialType?.name ?? item.materialName}
                        </p>
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold text-zinc-900">
                            {item.declaredQuantity} {item.unit}
                          </p>
                          {item.receivedQuantity !== null && (
                            <p className={`text-xs font-mono ${pct && pct > 2 ? 'text-red-500' : 'text-emerald-600'}`}>
                              Recibido: {item.receivedQuantity} {item.unit}
                              {pct !== null && ` (${pct.toFixed(1)}%)`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Geolocation */}
          {order.pickupLat && order.pickupLng && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <MapPin size={13} />
              GPS retiro: {Number(order.pickupLat).toFixed(5)}, {Number(order.pickupLng).toFixed(5)}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Evidences — pickup */}
          {retiroEvidences.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={13} />
                Fotos de retiro ({retiroEvidences.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {retiroEvidences.map((ev: any) => (
                  <div key={ev.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100">
                    <Image src={ev.imagePath} alt="Evidencia retiro" fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidences — reception */}
          {recepEvidences.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={13} />
                Fotos de recepción ({recepEvidences.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {recepEvidences.map((ev: any) => (
                  <div key={ev.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100">
                    <Image src={ev.imagePath} alt="Evidencia recepción" fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature */}
          {order.signatureImagePath && (
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <PenNib size={13} />
                Firma del cliente
              </p>
              <div className="relative h-28 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100">
                <Image
                  src={order.signatureImagePath}
                  alt="Firma"
                  fill
                  className="object-contain"
                  sizes="400px"
                />
              </div>
              <p className="text-xs text-zinc-600 font-medium">{order.clientSignerName}</p>
            </div>
          )}

          {/* Discrepancies */}
          {order.discrepancies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Warning size={13} />
                Discrepancias ({order.discrepancies.length})
              </p>
              <div className="space-y-2">
                {order.discrepancies.map((d: any) => (
                  <div key={d.id} className="card p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[d.severity as keyof typeof SEVERITY_STYLE]}`}>
                        {d.severity}
                      </span>
                      <span className="text-xs text-zinc-500">{d.status}</span>
                    </div>
                    <p className="text-sm text-zinc-700">{d.description}</p>
                    {d.differencePercent && (
                      <p className="text-xs font-mono text-red-600">
                        Diferencia: {d.differencePercent.toFixed(1)}%
                        {' · '}{d.declaredQuantity} → {d.receivedQuantity} {order.items[0]?.unit}
                      </p>
                    )}
                    {d.resolutionNote && (
                      <p className="text-xs text-zinc-500 border-l-2 border-zinc-200 pl-2 italic">
                        {d.resolutionNote}
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400">
                      Detectada por {d.detectedBy?.name}
                      {d.resolvedBy && ` · Resuelta por ${d.resolvedBy.name}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Observaciones</p>
          <p className="text-sm text-zinc-700">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
