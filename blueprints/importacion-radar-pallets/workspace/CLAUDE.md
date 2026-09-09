<!-- RADAR-PALLETS:INICIO -->
<!--
  Este bloque NO reemplaza al CLAUDE.md del repo: se ANEXA al final.
  El Bootstrap de blueprints/importacion-radar-pallets/blueprint.md §10 lo agrega sólo si el
  marcador de apertura todavía no está presente, así que re-ejecutar el Bootstrap no lo duplica.
  Si lo copiás a mano: pegá este bloque completo al final de CLAUDE.md, nunca encima.
-->

## 10. Importación Radar de Clientes Pallets + segmento INDUSTRIA

Cambio que incorpora al CRM ~127 prospectos de un Excel "Radar de Clientes Pallets V7" (3 hojas,
exportadas a CSV por el usuario), habilita el segmento `INDUSTRIA`, agrega el estado de gestión
telefónica en `Contact`, y cambia el tope de outreach de por-campaña a global. Diseño completo en
`blueprints/importacion-radar-pallets/blueprint.md`; orden de construcción en
`blueprints/importacion-radar-pallets/tasks.json` (12 pasos, 2 épicas).

### Comandos (los mismos del repo + un alias nuevo)

| Tarea | Comando |
|---|---|
| Typecheck | `npm run typecheck` |
| Tests (todo) | `npm run test` |
| Test de un archivo | `npx vitest run lib/outreach/radar.test.ts` |
| Build | `npm run build` |
| Esquema a la BD | `npm run db:push` — exige respaldo `pg_dump` verificado antes |
| **Importar el Radar** (nuevo, manual) | `npm run import:radar -- --dry-run` → revisar → `npm run import:radar` |
| Seed de campañas | `npm run seed:outreach-campaigns` |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de dar por terminada
cualquier tarea. **`next lint` NUNCA es compuerta.**

**El CLI de Prisma no lee `.env.local`.** Antes de cualquier comando `prisma`, en el mismo shell:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

### Reglas duras de este cambio

1. **`lib/outreach/radar.ts` y `lib/outreach/eligibility.ts` son PUROS.** Sin `@prisma/client`, sin
   `@/lib/db`, sin `fs` en runtime. Reciben todo por parámetro, `import type` para tipos de Prisma,
   imports **relativos** (`./prospects`, `./render`) — nunca `@/`. Vitest sólo recoge
   `lib/**/*.test.ts` y no resuelve el alias.
2. **El importador rellena campos vacíos, JAMÁS pisa.** `fillData` sólo con claves cuyo valor
   actual es `null`/`""`; `update` sólo si tiene keys. Mismo criterio para `Company` y `Contact`.
   Un correo entrante distinto al de todos los contactos de la empresa → se crea un `Contact`
   nuevo (spec §5), nunca se pisa el existente. Cuidado con NO reintroducir el bug de 2026-08-05
   (buscar contacto sólo por email → duplicado).
3. **`normalizeCompanyName` es función NUEVA en `radar.ts`.** No se toca `slugify` ni `dedupeKey`
   de `prospects.ts` — los fija `prospects.test.ts`. Match **exacto** tras normalizar, nunca
   substring. Lista de sufijos societarios **cerrada** (`s.a`, `spa`, `ltda`, `sac`, `eirl`, …), no
   heurística.
4. **`enum ProspectSegment` sólo GANA valores.** `INDUSTRIA` se agrega al **final** del bloque.
   `OTRO` se conserva (renombrar es destructivo en Postgres). El `db push` que agrega `INDUSTRIA`
   NO escribe ninguna fila con ese valor (regla PG). `CallStatus` es `CREATE` nuevo.
5. **`db push` contra prod exige `pg_dump "$DIRECT_URL"` verificado con `test -s` antes.**
   `--accept-data-loss` está prohibido (deny de `.claude/settings.json`); si `db push` lo pide, la
   edición no es aditiva → parar. `DIRECT_URL` (sin `-pooler`) para operaciones de esquema.
6. **`middleware.ts` se toca UNA vez (paso 1) y no se vuelve a tocar.** El matcher queda con
   exactamente 5 exclusiones: `auth|posiciones|webhooks|cron|outreach/unsubscribe`. Las rutas de
   página `/admin/crm/*` ya están cubiertas por la rama existente — NO agregar ramas ni entradas
   al matcher para superficies nuevas.
7. **Rutas de API del CRM gatean DENTRO del handler**, en cada método: `getServerSession(authOptions)`
   → `apiError("No autorizado", 401)` → `!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso
   denegado", 403)`. **Nunca `NextResponse.redirect` en `/api/*`.** "VENTAS o ADMIN" = `hasModuleAccess(…,
   "CRM")`, nunca `role === "VENTAS"`.
