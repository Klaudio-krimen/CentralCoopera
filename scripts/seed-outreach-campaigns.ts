/**
 * Crea (idempotente) las dos OutreachCampaign de la Fase 3 — una por
 * segmento, mismo PDF adjunto para ambas (decisión confirmada en
 * PROSPECCION_OUTREACH.md §13.1).
 *
 * Quedan con isActive=false a propósito: el cron de /api/cron/outreach
 * ignora toda campaña inactiva, así que correr este script no dispara
 * ningún envío. Activarlas es una decisión aparte, deliberada, que se toma
 * recién cuando el dominio de envío tenga SPF/DKIM/DMARC verificados
 * (§13.2) — hasta entonces el motor debe existir pero permanecer apagado.
 *
 * Uso:
 *   npm run seed:outreach-campaigns
 *
 * Requiere DATABASE_URL/DIRECT_URL reales (ver VARIABLES_ENTORNO.md).
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const CAMPAIGNS = [
  {
    name: "Outreach frío — Logística",
    segment: "LOGISTICA" as const,
    subject:
      "Pallets dañados en su bodega — se los retiramos y le dejamos reparados",
    templateKey: "logistica-v1",
  },
  {
    name: "Outreach frío — Farmacéutica",
    segment: "FARMACEUTICA" as const,
    subject: "Retiro de pallets con cadena de custodia documentada",
    templateKey: "farmaceutica-v1",
  },
];

async function main() {
  loadEnvLocal();
  const pdfBlobUrl = process.env.OUTREACH_PDF_BLOB_URL || null;
  if (!pdfBlobUrl) {
    console.warn(
      "OUTREACH_PDF_BLOB_URL no está configurado — las campañas quedan sin PDF adjunto hasta que se suba el archivo a Vercel Blob."
    );
  }

  const prisma = new PrismaClient();
  try {
    for (const c of CAMPAIGNS) {
      const existing = await prisma.outreachCampaign.findFirst({
        where: { templateKey: c.templateKey },
      });
      if (existing) {
        console.log(`Ya existe: ${c.name} (${existing.id}) — sin cambios.`);
        continue;
      }
      const created = await prisma.outreachCampaign.create({
        data: { ...c, pdfBlobUrl, isActive: false },
      });
      console.log(`Creada: ${created.name} (${created.id}) — isActive: false`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
