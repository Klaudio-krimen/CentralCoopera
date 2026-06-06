import { prisma } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import DiscrepanciaActions from '@/components/ui/DiscrepanciaActions'
import { Warning, ArrowRight, CheckCircle } from '@phosphor-icons/react/dist/ssr'

const SEVERITY_CONFIG = {
  MENOR:    { label: 'Menor',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MODERADA: { label: 'Moderada', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  GRAVE:    { label: 'Grave',    className: 'bg-red-50 text-red-700 border-red-200' },
}

const STATUS_D_CONFIG = {
  PENDIENTE:       { label: 'Pendiente',        className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  EN_INVESTIGACION:{ label: 'En investigación', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  RESUELTA:        { label: 'Resuelta',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

async function getDiscrepancias() {
  return prisma.discrepancy.findMany({
    include: {
      order: {
        include: {
          company: { select: { name: true } },
          driver:  { select: { name: true } },
        },
      },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}

export default async function DiscrepanciasPage() {
  const discrepancias = await getDiscrepancias()

  const pending   = discrepancias.filter((d) => d.status === 'PENDIENTE')
  const inProcess = discrepancias.filter((d) => d.status === 'EN_INVESTIGACION')
  const resolved  = discrepancias.filter((d) => d.status === 'RESUELTA')

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Discrepancias</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {pending.length} pendiente{pending.length !== 1 ? 's' : ''} de resolución
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <Section title="Pendientes" count={pending.length} accent="text-red-600">
          {pending.map((d) => <DiscrepanciaCard key={d.id} d={d as any} />)}
        </Section>
      )}

      {/* In investigation */}
      {inProcess.length > 0 && (
        <Section title="En investigación" count={inProcess.length} accent="text-blue-600">
          {inProcess.map((d) => <DiscrepanciaCard key={d.id} d={d as any} />)}
        </Section>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <Section title="Resueltas" count={resolved.length} accent="text-emerald-600" collapsed>
          {resolved.map((d) => <DiscrepanciaCard key={d.id} d={d as any} />)}
        </Section>
      )}

      {discrepancias.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl">
          <CheckCircle size={36} weight="fill" className="text-emerald-400 mx-auto mb-3" />
          <p className="text-zinc-600 font-medium">Sin discrepancias</p>
          <p className="text-zinc-400 text-sm mt-1">Todas las órdenes están dentro de tolerancia</p>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  accent,
  children,
  collapsed = false,
}: {
  title: string
  count: number
  accent: string
  children: React.ReactNode
  collapsed?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${accent} bg-current/10`}>
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DiscrepanciaCard({ d }: { d: any }) {
  const sev = SEVERITY_CONFIG[d.severity as keyof typeof SEVERITY_CONFIG]
  const dst = STATUS_D_CONFIG[d.status as keyof typeof STATUS_D_CONFIG]

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sev?.className}`}>
              {sev?.label ?? d.severity}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${dst?.className}`}>
              {dst?.label ?? d.status}
            </span>
          </div>

          {/* Order info */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900">{d.order.company.name}</p>
              <p className="text-xs font-mono text-zinc-400">{d.order.orderCode}</p>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Chofer: <span className="font-medium text-zinc-700">{d.order.driver?.name}</span>
              {' · '}{formatDate(d.createdAt)}
            </p>
          </div>

          {/* Discrepancy detail */}
          <div className="bg-zinc-50 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-500">
              <span className="font-medium text-zinc-700 capitalize">{d.materialType}</span>
              {' — '}Declarado:{' '}
              <span className="font-mono font-medium text-zinc-900">{d.declaredQuantity} {d.unit}</span>
              {' · '}Recibido:{' '}
              <span className="font-mono font-medium text-zinc-900">{d.receivedQuantity} {d.unit}</span>
            </p>
            <p className="text-xs font-semibold text-red-600">
              Diferencia: {d.differencePercent?.toFixed(1)}%
            </p>
          </div>

          {d.resolutionNote && (
            <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-200 pl-3">
              {d.resolutionNote}
            </p>
          )}
        </div>

        {/* Actions */}
        {d.status !== 'RESUELTA' && (
          <DiscrepanciaActions discrepanciaId={d.id} currentStatus={d.status} orderId={d.orderId} />
        )}
      </div>
    </div>
  )
}