8. **Validación de enum a mano** (`const CALL_STATUSES = [...] as const` + `.includes()`); PATCH
   parcial con spread condicional. **No** adoptar `zod` fuera de `app/api/finanzas/*`.
9. **El estado de gestión telefónica NO escribe `Activity`.** Es un estado, como `ContactTemperature`.
10. **El cron responde 200 SIEMPRE** salvo 401 de `isAuthorized`. La query de elegibilidad sólo
    GANA condiciones (1 por empresa, tope global, exclusión por `callStatus`), no relaja ninguna.
11. **Cada ruta/página/script/componente nuevo lleva su `*.spec.md` al lado.** Excepción del repo:
    `lib/outreach/templates/` NO lleva `.spec.md` — `industria.ts` tampoco.
12. **Cero dependencias nuevas.** El `.xlsx` lo convierte el usuario a 3 CSV en
    `data/prospects/raw/`; el script reusa `parseCsv` de `lib/outreach/prospects.ts`.
13. **`ContactSource`:** usar `IMPORT` (no agregar valores). Las filas del Radar llevan además una
    línea de nota `"Origen: Radar de Clientes Pallets V7"`.

### Dónde vive cada cosa nueva

| Asunto | Fuente única |
|---|---|
| Lógica pura del Radar (parseo, normalización, clasificación, consolidación) | `lib/outreach/radar.ts` (+ `radar.test.ts`) |
| Reparto de cupo + selección de contacto para el cron | `lib/outreach/eligibility.ts` (+ `eligibility.test.ts`) |
| Importador CLI del Radar | `scripts/import-radar-pallets.ts` (+ `.spec.md`), alias `npm run import:radar` |
| Plantilla del segmento INDUSTRIA | `lib/outreach/templates/industria.ts` + clave `"industria-v1"` en `index.ts` |
| Estado de gestión telefónica | `enum CallStatus` + `Contact.callStatus` en `prisma/schema.prisma`; `GET/PATCH /api/llamadas`; `/admin/crm/llamadas` |
| Tope global de correos | env `OUTREACH_DAILY_CAP` (default 25), leída por `app/api/cron/outreach/route.ts` |
| Fix del matcher | `middleware.ts` — 5 exclusiones en el negative-lookahead de `/api/` |

### Variables de entorno

| Variable | Requerida | La lee | Dónde |
|---|---|---|---|
| `OUTREACH_DAILY_CAP` | no (default 25) | `app/api/cron/outreach/route.ts` | constante en la env de Vercel; documentada en `VARIABLES_ENTORNO.md` |

Las demás (`DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `OUTREACH_PUBLIC_URL`, `OUTREACH_SENDER_*`,
`SMTP_*`, `OUTREACH_PDF_BLOB_URL`) ya existen — ver `VARIABLES_ENTORNO.md`. Este repo **no usa
`.env.example`**.

### Trampas de este cambio

- **`radar.ts`/`eligibility.ts` con `import "@/..."`** → compila con `tsc`, muere en `npx vitest
  run`. Usar relativos.
- **Escribir `segment: "INDUSTRIA"` en el mismo `db push` que agrega el valor** → Postgres lo
  rechaza. El seed y el importador escriben con él en pasos posteriores.
- **La query del cron filtrando `Contact` en vez de `Company`** → no logra "1 correo por empresa".
- **`consolidateRows` con match por substring** → fusiona "Novofarma Service" con "Laboratorio
  Novofarma Service". Match exacto tras normalizar.
- **Segunda corrida del importador con `companiesCreated > 0`** → idempotencia rota (probablemente
  la normalización de nombre difiere entre el índice en memoria y lo que se guardó).
- **`nodemailer` 7.x** tiene advisories sin parche en 7.x — el bump a 9.1+ es un ticket **aparte**,
  no parte de este cambio (ver `blueprint.md` §20.2/§20.4).

### No negociable

1. Nunca uses `@/` en un módulo bajo `lib/`.
2. Nunca escribas en la BD desde `radar.ts`/`eligibility.ts` — reciben datos por parámetro.
3. Nunca hagas `db push` sin respaldo `pg_dump` verificado, ni con `--accept-data-loss`.
4. Nunca vuelvas a tocar `middleware.ts` después del paso 1.
5. Nunca renombres ni borres un valor de `enum ProspectSegment` ni `ContactSource`.
6. Nunca devuelvas un `NextResponse.redirect` desde un handler `/api/*`.
7. Nunca marques una tarea como terminada con un comando del portón en rojo.

<!-- RADAR-PALLETS:FIN -->
