type OrderStatus = 'EN_RETIRO' | 'EN_TRANSITO' | 'RECIBIDA' | 'DISCREPANCIA' | 'CERRADA' | 'BORRADOR'

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  BORRADOR:      { label: 'Borrador',      className: 'bg-zinc-100 text-zinc-500 border-zinc-200',     dot: 'bg-zinc-400' },
  EN_RETIRO:     { label: 'En retiro',     className: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  EN_TRANSITO:   { label: 'En tránsito',   className: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  RECIBIDA:      { label: 'Recibida',      className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  DISCREPANCIA:  { label: 'Discrepancia',  className: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
  CERRADA:       { label: 'Cerrada',       className: 'bg-zinc-100 text-zinc-500 border-zinc-200',     dot: 'bg-zinc-400' },
}

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.BORRADOR
  const px  = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${px} ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
