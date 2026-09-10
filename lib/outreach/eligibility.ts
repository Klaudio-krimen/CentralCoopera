/**
 * Lógica pura del reparto de cupo diario de outreach y la selección de contacto
 * por empresa — épica `02-envio-llamadas` de
 * `blueprints/importacion-radar-pallets/`. Sin Prisma, sin `fs`, sin
 * `process.env`: todo entra por parámetro para poder testear con Vitest sin
 * base de datos. Único consumidor fuera de los tests:
 * `app/api/cron/outreach/route.ts` (E2-T3), que hace el I/O de Prisma y le pasa
 * los pools y las listas de contactos ya materializados.
 *
 * Sin imports: `GENERIC_PREFIXES` es privado de `lib/outreach/prospects.ts` (no
 * está exportado), así que se **replica** literalmente acá como `const` local
 * (área rules; CLAUDE.md §10). No se toca `prospects.ts`.
 */

// Réplica LITERAL del array privado `GENERIC_PREFIXES` de `lib/outreach/prospects.ts`.
// Si aquel cambia, este debe cambiar en el mismo commit.
const GENERIC_PREFIXES = [
  "contacto",
  "info",
  "ventas",
  "contact",
  "sac",
  "atencion",
  "hola",
];

// ── allocateDailyBudget ─────────────────────────────────────────────────────
/**
 * Reparte el tope global diario (`OUTREACH_DAILY_CAP`, spec
 * IMPORTACION_RADAR_PALLETS.md §7.7) entre las campañas activas,
 * **proporcionalmente al pool de empresas elegibles** de cada una.
 *
 * `campaigns`  — `{ id, dailyCap }` de cada campaña activa. `dailyCap` es el
 *                tope por campaña que ya existía; ahora es un techo, no la meta.
 * `poolSizes`  — id de campaña → nº de empresas elegibles hoy para esa campaña.
 * `globalCap`  — tope de correos para TODO el outreach hoy (ya descontado lo
 *                enviado antes en el día — eso lo hace el cron).
 *
 * Algoritmo (blueprint §9 Step 8):
 *  - `total = Σ pool`. Si `total <= globalCap` → cada campaña toma
 *    `min(pool, dailyCap)` (alcanza para todos, nadie compite).
 *  - Si `total > globalCap` → a cada una `floor(globalCap * pool / total)`,
 *    capado a `min(dailyCap, pool)`; el remanente por redondeo/caps se reparte
 *    de a 1, siempre a la campaña con **mayor pool restante** que aún tenga
 *    cupo, hasta agotar `globalCap` o los pools. Empate de pool restante → la
 *    primera del array `campaigns` (determinista).
 *  - La suma del resultado es `min(globalCap, total, Σ min(dailyCap, pool))`.
 *
 * Devuelve SIEMPRE una clave por campaña (0 incluido).
 */
export function allocateDailyBudget(
  campaigns: { id: string; dailyCap: number }[],
  poolSizes: Record<string, number>,
  globalCap: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of campaigns) result[c.id] = 0;
  if (campaigns.length === 0 || globalCap <= 0) return result;

  const pool = (id: string): number => Math.max(0, poolSizes[id] ?? 0);
  // Tope efectivo de una campaña: ni más que su pool ni más que su `dailyCap`.
  const ceiling = (c: { id: string; dailyCap: number }): number =>
    Math.min(Math.max(0, c.dailyCap), pool(c.id));

  const total = campaigns.reduce((sum, c) => sum + pool(c.id), 0);
  if (total === 0) return result;

  if (total <= globalCap) {
    for (const c of campaigns) result[c.id] = ceiling(c);
    return result;
  }

  // total > globalCap → reparto proporcional con cap.
  for (const c of campaigns) {
    const proporcional = Math.floor((globalCap * pool(c.id)) / total);
    result[c.id] = Math.min(proporcional, ceiling(c));
  }

  // Remanente (redondeo hacia abajo + caps): de a 1 a la de mayor pool restante.
  let remaining =
    globalCap - campaigns.reduce((sum, c) => sum + result[c.id], 0);
  while (remaining > 0) {
    let elegida: { id: string; dailyCap: number } | null = null;
    let mejorPoolRestante = -1;
    for (const c of campaigns) {
      if (result[c.id] >= ceiling(c)) continue; // sin cupo bajo su techo
      const poolRestante = pool(c.id) - result[c.id];
      if (poolRestante > mejorPoolRestante) {
        mejorPoolRestante = poolRestante;
        elegida = c;
      }
    }
    if (elegida === null) break; // se agotaron pools/caps antes que globalCap
    result[elegida.id] += 1;
    remaining -= 1;
  }

  return result;
}

// ── pickCompanyContact ─────────────────────────────────────────────────────
const localPart = (email: string): string =>
  email.split("@")[0].trim().toLowerCase();

const isGenericEmail = (email: string): boolean =>
  GENERIC_PREFIXES.includes(localPart(email));

/**
 * Elige QUÉ contacto de una empresa recibe el correo de campaña — "un solo
 * correo por empresa" (spec §7.5). Regla de exposición mínima (spec §7.6):
 * casilla genérica (`info@`, `contacto@`, `ventas@`, …) antes que nominativa;
 * entre varias genéricas, la más antigua (`createdAt` menor); si no hay ninguna
 * genérica, la más antigua del conjunto. Empate exacto de `createdAt` → el
 * primero del array recibido (determinista).
 *
 * `[]` → `null`. Se asume `email` no vacío: el cron ya filtró `email != null`.
 */
export function pickCompanyContact(
  contacts: { id: string; email: string; createdAt: Date }[]
): string | null {
  if (contacts.length === 0) return null;
  const genericos = contacts.filter((c) => isGenericEmail(c.email));
  const universo = genericos.length > 0 ? genericos : contacts;

  let elegido = universo[0];
  for (const c of universo) {
    if (c.createdAt.getTime() < elegido.createdAt.getTime()) elegido = c;
  }
  return elegido.id;
}

// ── isCompanyPhoneManaged ──────────────────────────────────────────────────
/**
 * `true` si la empresa ya tiene **gestión telefónica iniciada** — algún
 * contacto con `callStatus` distinto de `null` y de `"POR_LLAMAR"` (spec §7.8:
 * "una empresa con gestión telefónica registrada queda excluida del correo
 * automático, incluso si después se le carga un correo").
 *
 * Documenta la regla; la query del cron la replica con
 * `NOT: { contacts: { some: { callStatus: { not: null, notIn: ["POR_LLAMAR"] } } } }`.
 */
export function isCompanyPhoneManaged(
  contacts: { callStatus: string | null }[]
): boolean {
  return contacts.some(
    (c) => c.callStatus !== null && c.callStatus !== "POR_LLAMAR"
  );
}
