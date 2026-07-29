'use client'

import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface DealRow {
  id: string
  title: string
  value: number
  probability: number
  expectedClose: string | Date | null
  company: { name: string }
  contact: { name: string } | null
  stage: { name: string; color: string }
}

export default function DealsTable({ deals }: { deals: DealRow[] }) {
  const router = useRouter()

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <a href="/api/deals/export" className="crm-btn-outline">
          <Download className="h-3.5 w-3.5" />
          Exportar
        </a>
      </div>

      <div className="rounded-xl border border-crm-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-secondary/50">
              <th className="text-left font-medium text-crm-muted px-3 py-2">Título</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden sm:table-cell">Contacto</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2">Valor</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2">Etapa</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden md:table-cell">Probabilidad</th>
              <th className="text-left font-medium text-crm-muted px-3 py-2 hidden lg:table-cell">Cierre est.</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr
                key={d.id}
                onClick={() => router.push(`/admin/crm/deals/${d.id}`)}
                className="border-b border-crm-border last:border-0 hover:bg-crm-secondary/50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-crm-foreground">{d.title}</p>
                  <p className="text-xs text-crm-muted sm:hidden">{d.company.name}</p>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell text-crm-foreground">
                  {d.contact?.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 font-semibold text-crm-primary font-mono tabular-nums">
                  {formatCurrency(d.value)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium"
                    style={{ borderColor: d.stage.color, color: d.stage.color }}
                  >
                    {d.stage.name}
                  </span>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell text-crm-muted font-mono tabular-nums">
                  {d.probability}%
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-crm-muted text-xs">
                  {d.expectedClose ? formatDate(d.expectedClose) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deals.length === 0 && (
          <p className="text-sm text-crm-muted text-center py-8">Sin deals registrados</p>
        )}
      </div>
    </div>
  )
}
