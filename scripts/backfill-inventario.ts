/**
 * Backfill de Inventario — acompaña el cambio de modelo "stock simple" a la
 * planilla real de bodega (ver docs/superpowers/specs del cambio, o
 * PATCH /api/inventario/[id] y el schema para el detalle de campos nuevos).
 *
 * Los ítems ya cargados NO se descartan. Este script:
 *   1. Asigna `numero` (correlativo visible de la planilla) 1..N por
 *      createdAt ascendente, sólo a los ítems que todavía no tienen uno.
 *   2. Migra el viejo campo `unit` (string libre, deprecado) a
 *      measureUnit/measureValue cuando se puede interpretar sin ambigüedad
 *      (kg/l/m); cualquier otro valor se preserva como texto en `notes`
 *      ("Unidad original: <valor>") en vez de perderse.
 *
 * Idempotente: correrlo dos veces no reasigna números ya puestos ni duplica
 * la nota de unidad original.
 *
 * Uso:
 *   npx ts-node --project tsconfig.scripts.json scripts/backfill-inventario.ts [--dry-run]
 *
 * Requiere DATABASE_URL/DIRECT_URL en el entorno (ver VARIABLES_ENTORNO.md).
 * Antes de correrlo contra producción: respaldo verificado con
 * `pg_dump "$DIRECT_URL" > backups/pre-inventario-backfill.sql` y confirmar
 * que el archivo no está vacío.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

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

const MEDIDA_POR_UNIDAD: Record<string, "KILOS" | "LITROS" | "METROS"> = {
  kg: "KILOS",
  kilo: "KILOS",
  kilos: "KILOS",
  l: "LITROS",
  lt: "LITROS",
  litro: "LITROS",
  litros: "LITROS",
  m: "METROS",
  metro: "METROS",
  metros: "METROS",
};

async function asignarNumeros(prisma: PrismaClient) {
  const sinNumero = await prisma.inventoryItem.findMany({
    where: { numero: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (sinNumero.length === 0) {
    console.log(
      "numero: todos los ítems ya tienen correlativo asignado, nada que hacer."
    );
    return;
  }

  const ultimo = await prisma.inventoryItem.aggregate({
    _max: { numero: true },
  });
  let siguiente = (ultimo._max.numero ?? 0) + 1;

  console.log(
    `numero: asignando ${sinNumero.length} correlativo(s) a partir de ${siguiente}...`
  );
  for (const item of sinNumero) {
    console.log(`  #${siguiente} → ${item.name}`);
    if (!DRY_RUN) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { numero: siguiente },
      });
    }
    siguiente++;
  }
}

async function migrarUnidad(prisma: PrismaClient) {
  const items = await prisma.inventoryItem.findMany({
    where: { measureUnit: null, unit: { not: null } },
    select: { id: true, name: true, unit: true, notes: true },
  });

  if (items.length === 0) {
    console.log("unit: nada pendiente de migrar.");
    return;
  }

  console.log(`unit: revisando ${items.length} ítem(es) con unidad libre...`);
  let interpretados = 0;
  let preservadosEnNotas = 0;

  for (const item of items) {
    const clave = (item.unit ?? "").trim().toLowerCase();
    const medida = MEDIDA_POR_UNIDAD[clave];

    if (medida) {
      console.log(`  ${item.name}: "${item.unit}" → measureUnit=${medida}`);
      interpretados++;
      if (!DRY_RUN) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { measureUnit: medida },
        });
      }
      continue;
    }

    const yaPreservado = item.notes?.includes("Unidad original:");
    if (yaPreservado) continue; // ya migrado en una corrida anterior

    const notaUnidad = `Unidad original: ${item.unit}`;
    const notesNuevo = item.notes ? `${notaUnidad}. ${item.notes}` : notaUnidad;
    console.log(
      `  ${item.name}: "${item.unit}" no es kg/l/m → preservado en notas`
    );
    preservadosEnNotas++;
    if (!DRY_RUN) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { notes: notesNuevo },
      });
    }
  }

  console.log(
    `unit: ${interpretados} interpretados, ${preservadosEnNotas} preservados en notas.`
  );
}

async function main() {
  loadEnvLocal();
  if (DRY_RUN) console.log("── DRY RUN: no se escribe nada en la base ──\n");

  const prisma = new PrismaClient();
  try {
    const total = await prisma.inventoryItem.count();
    console.log(`InventoryItem: ${total} fila(s) en la base.\n`);
    if (total === 0) {
      console.log("Base vacía, no hay nada que migrar.");
      return;
    }

    await asignarNumeros(prisma);
    console.log("");
    await migrarUnidad(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
