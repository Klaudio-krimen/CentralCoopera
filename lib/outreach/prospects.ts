/**
 * Lógica pura de normalización, parseo y dedupe para la Fase 2 de
 * PROSPECCION_OUTREACH.md — sin I/O ni Prisma, para poder testear con Vitest
 * sin depender de una base de datos real.
 *
 * scripts/import-prospects.ts es el único consumidor de este módulo fuera de
 * los tests.
 */

// ── Placeholders que Apify escribe literalmente cuando no encontró el dato ──
const PLACEHOLDER_VALUES = new Set([
  "sin dato",
  "sindato",
  "n/a",
  "na",
  "-",
  "null",
  "undefined",
]);

export function clean(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

// ── CSV: parser mínimo con soporte de comillas (RFC4180 básico) + BOM ──
export function parseCsv(content: string): Record<string, string>[] {
  const withoutBom =
    content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = withoutBom.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

// El CSV farmacéutico trae el place_id embebido en la URL de Google Maps:
// .../maps/search/?api=1&query=...&query_place_id=ChIJ...
export function extractPlaceId(mapsUrl: string | null): string | null {
  if (!mapsUrl) return null;
  const match = mapsUrl.match(/query_place_id=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export type ProspectSegment = "LOGISTICA" | "FARMACEUTICA";

export interface NormalizedProspect {
  segment: ProspectSegment;
  empresa: string;
  commune: string | null;
  category: string | null;
  address: string | null;
  website: string | null;
  domain: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews: number | null;
  phone: string | null;
  contactName: string | null;
  contactRole: string | null;
  email: string | null;
  qualificationSignal: string | null;
}

function toFloat(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// CSV logística: negocio,contacto,puesto,telefono,correo,sitio_web,instagram,
// linkedin,ciudad,rating,resenas,senal_de_calificacion,fuente,fecha
export function normalizeLogisticaRow(
  row: Record<string, string>
): NormalizedProspect | null {
  const empresa = clean(row.negocio);
  if (!empresa) return null;
  const website = clean(row.sitio_web);
  return {
    segment: "LOGISTICA",
    empresa,
    commune: clean(row.ciudad),
    category: null,
    address: null,
    website,
    domain: domainOf(website),
    placeId: null, // el CSV de logística no trae place_id
    lat: null,
    lng: null,
    rating: toFloat(clean(row.rating)),
    reviews: toInt(clean(row.resenas)),
    phone: clean(row.telefono),
    contactName: clean(row.contacto),
    contactRole: clean(row.puesto),
    email: clean(row.correo),
    qualificationSignal: clean(row.senal_de_calificacion),
  };
}

// CSV farmacéutico: Empresa,comuna_busqueda,categoryName,address,phone,
// website,totalScore,reviewsCount,lat,lng,url
export function normalizeFarmaceuticaRow(
  row: Record<string, string>
): NormalizedProspect | null {
  const empresa = clean(row.Empresa);
  if (!empresa) return null;
  const website = clean(row.website);
  return {
    segment: "FARMACEUTICA",
    empresa,
    commune: clean(row.comuna_busqueda),
    category: clean(row.categoryName),
    address: clean(row.address),
    website,
    domain: domainOf(website),
    placeId: extractPlaceId(clean(row.url)),
    lat: toFloat(clean(row.lat)),
    lng: toFloat(clean(row.lng)),
    rating: toFloat(clean(row.totalScore)),
    reviews: toInt(clean(row.reviewsCount)),
    phone: clean(row.phone),
    contactName: null,
    contactRole: null,
    email: null, // el CSV farmacéutico no trae correo — se llena vía enriquecimiento
    qualificationSignal: null,
  };
}

// Entre varios correos hallados en un mismo dominio (enriquecimiento de Fase
// 1), preferir una casilla genérica sobre una nominativa — menor exposición
// personal y más probable que siga viva si la persona se va de la empresa.
const GENERIC_PREFIXES = [
  "contacto",
  "info",
  "ventas",
  "contact",
  "sac",
  "atencion",
  "hola",
];

export function pickBestEmail(emails: string[]): string | null {
  const valid = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (valid.length === 0) return null;
  for (const prefix of GENERIC_PREFIXES) {
    const match = valid.find(
      (e) => e.startsWith(`${prefix}@`) || e.startsWith(`${prefix}.`)
    );
    if (match) return match;
  }
  return valid[0];
}

// Si el prospecto no trae correo directo, busca en el mapa de enriquecimiento
// por dominio y aplica pickBestEmail. No pisa un correo que ya existía.
export function mergeEnrichedEmail(
  prospect: NormalizedProspect,
  enrichedByDomain: Map<string, string[]>
): NormalizedProspect {
  if (prospect.email || !prospect.domain) return prospect;
  const found = enrichedByDomain.get(prospect.domain);
  if (!found || found.length === 0) return prospect;
  const best = pickBestEmail(found);
  return best ? { ...prospect, email: best } : prospect;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Clave de dedupe con la prioridad de PROSPECCION_OUTREACH.md §2:
// placeId → dominio → nombre+comuna. Es la misma clave tanto para deduplicar
// dentro de un lote como para decidir si un registro ya existe en la BD.
export function dedupeKey(prospect: NormalizedProspect): string {
  if (prospect.placeId) return `placeId:${prospect.placeId}`;
  if (prospect.domain) return `domain:${prospect.domain}`;
  return `name:${slugify(prospect.empresa)}|${slugify(prospect.commune ?? "")}`;
}

// Una empresa "solo teléfono" (sin sitio, sin correo directo ni enriquecido)
// no es candidata a correo frío — es lista de llamadas para Ventas. No se le
// niega el ingreso al CRM, simplemente nunca cumplirá el criterio de
// elegibilidad de outreach (email != null), así que no requiere un flag
// aparte.
export function isPhoneOnly(prospect: NormalizedProspect): boolean {
  return !prospect.email && !prospect.website && !!prospect.phone;
}
