/**
 * Lógica pura de parseo y normalización del "Radar de Clientes Pallets V7"
 * (IMPORTACION_RADAR_PALLETS.md). Sin `fs`, sin Prisma, sin `process.env`:
 * recibe todo por parámetro para poder testear con Vitest sin base de datos.
 *
 * Único consumidor fuera de los tests: `scripts/import-radar-pallets.ts` (E1-T5),
 * que también usa `consolidateRows` / `toRadarProspect` (se agregan en E1-T4 a
 * este mismo archivo).
 *
 * Imports RELATIVOS a `./prospects` — nunca el alias `@/`: Vitest no resuelve los
 * `paths` de tsconfig y sólo recoge los `.test.ts` bajo `lib/` (CLAUDE.md §10
 * regla 1). `clean()` y `parseCsv()` se reutilizan, no se reimplementan.
 */
import { clean, parseCsv } from "./prospects";

// ── Hojas del Radar y su prioridad de desempate ──────────────────────────────
// El número es la prioridad para `consolidateRows` (E1-T4): menor gana.
// "Prospectos verificados" (0) gana a "TOP 20 ataque comercial" (1) gana a
// "TOP 25 empresas abordables" (2). (blueprint §9 Step 3.)
export const RADAR_SHEETS = { PROSPECTOS: 0, TOP20: 1, TOP25: 2 } as const;

/**
 * Una fila cruda de cualquiera de las 3 hojas del Radar, ya parseada y
 * normalizada por `parseRadarSheet`.
 *
 * Contrato CONGELADO por blueprint §9 Step 3: estos 9 miembros, con estos
 * nombres y estos tipos. `consolidateRows` y `toRadarProspect` (E1-T4) y el
 * importador (E1-T5, `import type { RadarRow }`) dependen de la forma exacta —
 * renombrar u omitir un campo obliga a reescribir este archivo más adelante.
 */
export interface RadarRow {
  /**
   * Columna CSV "Nombre" (vía HEADER_MAP) tras `clean()`. ÚNICO campo no-null:
   * `parseRadarSheet` descarta toda fila cuyo nombre quede null/"" tras `clean()`
   * (blueprint §9 Step 3; acceptance E1-T3 #5). `consolidateRows` agrupa por
   * `normalizeCompanyName(row.empresa)`.
   */
  empresa: string;
  /**
   * Columna CSV "Teléfono" pasada por `splitPhones()`. Nunca null: `[]` si la
   * celda viene vacía o "sin dato". En E1-T4: `telefonos[0] ?? null` (phone),
   * `telefonos.slice(1)` (phonesExtra), `.length > 0` (conteo de completitud).
   */
  telefonos: string[];
  /** Columna CSV "Correo" tras `clean()`. "sin dato" / celda vacía → null. */
  email: string | null;
  /**
   * Columna CSV "Tipo" tras `clean()`. En E1-T4 es 1ª entrada de
   * `classifySegment` y va a `RadarProspect.category`. Preservar el null:
   * `consolidateRows` cuenta `campo != null`.
   */
  tipo: string | null;
  /** Columna CSV "Perfil operacional" tras `clean()`. 2ª entrada de classifySegment (E1-T4). */
  perfilOperacional: string | null;
  /** Columna CSV "Evidencia operacional" tras `clean()`. 3ª entrada de classifySegment (E1-T4). */
  evidenciaOperacional: string | null;
  /** Columna CSV "Próximo paso" tras `clean()`. Nota de investigación, no historial de contacto (spec §3). */
  proximoPaso: string | null;
  /** Columna CSV "Observación" tras `clean()`. Nota de investigación; se ignora aunque sugiera contacto previo (spec §8). */
  observacion: string | null;
  /**
   * El `sheetTag` recibido por `parseRadarSheet`, estampado en CADA fila.
   * Lo usa `consolidateRows` (E1-T4) para desempatar: `RADAR_SHEETS[sheetTag]`,
   * menor gana.
   */
  sheetTag: keyof typeof RADAR_SHEETS;
}

// ── Mapa de columnas del CSV a claves de RadarRow ────────────────────────────
// Rótulos humanos canónicos de las 3 hojas del Radar (blueprint §9 Step 3,
// basado en spec §3/§4). `parseRadarSheet` empareja normalizando ambos lados
// (`normalizeHeader`), así que también entran "telefono", "correo", "PRÓXIMO
// PASO", etc. El usuario ajusta este objeto si su export usa otros nombres —
// se documenta en el `.spec.md` del importador (E1-T5).
export const HEADER_MAP: Record<string, Exclude<keyof RadarRow, "sheetTag">> = {
  Nombre: "empresa",
  Teléfono: "telefonos",
  Correo: "email",
  Tipo: "tipo",
  "Perfil operacional": "perfilOperacional",
  "Evidencia operacional": "evidenciaOperacional",
  "Próximo paso": "proximoPaso",
  Observación: "observacion",
};

// ── Helpers de normalización de texto ────────────────────────────────────────

/**
 * Quita los diacríticos (`á é í ó ú ü`, acentos combinantes) PERO conserva la
 * `ñ`: en español es una letra, no una `n` acentuada. El algoritmo del
 * blueprint (`normalize("NFD")` + strip del rango U+0300–U+036F) descompondría
 * la `ñ` en `n` + tilde combinante y la perdería; la acceptance E1-T3 #1
 * (`"Transportes Peñaflor Ltda." → "transportes peñaflor"`) exige conservarla,
 * y la acceptance manda sobre la prosa. Recomponemos `n`+tilde a `ñ` antes de
 * barrer el resto de marcas.
 */
function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/ñ/g, "ñ").replace(/[̀-ͯ]/g, "");
}

