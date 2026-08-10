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
// `delimiter` por defecto es coma, para no cambiar el comportamiento de los
// llamadores existentes (CRM). Inventario lo llama con "\t": la bodega pega
// directo desde una selección de Excel, que llega tabulada, no separada por
// comas.
export function parseCsv(text: string, delimiter: string = ","): string[][] {
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
    } else if (char === delimiter) {
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

/**
 * Detecta si un bloque pegado viene tabulado (copiar/pegar desde Excel) o
 * separado por comas (archivo .csv real). Cuenta tabs vs comas en la primera
 * línea no vacía — quien pega desde Excel nunca escribe comillas ni escapa
 * nada, así que basta con contar.
 */
export function detectarDelimitador(text: string): string {
  const primeraLinea = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const tabs = (primeraLinea.match(/\t/g) ?? []).length;
  const comas = (primeraLinea.match(/,/g) ?? []).length;
  return tabs > comas ? "\t" : ",";
}
