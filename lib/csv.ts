export interface CsvColumn {
  key: string
  label: string
}

export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => c.label).join(',')
  const body = rows.map((r) =>
    columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return [header, ...body].join('\n')
}