/** Normaliza un rótulo de columna para el emparejamiento tolerante de headers. */
function normalizeHeader(header: string): string {
  return stripDiacritics(header.toLowerCase()).replace(/\s+/g, " ").trim();
}

// Índice: rótulo normalizado ("telefono", "proximo paso", …) → clave de RadarRow.
const HEADER_INDEX: Record<
  string,
  Exclude<keyof RadarRow, "sheetTag">
> = Object.fromEntries(
  Object.entries(HEADER_MAP).map(
    ([label, key]) =>
      [normalizeHeader(label), key] as [
        string,
        Exclude<keyof RadarRow, "sheetTag">,
      ]
  )
);

// ── splitPhones ─────────────────────────────────────────────────────────────
// Delimitadores (blueprint §9 Step 3): "/", ";", ",", salto de línea y el
// literal " y " (tolerante a cualquier espacio alrededor de una "y" suelta).
const PHONE_SPLIT = /\s+y\s+|[/;,\n]/;

/**
 * Separa una celda con uno o varios teléfonos en un array. A cada trozo:
 * `clean()` (mismo set de placeholders que el resto del pipeline) + trim;
 * se descartan los vacíos. `null` → `[]`. NO deduplica: los números repetidos
 * se conservan (ninguna fuente pide dedup).
 */
export function splitPhones(raw: string | null): string[] {
  if (raw === null) return [];
  return raw
    .split(PHONE_SPLIT)
    .map((chunk) => clean(chunk))
    .filter((chunk): chunk is string => chunk !== null);
}

// ── normalizeCompanyName ────────────────────────────────────────────────────
// Lista CERRADA de sufijos societarios, VERBATIM del blueprint §9 Step 3
// (12 entradas). No es heurística (CLAUDE.md §10 regla 3).
const COMPANY_SUFFIXES = [
  "s.a",
  "s.a.",
  "sa",
  "spa",
  "s.p.a",
  "ltda",
  "ltda.",
  "limitada",
  "sac",
  "s.a.c",
  "eirl",
  "e.i.r.l",
] as const;

// La regla compara "el último token en minúscula sin puntuación"; al quitar los
// puntos de ambos lados el conjunto efectivo es { sa, spa, ltda, limitada, sac,
// eirl }. Las 12 entradas literales se conservan arriba por trazabilidad con la
// spec.
const SUFFIXES_SIN_PUNTUACION = new Set(
  COMPANY_SUFFIXES.map((s) => s.replace(/\./g, ""))
);

/**
 * Clave de comparación de nombres de empresa para deduplicar el Radar contra el
 * CRM (E1-T5) y agrupar filas (`consolidateRows`, E1-T4). El consumidor compara
 * los resultados por igualdad EXACTA, nunca por substring — así "Novofarma
 * Service" y "Laboratorio Novofarma Service" no se fusionan (blueprint §10,
 * epic Pitfalls).
 *
 * Pasos (blueprint §9 Step 3): minúsculas → sin diacríticos (salvo `ñ`) →
 * colapsar espacios internos → trim → quitar, SÓLO si es el token final y el
 * nombre tiene más de un token, un sufijo de la lista cerrada → trim.
 */
export function normalizeCompanyName(name: string): string {
  const base = stripDiacritics(name.toLowerCase()).replace(/\s+/g, " ").trim();
  const tokens = base.split(" ");
  if (tokens.length > 1) {
    const ultimoSinPuntuacion = tokens[tokens.length - 1].replace(/\./g, "");
    if (SUFFIXES_SIN_PUNTUACION.has(ultimoSinPuntuacion)) {
      tokens.pop();
    }
  }
  return tokens.join(" ").trim();
}

// ── parseRadarSheet ────────────────────────────────────────────────────────
/**
 * Parsea el texto de UNA hoja del Radar (exportada a CSV) a `RadarRow[]`.
 * Usa `parseCsv` de `./prospects` (BOM + RFC4180 básico), traduce las columnas
 * vía `HEADER_MAP` con emparejamiento tolerante (sin tilde / minúscula),
 * aplica `clean()` a cada valor ("sin dato" → null), `splitPhones()` a la celda
 * de teléfono, estampa `sheetTag` en cada fila y descarta las filas sin
 * `empresa` (nombre vacío o placeholder). Si el CSV no trae columna de nombre,
 * el resultado es `[]`.
 */
export function parseRadarSheet(
  csvText: string,
  sheetTag: keyof typeof RADAR_SHEETS
): RadarRow[] {
  const records = parseCsv(csvText);
  if (records.length === 0) return [];

  // clave de RadarRow → nombre real de la columna en este CSV (primera que gane).
  const resolved: Partial<Record<Exclude<keyof RadarRow, "sheetTag">, string>> =
    {};
  for (const header of Object.keys(records[0])) {
    const key = HEADER_INDEX[normalizeHeader(header)];
    if (key !== undefined && resolved[key] === undefined) {
      resolved[key] = header;
    }
  }

  const rows: RadarRow[] = [];
  for (const rec of records) {
    const cell = (key: Exclude<keyof RadarRow, "sheetTag">): string => {
      const header = resolved[key];
      return header === undefined ? "" : (rec[header] ?? "");
    };

    const empresa = clean(cell("empresa"));
    if (empresa === null) continue;

    rows.push({
      empresa,
      telefonos: splitPhones(cell("telefonos")),
      email: clean(cell("email")),
      tipo: clean(cell("tipo")),
      perfilOperacional: clean(cell("perfilOperacional")),
      evidenciaOperacional: clean(cell("evidenciaOperacional")),
      proximoPaso: clean(cell("proximoPaso")),
      observacion: clean(cell("observacion")),
      sheetTag,
    });
  }
  return rows;
}
