'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export interface PipelineChartDatum {
  name: string
  count: number
  color: string
}

export default function PipelineChart({ data }: { data: PipelineChartDatum[] }) {
  const isEmpty = data.every((d) => d.count === 0)

  return (
    <div className="crm-card">
      <p className="text-base font-medium text-crm-foreground mb-4">Pipeline de Ventas</p>
      {isEmpty ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-crm-muted">
          Sin deals para graficar todavía
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
              formatter={(value) => [`${value} deals`, '']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
