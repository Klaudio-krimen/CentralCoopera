/**
 * Importador del "Radar de Clientes Pallets V7" — épica `01-ingesta-modelo` de
 * `blueprints/importacion-radar-pallets/`. Complementa a
 * `scripts/import-prospects.ts` (Apify): mismo patrón de I/O, misma regla de oro
 * "rellenar campos vacíos, JAMÁS pisar" (CLAUDE.md §10, área rules).
 *
 * Lee las 3 hojas del Radar exportadas a CSV por el usuario
 * (`data/prospects/raw/radar_{prospectos,top20,top25}.csv`), las procesa con la
 * lógica pura de `lib/outreach/radar.ts` (`parseRadarSheet` → `consolidateRows`
 * → `toRadarProspect`) y crea/enriquece `Company` + `Contact` en la base.
 *
 * Idempotente: correrlo dos veces con los mismos CSV no crea un solo duplicado
 * (criterio de calidad, spec §9). La empresa se busca por nombre normalizado
 * (`normalizeCompanyName`, match EXACTO — nunca substring) y el contacto por
 * `companyId` + (`email` OR `phone`), rellenando el existente en vez de crear
 * uno nuevo. No se reintroduce el bug de dedupe por email-only de 2026-08-05.
 *
 * Uso (paso MANUAL post-build — ver `blueprint.md` §12, no es un `verify`):
 *   npm run import:radar -- --dry-run   # no escribe, imprime el plan + stats
 *   npm run import:radar                # escribe
 *
 * Requiere `DATABASE_URL` / `DIRECT_URL` reales en `.env.local` (ver
 * `VARIABLES_ENTORNO.md`). Los scripts `ts-node` no cargan `.env.local` solos
 * — `loadEnvLocal()` lo hace a mano, copiado verbatim de `import-prospects.ts`.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient, ProspectSegment } from "@prisma/client";
import {
  parseRadarSheet,
  consolidateRows,
  toRadarProspect,
  normalizeCompanyName,
  type RadarProspect,
} from "../lib/outreach/radar";

const RAW_DIR = path.resolve(__dirname, "../data/prospects/raw");
const PROSPECTOS_CSV = path.join(RAW_DIR, "radar_prospectos.csv");
const TOP20_CSV = path.join(RAW_DIR, "radar_top20.csv");
const TOP25_CSV = path.join(RAW_DIR, "radar_top25.csv");

const DRY_RUN = process.argv.includes("--dry-run");

// ── .env.local: los scripts ts-node no lo cargan solos (a diferencia de Next) ──
// Copiado verbatim de scripts/import-prospects.ts (blueprint §9 Step 5).
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

function readCsvText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró ${filePath} — exportá las 3 hojas del Radar a CSV UTF-8`
    );
  }
  return fs.readFileSync(filePath, "utf-8");
}

interface ImportStats {
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsEnriched: number;
  phoneOnlyMarked: number;
  skippedNoContactInfo: number;
  dedupedWithinBatch: number;
  bySegment: { LOGISTICA: number; FARMACEUTICA: number; INDUSTRIA: number };
}

function emptyStats(): ImportStats {
  return {
    companiesCreated: 0,
    companiesUpdated: 0,
    contactsCreated: 0,
    contactsEnriched: 0,
    phoneOnlyMarked: 0,
    skippedNoContactInfo: 0,
    dedupedWithinBatch: 0,
    bySegment: { LOGISTICA: 0, FARMACEUTICA: 0, INDUSTRIA: 0 },
  };
}

// Índice de Company por nombre normalizado — se arma UNA sola vez (blueprint §9
// Step 5) con un `findMany` y se mantiene al día con lo que este run crea o
// actualiza, para que la idempotencia funcione incluso dentro de la misma
// corrida.
interface CompanyIndexRow {
  id: string;
  name: string;
  segment: ProspectSegment | null;
  website: string | null;
  commune: string | null;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews: number | null;
}

const COMPANY_INDEX_SELECT = {
  id: true,
  name: true,
  segment: true,
  website: true,
  commune: true,
  category: true,
  address: true,
  lat: true,
  lng: true,
  rating: true,
  reviews: true,
} as const;

async function buildCompanyIndex(
  prisma: PrismaClient
): Promise<Map<string, CompanyIndexRow>> {
  const companies = await prisma.company.findMany({
    select: COMPANY_INDEX_SELECT,
  });
  const index = new Map<string, CompanyIndexRow>();
  for (const c of companies) {
    // Primera que gana: si dos Company distintas normalizan al mismo nombre
    // (dato sucio preexistente), nos quedamos con la primera y el resto se
    // enriquece sobre ella — nunca creamos una tercera.
    const key = normalizeCompanyName(c.name);
    if (!index.has(key)) index.set(key, c);
  }
  return index;
}

const phoneOnly = (p: RadarProspect): boolean => !!p.phone && !p.email;

function buildContactNotes(prospect: RadarProspect): string {
  // Orden fijo (blueprint §9 Step 5): origen, teléfonos extra, y las 4 notas de
  // investigación que no sean null. "Próximo paso" / "Observación" son notas de
  // research, NO historial de contacto (spec §3/§8) — van como texto libre y no
  // mueven ningún estado.
  const lineas: string[] = ["Origen: Radar de Clientes Pallets V7"];
  if (prospect.phonesExtra.length > 0) {
    lineas.push(`Teléfonos adicionales: ${prospect.phonesExtra.join(", ")}`);
  }
  const { perfil, evidencia, proximoPaso, observacion } = prospect.notesParts;
  if (perfil !== null) lineas.push(`Perfil operacional: ${perfil}`);
  if (evidencia !== null) lineas.push(`Evidencia operacional: ${evidencia}`);
  if (proximoPaso !== null) lineas.push(`Próximo paso: ${proximoPaso}`);
  if (observacion !== null) lineas.push(`Observación: ${observacion}`);
  return lineas.join("\n");
}

// ── Company: enriquecer si existe, crear si no. JAMÁS pisa un campo con valor ──
async function findOrCreateCompany(
  prisma: PrismaClient,
  prospect: RadarProspect,
  index: Map<string, CompanyIndexRow>,
  stats: ImportStats
): Promise<{ id: string; isNew: boolean }> {
  const key = normalizeCompanyName(prospect.empresa);
  const existing = index.get(key);

  if (existing) {
    // El Radar sólo aporta rubro (`Tipo` → `category`) y el segmento derivado;
    // no trae web / comuna / dirección / geo (spec §3). Sólo esos dos campos
    // pueden rellenarse, y sólo si hoy están vacíos.
    const fillData: Record<string, unknown> = {};
    if (!existing.category && prospect.category)
      fillData.category = prospect.category;
    if (!existing.segment)
      fillData.segment = prospect.segment as ProspectSegment;

    if (Object.keys(fillData).length > 0) {
      if (!DRY_RUN) {
        await prisma.company.update({
          where: { id: existing.id },
          data: fillData,
        });
      }
      index.set(key, {
        ...existing,
        category:
          (fillData.category as string | undefined) ?? existing.category,
        segment:
          (fillData.segment as ProspectSegment | undefined) ?? existing.segment,
      });
      stats.companiesUpdated++;
    }
    return { id: existing.id, isNew: false };
  }

  stats.companiesCreated++;

  if (DRY_RUN) {
    const fakeId = `dry-run:${key}`;
    index.set(key, {
      id: fakeId,
      name: prospect.empresa,
      segment: prospect.segment as ProspectSegment,
      website: null,
      commune: null,
      category: prospect.category,
      address: null,
      lat: null,
      lng: null,
      rating: null,
      reviews: null,
    });
    return { id: fakeId, isNew: true };
  }

  const created = await prisma.company.create({
    data: {
      name: prospect.empresa,
      category: prospect.category,
      segment: prospect.segment as ProspectSegment,
    },
    select: COMPANY_INDEX_SELECT,
  });
  index.set(key, created);
  return { id: created.id, isNew: true };
}

// ── Contact: match por companyId + (email OR phone). Rellena, no pisa ─────────
async function findOrCreateContact(
  prisma: PrismaClient,
  company: { id: string; isNew: boolean },
  prospect: RadarProspect,
  stats: ImportStats
): Promise<void> {
  if (!prospect.phone && !prospect.email) {
    // spec §7.1 / §8: fila sin ningún dato de contacto se descarta y se reporta.
    stats.skippedNoContactInfo++;
    return;
  }

  // Buscar por email O por teléfono, nunca uno excluyendo al otro (bug de
  // 2026-08-05: buscar sólo por email duplicaba contactos ya cargados a mano
  // con teléfono y sin correo). Empresa recién creada → no hay contactos aún.
  const existing = company.isNew
    ? null
    : await prisma.contact.findFirst({
        where: {
          companyId: company.id,
          OR: [
            ...(prospect.email
              ? [
                  {
                    email: {
                      equals: prospect.email,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            ...(prospect.phone ? [{ phone: prospect.phone }] : []),
          ],
        },
      });

  if (existing) {
    const fillData: Record<string, unknown> = {};
    if (!existing.email && prospect.email) fillData.email = prospect.email;
    if (!existing.phone && prospect.phone) fillData.phone = prospect.phone;
    if (!existing.notes) fillData.notes = buildContactNotes(prospect);
    // `callStatus` → POR_LLAMAR sólo si Ventas no lo movió (hoy null) y el
    // contacto es teléfono-sin-correo (área rules; spec §8).
    const marcaLlamar = existing.callStatus === null && phoneOnly(prospect);
    if (marcaLlamar) fillData.callStatus = "POR_LLAMAR";

    if (Object.keys(fillData).length > 0) {
      if (!DRY_RUN) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: fillData,
        });
      }
      stats.contactsEnriched++;
    }
    if (marcaLlamar) stats.phoneOnlyMarked++;
    return;
  }

  // Correo entrante que no matchea ningún contacto de una empresa que YA tiene
  // contactos → se crea uno nuevo, no se pisa el existente (spec §5).
  if (!DRY_RUN) {
    await prisma.contact.create({
      data: {
        companyId: company.id,
        name: prospect.contactName ?? prospect.empresa,
        email: prospect.email,
        phone: prospect.phone,
        notes: buildContactNotes(prospect),
        source: "IMPORT",
        temperature: "FRIO",
        callStatus: phoneOnly(prospect) ? "POR_LLAMAR" : null,
      },
    });
  }
  stats.contactsCreated++;
  if (phoneOnly(prospect)) stats.phoneOnlyMarked++;
}

async function main() {
  loadEnvLocal();

  const rows = [
    ...parseRadarSheet(readCsvText(PROSPECTOS_CSV), "PROSPECTOS"),
    ...parseRadarSheet(readCsvText(TOP20_CSV), "TOP20"),
    ...parseRadarSheet(readCsvText(TOP25_CSV), "TOP25"),
  ];
  const consolidated = consolidateRows(rows);
  const prospects = consolidated.map(toRadarProspect);

  const stats = emptyStats();
  stats.dedupedWithinBatch = rows.length - consolidated.length;

  console.log(
    `Filas del Radar: ${rows.length} (${consolidated.length} empresas tras consolidar las 3 hojas)`
  );
  if (DRY_RUN) console.log("DRY-RUN — no se escribe nada en la base.\n");

  const prisma = new PrismaClient();
  try {
    const index = await buildCompanyIndex(prisma);
    for (const prospect of prospects) {
      stats.bySegment[prospect.segment]++;
      const company = await findOrCreateCompany(prisma, prospect, index, stats);
      await findOrCreateContact(prisma, company, prospect, stats);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("");
  console.log(
    DRY_RUN ? "Plan de importación (dry-run):" : "Resultado de la importación:"
  );
  console.log(`  Empresas creadas:        ${stats.companiesCreated}`);
  console.log(`  Empresas enriquecidas:   ${stats.companiesUpdated}`);
  console.log(`  Contactos creados:       ${stats.contactsCreated}`);
  console.log(`  Contactos enriquecidos:  ${stats.contactsEnriched}`);
  console.log(
    `  Marcados POR_LLAMAR (teléfono sin correo): ${stats.phoneOnlyMarked}`
  );
  console.log(
    `  Filas sin dato de contacto (descartadas): ${stats.skippedNoContactInfo}`
  );
  console.log(
    `  Duplicados dentro del lote (consolidados): ${stats.dedupedWithinBatch}`
  );
  console.log(
    `  Por segmento:  LOGISTICA ${stats.bySegment.LOGISTICA}  ·  FARMACEUTICA ${stats.bySegment.FARMACEUTICA}  ·  INDUSTRIA ${stats.bySegment.INDUSTRIA}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
