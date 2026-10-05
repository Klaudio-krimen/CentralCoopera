/**
 * Clasifica artículos de protección personal que ya existen en inventario.
 * Por seguridad, sólo escribe con el argumento explícito `--apply`.
 *
 * Uso:
 *   npm run backfill:epp-inventario                 # dry-run por defecto
 *   npm run backfill:epp-inventario -- --apply      # aplica tras db push y respaldo
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { esArticuloEpp } from "../lib/inventario/category";

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY || process.argv.includes("--dry-run");
const argumentosInvalidos = process.argv
  .slice(2)
  .filter((arg) => arg !== "--apply" && arg !== "--dry-run");

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || process.env[match[1]]) continue;

    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function main() {
  if (argumentosInvalidos.length > 0) {
    throw new Error(
      `Argumento no reconocido: ${argumentosInvalidos.join(", ")}`
    );
  }
  if (APPLY && DRY_RUN) {
    throw new Error("Usa --dry-run o --apply, no ambos argumentos a la vez.");
  }

  loadEnvLocal();
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error(
      "Configura DATABASE_URL y DIRECT_URL antes de ejecutar el backfill."
    );
  }

  const prisma = new PrismaClient();
  try {
    const items = await prisma.inventoryItem.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { numero: "asc" },
    });
    const pendientes = items.filter(
      (item) => item.category !== "EPP" && esArticuloEpp(item.name)
    );

    console.log(
      `${DRY_RUN ? "DRY-RUN" : "APLICACIÓN"}: ${pendientes.length} ítem(s) pasarían a EPP.`
    );
    for (const item of pendientes) {
      console.log(`  #${item.id} ${item.name} (${item.category} → EPP)`);
    }

    if (DRY_RUN) {
      console.log(
        "No se escribió nada. Revisa la lista y vuelve a ejecutar con --apply para actualizarla."
      );
      return;
    }
    if (pendientes.length === 0) return;

    const result = await prisma.inventoryItem.updateMany({
      where: {
        id: { in: pendientes.map((item) => item.id) },
        category: { not: "EPP" },
      },
      data: { category: "EPP" },
    });
    console.log(`${result.count} ítem(s) actualizado(s) a EPP.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "No se pudo ejecutar el backfill."
  );
  process.exitCode = 1;
});
