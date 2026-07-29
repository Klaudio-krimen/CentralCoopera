type Temperature = 'FRIO' | 'TIBIO' | 'CALIENTE'

const TEMPERATURE_CONFIG: Record<
  Temperature,
  { label: string; className: string; dot: string }
> = {
  FRIO:     { label: 'Frío',     className: 'bg-crm-temp-frio-bg text-crm-temp-frio border-crm-temp-frio/30',         dot: 'bg-crm-temp-frio' },
  TIBIO:    { label: 'Tibio',    className: 'bg-crm-temp-tibio-bg text-crm-temp-tibio border-crm-temp-tibio/30',       dot: 'bg-crm-temp-tibio' },
  CALIENTE: { label: 'Caliente', className: 'bg-crm-temp-caliente-bg text-crm-temp-caliente border-crm-temp-caliente/30', dot: 'bg-crm-temp-caliente' },
}

export default function TemperatureBadge({
  temperature,
  size = 'md',
}: {
  temperature: Temperature
  size?: 'sm' | 'md'
}) {
  const cfg = TEMPERATURE_CONFIG[temperature] ?? TEMPERATURE_CONFIG.FRIO
  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${px} ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
