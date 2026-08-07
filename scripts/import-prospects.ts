/**
 * Importador de prospectos — Fase 2 de PROSPECCION_OUTREACH.md
 *
 * Lee los CSV crudos de Apify (data/prospects/raw/) y el CSV de correos
 * enriquecidos de la Fase 1 (data/prospects/candidatas_enriquecidas.csv),
 * normaliza, deduplica (placeId → dominio → nombre+comuna) y crea/actualiza
 * Company + Contact en la base de datos.
 *
 * Idempotente: correrlo dos veces con los mismos CSV no crea duplicados —
 * busca la empresa existente por la misma clave de dedupe antes de crear, y
 * el contacto por companyId+email (o companyId+phone si no hay email).
 *
 * Uso:
 *   npm run import:prospects
 *
 * Requiere DATABASE_URL/DIRECT_URL en .env.local (ver VARIABLES_ENTORNO.md).
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient, ProspectSegment } from "@prisma/client";
import {
  parseCsv,
  normalizeLogisticaRow,
  normalizeFarmaceuticaRow,
  mergeEnrichedEmail,
  dedupeKey,
  isPhoneOnly,
  clean,
  type NormalizedProspect,
} from "../lib/outreach/prospects";

const RAW_DIR = path.resolve(__dirname, "../data/prospects/raw");
const LOGISTICA_CSV = path.join(RAW_DIR, "logistica_2026-07-28.csv");
const FARMACEUTICA_CSV = path.join(RAW_DIR, "farmaceutica_norte_santiago.csv");
const ENRICHED_CSV = path.resolve(
  __dirname,
  "../data/prospects/candidatas_enriquecidas.csv"
);

// ── .env.local: los scripts ts-node no lo cargan solos (a diferencia de Next) ──
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function readCsv(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${filePath}`);
  }
  return parseCsv(fs.readFileSync(filePath, "utf-8"));
}

// El CSV de salida de enrich-emails.ts trae emails_encontrados separados por
// ";" — se indexan por dominio, igual que en ese script.
function buildEnrichedIndex(
  rows: Record<string, string>[]
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const row of rows) {
    const dominio = clean(row.dominio);
    const emailsRaw = clean(row.emails_encontrados);
    if (!dominio || !emailsRaw) continue;
    index.set(
      dominio,
      emailsRaw
        .split(";")
        .map((e) => e.trim())
        .filter(Boolean)
    );
  }
  return index;
}

interface ImportStats {
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsSkippedDuplicate: number;
  phoneOnly: number;
  skippedNoContactInfo: number;
  dedupedWithinBatch: number;
}

async function importProspects(
  prisma: PrismaClient,
  prospects: NormalizedProspect[]
): Promise<ImportStats> {
  const stats: ImportStats = {
    companiesCreated: 0,
    companiesUpdated: 0,
    contactsCreated: 0,
    contactsSkippedDuplicate: 0,
    phoneOnly: 0,
    skippedNoContactInfo: 0,
    dedupedWithinBatch: 0,
  };

  // Dedupe dentro del lote — dos filas del mismo run que apuntan al mismo
  // placeId/dominio/nombre+comuna se colapsan en una sola antes de tocar la BD.
  const seen = new Map<string, NormalizedProspect>();
  for (const p of prospects) {
    const key = dedupeKey(p);
    if (seen.has(key)) {
      stats.dedupedWithinBatch++;
      continue;
    }
    seen.set(key, p);
  }

  for (const prospect of Array.from(seen.values())) {
    const company = await findOrCreateCompany(prisma, prospect, stats);
    await findOrCreateContact(prisma, company.id, prospect, stats);
  }

  return stats;
}

async function findOrCreateCompany(
  prisma: PrismaClient,
  prospect: NormalizedProspect,
  stats: ImportStats
) {
  let existing = null;

  if (prospect.placeId) {
    existing = await prisma.company.findUnique({
      where: { placeId: prospect.placeId },
    });
  }
  if (!existing && prospect.domain) {
    existing = await prisma.company.findFirst({
      where: { website: { contains: prospect.domain, mode: "insensitive" } },
    });
  }
  if (!existing) {
    // OR con commune:null es la parte crítica — una empresa cargada antes
    // por el importador simple del CRM (app/api/contactos/import) solo tiene
    // el nombre, sin comuna. Un `commune: { equals: 'Pudahuel' }` contra una
    // fila con commune=null nunca matchea en Postgres (NULL no es igual a
    // nada), así que exigir la comuna aquí producía un duplicado por cada
    // empresa que ya existía sin ese campo. Bug real, encontrado en
    // producción el 2026-08-05 — ver el script de remediación.
    existing = await prisma.company.findFirst({
      where: {
        name: { equals: prospect.empresa, mode: "insensitive" },
        OR: [
          { commune: null },
          ...(prospect.commune
            ? [
                {
                  commune: {
                    equals: prospect.commune,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      },
    });
  }

  if (existing) {
    // Solo rellena campos que hoy están vacíos — no pisa datos que Ventas ya
    // haya editado a mano en el CRM.
    const fillData: Record<string, unknown> = {};
    if (!existing.website && prospect.website)
      fillData.website = prospect.website;
    if (!existing.commune && prospect.commune)
      fillData.commune = prospect.commune;
    if (!existing.category && prospect.category)
      fillData.category = prospect.category;
    if (!existing.segment)
      fillData.segment = prospect.segment as ProspectSegment;
    if (!existing.placeId && prospect.placeId)
      fillData.placeId = prospect.placeId;
    if (existing.lat === null && prospect.lat !== null)
      fillData.lat = prospect.lat;
    if (existing.lng === null && prospect.lng !== null)
      fillData.lng = prospect.lng;
    if (existing.rating === null && prospect.rating !== null)
      fillData.rating = prospect.rating;
    if (existing.reviews === null && prospect.reviews !== null)
      fillData.reviews = prospect.reviews;
    if (!existing.address && prospect.address)
      fillData.address = prospect.address;

    if (Object.keys(fillData).length > 0) {
      existing = await prisma.company.update({
        where: { id: existing.id },
        data: fillData,
      });
      stats.companiesUpdated++;
    }
    return existing;
  }

  const created = await prisma.company.create({
    data: {
      name: prospect.empresa,
      address: prospect.address,
      website: prospect.website,
      commune: prospect.commune,
      category: prospect.category,
      segment: prospect.segment as ProspectSegment,
      placeId: prospect.placeId,
      lat: prospect.lat,
      lng: prospect.lng,
      rating: prospect.rating,
      reviews: prospect.reviews,
    },
  });
  stats.companiesCreated++;
  return created;
}

async function findOrCreateContact(
  prisma: PrismaClient,
  companyId: string,
  prospect: NormalizedProspect,
  stats: ImportStats
) {
  if (isPhoneOnly(prospect)) stats.phoneOnly++;

  if (!prospect.email && !prospect.phone) {
    stats.skippedNoContactInfo++;
    return;
  }

  // Busca por email O por teléfono, nunca uno excluyendo al otro — un
  // contacto ya existente con el mismo teléfono pero sin correo (típico de
  // una carga manual previa) es el mismo contacto real que uno nuevo que sí
  // trae correo. Buscar solo por email dejaba pasar ese caso y creaba un
  // duplicado (bug real, encontrado en producción el 2026-08-05 — ver el
  // script de remediación de esa fecha).
  const existing = await prisma.contact.findFirst({
    where: {
      companyId,
      OR: [
        ...(prospect.email
          ? [
              {
                email: { equals: prospect.email, mode: "insensitive" as const },
              },
            ]
          : []),
        ...(prospect.phone ? [{ phone: prospect.phone }] : []),
      ],
    },
  });

  if (existing) {
    stats.contactsSkippedDuplicate++;
    const fillData: Record<string, unknown> = {};
    if (!existing.email && prospect.email) fillData.email = prospect.email;
    if (!existing.phone && prospect.phone) fillData.phone = prospect.phone;
    if (!existing.notes && prospect.qualificationSignal) {
      fillData.notes = `Señal de calificación: ${prospect.qualificationSignal}`;
    }
    if (Object.keys(fillData).length > 0) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: fillData,
      });
    }
    return;
  }

  const notes = prospect.qualificationSignal
    ? `Señal de calificación: ${prospect.qualificationSignal}`
    : isPhoneOnly(prospect)
      ? "Solo teléfono — sin sitio ni correo. Lista de llamadas para Ventas, no apto para outreach por correo."
      : null;

  await prisma.contact.create({
    data: {
      companyId,
      name: prospect.contactName ?? prospect.empresa,
      role: prospect.contactRole,
      email: prospect.email,
      phone: prospect.phone,
      notes,
      source: "SCRAPING",
      temperature: "FRIO",
    },
  });
  stats.contactsCreated++;
}

async function main() {
  loadEnvLocal();

  const logisticaRows = readCsv(LOGISTICA_CSV);
  const farmaceuticaRows = readCsv(FARMACEUTICA_CSV);
  const enrichedRows = fs.existsSync(ENRICHED_CSV) ? readCsv(ENRICHED_CSV) : [];
  const enrichedByDomain = buildEnrichedIndex(enrichedRows);

  const prospects: NormalizedProspect[] = [
    ...logisticaRows.map(normalizeLogisticaRow),
    ...farmaceuticaRows.map(normalizeFarmaceuticaRow),
  ]
    .filter((p): p is NormalizedProspect => p !== null)
    .map((p) => mergeEnrichedEmail(p, enrichedByDomain));

  console.log(
    `Filas leídas: ${logisticaRows.length} logística + ${farmaceuticaRows.length} farmacéutica = ${prospects.length}`
  );

  const prisma = new PrismaClient();
  try {
    const stats = await importProspects(prisma, prospects);
    console.log("");
    console.log("Resultado de la importación:");
    console.log(`  Empresas creadas:      ${stats.companiesCreated}`);
    console.log(`  Empresas actualizadas: ${stats.companiesUpdated}`);
    console.log(`  Contactos creados:     ${stats.contactsCreated}`);
    console.log(
      `  Contactos duplicados (omitidos): ${stats.contactsSkippedDuplicate}`
    );
    console.log(
      `  Solo teléfono (lista de llamadas Ventas): ${stats.phoneOnly}`
    );
    console.log(
      `  Sin ningún dato de contacto (omitidos): ${stats.skippedNoContactInfo}`
    );
    console.log(
      `  Duplicados dentro del mismo lote: ${stats.dedupedWithinBatch}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
