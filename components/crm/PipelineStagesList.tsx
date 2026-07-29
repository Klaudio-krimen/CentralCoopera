export interface StageRow {
  id: string
  name: string
  order: number
  color: string
}

export default function PipelineStagesList({ stages }: { stages: StageRow[] }) {
  return (
    <div className="crm-card">
      <p className="text-base font-medium text-crm-foreground mb-4">Etapas del Pipeline</p>
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-crm-secondary/50">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-crm-foreground flex-1">{s.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-crm-border text-crm-muted">
              #{s.order}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
