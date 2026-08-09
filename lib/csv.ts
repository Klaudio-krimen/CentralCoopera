import { escaparCampoCsv } from "./finanzas/csv";

export interface CsvColumn {
  key: string;
  label: string;
}

// Además de las comillas, escaparCampoCsv() antepone una comilla simple a
// cualquier campo que empiece con =, +, - o @ — mitigación estándar de
// inyección de fórmulas en Excel/Sheets. Estos exports los abren personas
// en Excel, no un parser.
export function toCsv(
  rows: Record<string, unknown>[],
  columns: CsvColumn[]
): string {
  const header = columns.map((c) => escaparCampoCsv(c.label)).join(",");
  const body = rows.map((r) =>
    columns.map((c) => escaparCampoCsv(String(r[c.key] ?? ""))).join(",")
  );
  return [header, ...body].join("\n");
}

// Parser CSV mínimo (soporta campos entre comillas con comas/comillas
// escapadas). Devuelve filas de texto crudo, sin mapear a columnas.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}
