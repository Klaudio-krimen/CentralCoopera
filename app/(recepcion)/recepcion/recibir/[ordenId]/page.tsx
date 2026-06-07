import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import RecepcionForm from '@/components/forms/RecepcionForm'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'

export default async function RecibirPage({ params }: { params: { ordenId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.ordenId },
    include: {
      company:   { select: { name: true } },
      driver:    { select: { name: true } },
      items:     true,
      evidences: { take: 3 },
    },
  })

  if (!order) notFound()
  if (order.status !== 'EN_TRANSITO') redirect(`/recepcion/dashboard`)

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/recepcion/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver al panel
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-400 mb-0.5">{order.orderCode}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {order.company.name}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Chofer: <span className="text-zinc-600 font-medium">{order.driver?.name}</span>
            {' · '}Salida: {formatDate(order.updatedAt)} {formatTime(order.updatedAt)}
          </p>
        </div>
        <StatusBadge status="EN_TRANSITO" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: what driver declared */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
            Declarado por chofer
          </h2>

          <div className="card divide-y divide-zinc-50">
            {order.items.map((item: any) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-zinc-700 capitalize">{item.materialType}</p>
                <p className="text-sm font-semibold text-zinc-900 font-mono">
                  {item.declaredQuantity} {item.unit}
                </p>
              </div>
            ))}
          </div>

          {/* Evidences */}
          {order.evidences.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Fotos de retiro</p>
              <div className="flex gap-2">
                {order.evidences.map((ev: any) => (
                  <div key={ev.id} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                    <Image src={ev.imagePath} alt="Evidencia" fill className="object-cover" sizes="80px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature */}
          {order.signatureImagePath && (
            <div className="card p-4 space-y-2">
              <p className="text-xs text-zinc-400">Firma del cliente</p>
              <div className="relative h-20 rounded-xl overflow-hidden bg-zinc-50">
                <Image
                  src={order.signatureImagePath}
                  alt="Firma"
                  fill
                  className="object-contain"
                  sizes="400px"
                />
              </div>
              <p className="text-xs text-zinc-500">{order.clientSignerName}</p>
            </div>
          )}
        </div>

        {/* Right: reception form */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Registrar lo recibido
          </h2>
          <RecepcionForm order={order as any} />
        </div>
      </div>
    </div>
  )
}
