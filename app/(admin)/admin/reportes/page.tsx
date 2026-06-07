import { prisma } from '@/lib/db'
import ReportesForm from '@/components/ui/ReportesForm'
import { FileText, TrendUp, Warning, Truck } from '@phosphor-icons/react/dist/ssr'

async function getFilterOptions() {
  const [drivers, companies] = await Promise.all([
    prisma.user.findMany({
      where:   { role: 'CHOFER', isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.company.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return { drivers, companies }
}

const REPORT_TYPES = [
  {
    value:       'ordenes',
    label:       'Órdenes',
    description: 'Listado de órdenes con empresa, chofer, materiales y estado.',
    icon:        FileText,
  },
  {
    value:       'discrepancias',
    label:       'Discrepancias',
    description: 'Todas las diferencias detectadas con porcentaje y severidad.',
    icon:        Warning,
  },
  {
    value:       'choferes',
    label:       'Por chofer',
    description: 'Volumen total de retiros agrupado por chofer.',
    icon:        Truck,
  },
]

export default async function ReportesPage() {
  const { drivers, companies } = await getFilterOptions()

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reportes</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Exporta datos a CSV o visualízalos aquí mismo.
        </p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ value, label, description, icon: Icon }) => (
          <div key={value} className="card p-5 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Icon size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{label}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-5">Generar reporte</h2>
        <ReportesForm drivers={drivers} companies={companies} />
      </div>
    </div>
  )
}
