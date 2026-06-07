import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Buildings,
  Package,
  Camera,
  PenNib,
  MapPin,
  CheckCircle,
} from '@phosphor-icons/react/dist/ssr'

export default async function OrdenDetailPage({ params, searchParams }: {
  params: { id: string }
  searchParams: { success?: string }
}) {
  const session = await getServerSession(authOptions)

  const order = await prisma.pickupOrder.findUnique({
    where: { id: params.id },
    include: {
      company:   { select: { name: true, address: true } },
      items:     true,
      evidences: true,
    },
  })

  if (!order) notFound()

  // Choferes solo pueden ver sus propias órdenes
  if (session!.user.role === 'CHOFER' && order.driverId !== session!.user.id) notFound()

  const isSuccess = searchParams.success === '1'

  return (
    <div className="pt-4 pb-8 space-y-5">
      {/* Back */}
      <Link
        href="/chofer/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver
      </Link>

      {/* Success banner */}
      {isSuccess && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Retiro confirmado</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Orden en tránsito hacia bodega
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-400">{order.orderCode}</p>
          <h1 className="text-lg font-semibold text-zinc-900 mt-0.5">{order.company.name}</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status as any} />
      </div>

      {/* Empresa */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Empresa</p>
        <div className="flex items-start gap-3">
          <Buildings size={16} className="text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-900">{order.company.name}</p>
            {order.company.address && (
              <p className="text-xs text-zinc-400 mt-0.5">{order.company.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Materials */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Materiales declarados</p>
        {order.items.length === 0 ? (
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <Package size={14} />
            Sin materiales
          </p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <p className="text-sm text-zinc-700 capitalize">{item.materialType}</p>
                <p className="text-sm font-semibold text-zinc-900 font-mono">
                  {item.declaredQuantity} {item.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      {order.evidences.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Fotos ({order.evidences.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {order.evidences.map((ev: any) => (
              <div key={ev.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100">
                <Image src={ev.imagePath} alt="Evidencia" fill className="object-cover" sizes="120px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature */}
      {order.signatureImagePath && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Firma del cliente</p>
          <div className="relative h-28 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100">
            <Image src={order.signatureImagePath} alt="Firma" fill className="object-contain" sizes="400px" />
          </div>
          <div className="flex items-center gap-2">
            <PenNib size={14} className="text-zinc-400" />
            <p className="text-sm text-zinc-700">{order.clientSignerName}</p>
          </div>
        </div>
      )}

      {/* Geolocation */}
      {order.pickupLat && order.pickupLng && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <MapPin size={13} />
          <span>
            GPS: {Number(order.pickupLat).toFixed(5)}, {Number(order.pickupLng).toFixed(5)}
          </span>
        </div>
      )}
    </div>
  )
}
