/**
 * Pase de enriquecimiento de correos — Fase 1 de PROSPECCION_OUTREACH.md
 *
 * Toma las empresas de data/prospects/candidatas_enriquecimiento.csv (las que ya
 * tienen sitio web pero NO correo) y corre el actor de Apify
 * `vdrmota/contact-info-scraper` sobre cada dominio para extraer correos de contacto.
 *
 * Por qué async con polling y no run-sync: con 55 URLs y profundidad 1, el actor
 * puede tardar más de los ~5 minutos que tolera el endpoint sync de Apify. El modo
 * async no tiene ese techo.
 *
 * Uso:
 *   npm run enrich:emails
 *
 * Requiere APIFY_TOKEN en .env.local (ver VARIABLES_ENTORNO.md).
 *
 * Salida: data/prospects/candidatas_enriquecidas.csv
 *   Mismo contenido de entrada + columnas: emails_encontrados, cantidad_emails
 */

import * as fs from "fs";
import * as path from "path";

const APIFY_ACTOR = "vdrmota~contact-info-scraper";
const INPUT_CSV = path.resolve(
  __dirname,
  "../data/prospects/candidatas_enriquecimiento.csv"
);
const OUTPUT_CSV = path.resolve(
  __dirname,
  "../data/prospects/candidatas_enriquecidas.csv"
);
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_MINUTES = 20;

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

// ── CSV: parser mínimo con soporte de comillas (RFC4180 básico) ──
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
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
      inQuotes = !inQuotes;
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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function domainOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

// ── Apify: disparo del run, polling y descarga del dataset ──
async function runApifyActor(
  token: string,
  startUrls: string[]
): Promise<any[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: startUrls.map((url) => ({ url })),
        maxDepth: 1,
        sameDomain: true,
      }),
    }
  );

  if (!runRes.ok) {
    throw new Error(
      `Apify rechazó el run (${runRes.status}): ${await runRes.text()}`
    );
  }

  const runData: any = await runRes.json();
  const runId = runData.data.id;
  console.log(
    `Run iniciado: ${runId}. Consultando cada ${POLL_INTERVAL_MS / 1000}s...`
  );

  const deadline = Date.now() + MAX_POLL_MINUTES * 60_000;
  let status = "READY";
  let datasetId = "";

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    const statusData: any = await statusRes.json();
    status = statusData.data.status;
    datasetId = statusData.data.defaultDatasetId;
    console.log(`  estado: ${status}`);

    if (["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(status)) {
      break;
    }
  }

  if (status !== "SUCCEEDED") {
    throw new Error(
      `El run terminó en estado ${status}. Revisa el log en la consola de Apify.`
    );
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`
  );
  return itemsRes.json();
}

// El schema exacto de salida del actor puede variar entre versiones — se buscan
// los correos en los campos más probables en vez de asumir uno solo.
function extractEmails(item: any): string[] {
  const emails = new Set<string>();
  const candidates = [item.emails, item.email, item.contactEmails].flat();
  for (const c of candidates) {
    if (typeof c === "string" && c.includes("@")) emails.add(c.toLowerCase());
  }
  return Array.from(emails);
}

function extractItemUrl(item: any): string | null {
  return (
    item.url ||
    item.startUrl ||
    item.originalStartUrl ||
    item.referrerUrl ||
    null
  );
}

async function main() {
  loadEnvLocal();
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error(
      "Falta APIFY_TOKEN. Agrégalo a .env.local (ver VARIABLES_ENTORNO.md) y vuelve a correr."
    );
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`No se encontró ${INPUT_CSV}.`);
    process.exitCode = 1;
    return;
  }

  const candidates = parseCsv(fs.readFileSync(INPUT_CSV, "utf-8"));
  console.log(`Candidatas a enriquecer: ${candidates.length}`);

  const items = await runApifyActor(
    token,
    candidates.map((c) => c.url)
  );
  console.log(`Apify devolvió ${items.length} resultados.`);

  // Índice por dominio para el merge — es la clave estable entre input y output.
  const byDomain = new Map<string, string[]>();
  for (const item of items) {
    const url = extractItemUrl(item);
    if (!url) continue;
    const domain = domainOf(url);
    if (!domain) continue;
    const emails = extractEmails(item);
    if (emails.length === 0) continue;
    const existing = byDomain.get(domain) ?? [];
    byDomain.set(domain, Array.from(new Set([...existing, ...emails])));
  }

  const header = [
    "empresa",
    "segmento",
    "comuna",
    "url",
    "dominio",
    "emails_encontrados",
    "cantidad_emails",
  ];
  const outLines = [header.join(",")];

  let conEmail = 0;
  for (const c of candidates) {
    const emails = byDomain.get(c.dominio) ?? [];
    if (emails.length > 0) conEmail++;
    outLines.push(
      [
        csvEscape(c.empresa),
        c.segmento,
        csvEscape(c.comuna),
        c.url,
        c.dominio,
        csvEscape(emails.join(";")),
        String(emails.length),
      ].join(",")
    );
  }

  fs.writeFileSync(OUTPUT_CSV, outLines.join("\n") + "\n", "utf-8");

  const rate = ((conEmail / candidates.length) * 100).toFixed(1);
  console.log("");
  console.log(
    `Resultado: ${conEmail}/${candidates.length} empresas con al menos un correo (${rate}%).`
  );
  console.log(`Guardado en: ${OUTPUT_CSV}`);
  if (conEmail / candidates.length < 0.4) {
    console.warn(
      "Tasa bajo el 40% esperado — revisa candidatas_enriquecidas.csv manualmente antes de importar al CRM."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
