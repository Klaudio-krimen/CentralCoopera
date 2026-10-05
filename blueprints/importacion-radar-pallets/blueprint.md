                                                              # Importación Radar de Clientes Pallets + segmento INDUSTRIA — Blueprint

> Generado por The Architect el 2026-09-09
> Shape: internal-tool (módulo CRM de una intranet multi-módulo) + capacidad de data-import/outreach
> Modo de emisión: bundle (12 pasos en §9 → ≥12 → bundle; el usuario además lo pidió explícito)
> Versión del blueprint: 1
> Versiones verificadas: 2026-09-12 — ver §11 para provenance por paquete

**Cambio brownfield.** El repo objetivo es `C:/dev/CentralCoopera` (GitHub
`Klaudio-krimen/CentralCoopera`, rama `master`, desplegado en `intranet.cooperapro.cl`). El bundle
vive dentro de ese repo para que los `verify` corran desde su raíz.

---

## 1. Project Overview & Non-Goals

### Vision

Central Coopera es la intranet de Coopera Pro (Santiago, Chile): Operaciones, Inventario, CRM y
Finanzas. El negocio tiene un **taller de pallets con capacidad ociosa** que necesita clientes. Ya
existe un pipeline de prospección por scraping (Apify → `scripts/import-prospects.ts` → `Company` /
`Contact`) y un motor de outreach por correo frío (`/api/cron/outreach`, dos campañas segmentadas
`LOGISTICA` / `FARMACEUTICA`, todas `isActive=false`).

Este cambio incorpora al CRM un **segundo lote de prospectos** — ~127 empresas con contacto
verificado a mano, provenientes de un Excel "Radar de Clientes Pallets V7" — sin duplicar contra la
carga Apify previa, habilita un **tercer segmento de outreach `INDUSTRIA`** (el fallback de una
clasificación por palabras clave) con su propia campaña y plantilla, agrega un **estado de gestión
telefónica** por contacto con su vista de "lista de llamadas", y convierte el tope de envío de
por-campaña a un **tope global diario** con un solo correo por empresa.

### Current state

| Eje | Realidad del repo (verificada 2026-09-09) |
|---|---|
| Runtime | Next.js 14.2.35 (App Router) · TypeScript 5.9.3 · Prisma 5.22.0 sobre PostgreSQL/Neon (`DATABASE_URL` pooled + `DIRECT_URL` directa) · NextAuth v4.24.15 (JWT, 8h) · Tailwind 3 · `@base-ui/react` · Vercel · Vitest 4.1.9. Gestor: `npm`, `package-lock.json` es autoridad. |
| Portón | `npm run typecheck && npm run test && npm run build`. `next lint` **nunca** es compuerta (sin `.eslintrc`, abre prompt interactivo y cuelga). Estilo = Prettier vía `lint-staged --write` en `.husky/pre-commit` (`lint-staged → typecheck → test`). |
| Tests | Vitest, `include: ['lib/**/*.test.ts']` únicamente, `environment: 'node'`. Lógica testeable = funciones **puras** bajo `lib/`, reciben Prisma/tx **por parámetro**, imports **relativos** (nunca `@/`), sin `process.env` en el cuerpo del módulo. Rutas y páginas no tienen test unitario. |
| Datos | `prisma db push` contra Neon, **sin** `prisma/migrations/`. El CLI de Prisma no lee `.env.local`: hay que `export DATABASE_URL`/`DIRECT_URL` en el mismo shell (Git Bash). `db push` contra prod exige `pg_dump "$DIRECT_URL"` verificado antes; `backups/` en `.gitignore`. |
| RBAC | `lib/access.ts` · `hasModuleAccess(user, 'CRM')` = `user.role === 'ADMIN' || user.moduleAccess.includes('CRM')`. "VENTAS o ADMIN" se expresa **siempre** así, nunca `role === 'VENTAS'`. Las rutas de API del CRM gatean **dentro del handler** (sólo `/api/finanzas` se gatea en `middleware.ts`). |
| Errores de API | `apiError(message, status = 400)` de `lib/utils.ts` → `NextResponse.json({ error: message }, { status })`. **Nunca** `NextResponse.redirect` en un handler `/api/*`. |
| Convención | Docs en español, `MAYUSCULAS.md` en la raíz. **Cada ruta/página/script/componente nuevo lleva su `*.spec.md` al lado.** (Las plantillas de `lib/outreach/templates/` son la excepción: ese directorio no tiene `.spec.md`.) |
| Scripts | `ts-node --project tsconfig.scripts.json scripts/<x>.ts` + alias en `package.json` + un `loadEnvLocal()` copiado a mano en cada script. Idempotentes: find-then-create, un objeto `fillData` que **sólo rellena campos vacíos, jamás pisa**. |
| Bundle precedente | `blueprints/modulo-finanzas/` — mismo formato de `blueprint.md` §9 (Do / Done-when EARS / Verify / Checkpoint + Step map), `tasks.json`, `epics/NN-*.md`, `workspace/`. |

**Módulos que el cambio toca (subsistemas):**

| Subsistema | Estado hoy | Qué le hace este cambio |
|---|---|---|
| `enum ProspectSegment` (`prisma/schema.prisma:132-136`) | `LOGISTICA · FARMACEUTICA · OTRO`. `OTRO` existe pero **ningún código lo usa**. | Agrega `INDUSTRIA` como último valor (aditivo). |
| Importador (`scripts/import-prospects.ts` + `lib/outreach/prospects.ts`) | Puro + I/O. Dedup `placeId → dominio → nombre+comuna`; `slugify()` **no** quita sufijos societarios; el match contra BD usa `name equals insensitive` (semántica distinta al slug del lote). Segmento **hardcodeado por archivo fuente**, sin clasificador por keywords. Un contacto por prospecto — dos filas de la misma empresa comparten `dedupeKey` y la segunda **se descarta**. | Script nuevo `import-radar-pallets.ts` + módulo puro nuevo `lib/outreach/radar.ts`: dedup **sólo por nombre normalizado** (la fuente no trae RUT ni `placeId`), consolidación entre 3 hojas, `classifySegment()` por keywords, `splitPhones()`, "correo distinto → segundo `Contact`". No toca `prospects.ts` ni sus tests. |
| Motor de envío (`app/api/cron/outreach/route.ts`) | `for (campaign of activas) { take: campaign.dailyCap }` → con 3 campañas activas serían hasta 75/día. Itera **contactos**, un correo por cada uno. `OutreachSend @@unique([campaignId, contactId])`. El env `OUTREACH_DAILY_CAP` está **declarado pero muerto** (ningún código lo lee). | Tope **global** de 25/día vía `OUTREACH_DAILY_CAP`, repartido **proporcional al pool** de cada campaña; **un solo correo por empresa** (genérico > nominativo > más antiguo); excluye toda empresa con gestión telefónica ya iniciada. Lógica de reparto/selección extraída a `lib/outreach/eligibility.ts` (pura, testeable). |
| Plantillas (`lib/outreach/templates/`) | `index.ts` = registro `templateKey → fn`; `render.ts` (saludo con fallback + pie legal Ley 19.496 art. 28 B); `logistica.ts` / `farmaceutica.ts`. `getTemplate()` lanza si falta la clave. | Agrega `industria.ts` + entrada `"industria-v1"` en el registro + casos en `render.test.ts`. |
| Estado de gestión telefónica | **No existe** ningún campo ni enum. Precedente exacto: `ContactTemperature` (enum + `@@index` + badge read-only `TemperatureBadge.tsx` + `<Select>` en modal + filtro en lista). | `enum CallStatus` + `Contact.callStatus CallStatus?` + `@@index`; ruta `GET/PATCH /api/llamadas`; página `/admin/crm/llamadas` con editor in-line; ítem de nav en `AdminSidebar.tsx`. |
| Campañas | Sin CRUD ni UI de edición. `scripts/seed-outreach-campaigns.ts` (find-by-`templateKey`, `isActive:false`). Panel de sólo lectura `/admin/crm/outreach/page.tsx` ya existe (el doc §11 dice que no — **doc desactualizado**). | 3ª entrada en `CAMPAIGNS` (segmento `INDUSTRIA`, `isActive:false`); `INDUSTRIA` agregado a `SEGMENT_LABEL` del panel. |
| `middleware.ts` | matcher `/api/((?!auth|posiciones|webhooks).*)` — **`/api/cron/outreach` y `/api/outreach/unsubscribe` SÍ pasan por `withAuth`**. Verificado dos veces (ver §8 y §20.2 riesgo 4): una petición sin cookie de sesión a una ruta `/api/*` del matcher recibe **307 a `/api/auth/signin`**, no llega al handler. El cron de Vercel manda `Authorization: Bearer`, no cookie → nunca ha ejecutado (enmascarado porque las campañas están `isActive=false`). El link de baja está roto para un destinatario deslogueado → incumple Ley 19.496 art. 28 B. | Paso 1 (prerrequisito): matcher → `/api/((?!auth|posiciones|webhooks|cron|outreach/unsubscribe).*)`. Aditivo puro (suma exclusiones). |

### Target state

Después de este cambio:

- El schema tiene `ProspectSegment.INDUSTRIA`, `enum CallStatus`, y `Contact.callStatus CallStatus?`
  (`db push` aplicado a Neon con respaldo previo).
- `middleware.ts` deja pasar `/api/cron/outreach` y `/api/outreach/unsubscribe` sin sesión.
- `lib/outreach/radar.ts` + `lib/outreach/radar.test.ts` — parseo, normalización de nombre,
  `splitPhones`, `classifySegment`, `consolidateRows`, `toRadarProspect`. Puro, cubierto por Vitest.
- `scripts/import-radar-pallets.ts` (+ `.spec.md` + alias `npm run import:radar`) — lee 3 CSV de
  `data/prospects/raw/`, deduplica contra el CRM por nombre normalizado, enriquece sin pisar, marca
  `callStatus=POR_LLAMAR` a los phone-only, resume con desglose por segmento, `--dry-run` primero.
- `lib/outreach/templates/industria.ts` + `"industria-v1"` en el registro + tests.
- `scripts/seed-outreach-campaigns.ts` con la 3ª campaña `INDUSTRIA` (`isActive:false`).
- `lib/outreach/eligibility.ts` + `.test.ts` — `allocateDailyBudget`, `pickCompanyContact`,
  `isCompanyPhoneManaged`. Puro.
- `app/api/cron/outreach/route.ts` reescrito: tope global, 1 correo por empresa, exclusión por
  `callStatus`. Sigue respondiendo 200 siempre.
- `app/api/llamadas/route.ts` (GET + PATCH), `components/ui/CallStatusBadge.tsx`,
  `components/crm/CallStatusSelect.tsx`, `components/crm/ListaLlamadas.tsx`,
  `app/(admin)/admin/crm/llamadas/page.tsx`, ítem "Llamadas" en el nav del CRM.
- `VARIABLES_ENTORNO.md` documenta `OUTREACH_DAILY_CAP` como usada y corrige la sección de DB stale.

La campaña `INDUSTRIA` queda `isActive=false` como las otras dos. Activar el envío sigue bloqueado
por los datos legales del remitente y SPF/DKIM/DMARC (§12, post-build launch checklist).

### Users

| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Claudio (ADMIN, opera solo) | Correr el importador del Radar una vez; revisar el reporte; a futuro operar el CRM | Una vez la importación; el CRM en curso |
| Encargada de Ventas (rol con `moduleAccess: ['CRM']`, futuro) | Trabajar la lista de llamadas: mover el estado de gestión telefónica | Diario, cuando exista el usuario |

### Goals — v1 scope

1. El CRM contiene las ~127 empresas del Radar con contacto verificado, sin duplicados contra la
   carga Apify ni entre las 3 hojas, cada empresa con un segmento asignado.
2. Existe un tercer segmento `INDUSTRIA` con campaña (`isActive=false`) y plantilla propia.
3. Cada contacto puede tener un estado de gestión telefónica editable desde una lista de llamadas
   en el CRM.
4. El motor de envío respeta un tope global de 25 correos/día, manda un solo correo por empresa, y
   se salta las empresas cuya gestión telefónica ya empezó.
5. El cron y el link de baja son alcanzables (fix del matcher).

### Non-Goals — explícitamente fuera de alcance para v1

| No se construye | Por qué no ahora | Revisar cuando |
|---|---|---|
| Parser de rebotes (`emailStatus=REBOTADO` / `SendStatus.REBOTADO`) | La cláusula ya está cableada pero inerte; procesar rebotes es un subsistema aparte (webhook SMTP / IMAP). | El volumen de envío justifique medir rebote real. |
| Secuencias multi-toque (2º correo a los N días) | Requiere modelar pasos en la campaña; PROSPECCION_OUTREACH.md §13.3 lo deja fuera de v1. | La tasa de respuesta de un solo toque se estabilice. |
| Endpoint HTTP de importación (`/api/prospects/import` para subir CSV desde el navegador) | El script CLI cubre la carga puntual; el endpoint es trabajo de UI + auth + errores por fila. | Otra persona además de Claudio necesite cargar prospectos. |
| Columna `Company.normalizedName` persistida + backfill de las ~120 empresas Apify | La dedup en memoria alcanza para una carga supervisada de una vez. | La importación del Radar se vuelva recurrente o Ventas renombre empresas a mano entre corridas. |
| Tocar los módulos Operaciones / Inventario / Finanzas | Fuera de scope; sus modelos y rutas no se modifican. | — |
| Activar campañas (`OutreachCampaign.isActive=true`) | Bloqueado por los datos legales del remitente (Ley 19.496 art. 28 B) y SPF/DKIM/DMARC del dominio. | Los tres datos legales estén en env y los registros DNS propaguen y se verifiquen. |
| Resolver SPF / DKIM / DMARC + reunir `OUTREACH_SENDER_LEGAL_NAME` / `_RUT` / `_ADDRESS` | Es trabajo de DNS y datos, no de código. Bloqueante heredado. | En paralelo, sin dependencia de este cambio. |
| Bump de `nodemailer` 7.x → 9.1+ | La línea 7.x está EOL con advisories sin parche (ver §11 y §20.2). Este cambio no empeora la exposición. | Como ticket de seguridad aparte. |
| Puntuar (`lib/scoring.ts`) los leads del Radar en la importación | El importador Apify tampoco puntúa (`temperature=FRIO`, `score=0`). Ventas puntúa después con `RecalculateScoreButton`. | — |

**El builder no implementa nada de esta tabla**, aunque parezca un agregado chico mientras trabaja
un paso adyacente. Si un paso parece requerir un non-goal, es un defecto del blueprint — parar y
reportar.

### Success metrics

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Idempotencia de la importación | Correr `npm run import:radar` dos veces seguidas → 0 empresas y 0 contactos creados en la 2ª | El `ImportStats` que imprime el script (`companiesCreated: 0`, `contactsCreated: 0`) |
| Cobertura de segmento | 0 empresas del Radar quedan sin `segment` tras importar | El desglose `bySegment` del `ImportStats` suma el total importado |
| Tope global respetado | El cron nunca crea más de 25 `OutreachSend` con `sentAt` en un mismo día hábil, sumando las 3 campañas | `SELECT count(*) FROM "OutreachSend" WHERE "sentAt"::date = CURRENT_DATE` ≤ 25 |

---

## 2. Tech Stack

**Sin cambio de stack.** Es el stack en producción del repo; este cambio **no agrega ni sube
ninguna dependencia**. La tabla nombra *elecciones*; los pines viven en §11.

| Capa | Elección | Por qué esta, y no otra |
|---|---|---|
| Language / runtime | TypeScript 5 sobre Node (Vercel) | Ya es el repo. |
| Framework | Next.js 14 App Router | Ya es el repo; la ruta nueva y la página nueva siguen sus patrones. |
| Styling | Tailwind 3 + tokens `crm-*` (`tailwind.config.ts theme.extend.colors.crm` + `app/(admin)/admin/crm/crm.css`) | Sistema del módulo CRM ya existente; el badge nuevo se clona de `TemperatureBadge`. |
| Component layer | `@base-ui/react` primitivos en `components/crm/ui/*` | Ya es el sistema del CRM; `<Select>` accesible por teclado. |
| Database | PostgreSQL en Neon | Ya es el repo. Cambio aditivo de schema vía `db push`. |
| ORM / data access | Prisma 5 | Ya es el repo. |
| Auth | NextAuth v4 (credenciales + JWT) + `hasModuleAccess('CRM')` | Ya es el repo. La ruta nueva gatea en el handler. |
| Background work | Vercel Cron (`vercel.json`, `0 12 * * 1-5`) | Ya existe; este cambio corrige que sea alcanzable y reescribe su lógica de selección. |
| Payments | NOT APPLICABLE | No hay pagos en este cambio. |
| File storage | Vercel Blob (PDF de la campaña, ya subido) | La campaña `INDUSTRIA` reusa el mismo `OUTREACH_PDF_BLOB_URL` (decisión §13.1 de PROSPECCION_OUTREACH.md). |
| Email / notifications | SMTP Hostinger vía `nodemailer` (`lib/outreach/smtp.ts`) | Ya es el repo (revisado 2026-08-04). |
| Hosting | Vercel, deploy en push a `master` | Ya es el repo. |
| Package manager | `npm` (`package-lock.json`) | Ya es el repo. |

### Compatibility check

Sin combinaciones conflictivas — es el stack ya en producción del repo y este cambio no agrega
nada. El único punto de atención lo levanta el `stack-researcher` (§11): `next-auth` v4 `withAuth`
sin cookie de sesión responde 307 (no 401) para cualquier ruta del matcher, incluidas `/api/*` —
por eso el paso 1 excluye `/api/cron` y `/api/outreach/unsubscribe` del matcher.

---

## 3. Directory Structure

Sólo lo que el cambio toca. Cada archivo nuevo lo escribe exactamente un paso de §9 (aparece en su
**Do** y en el `files` de su tarea).

```
CentralCoopera/
  middleware.ts                                   # EDITA S1 — matcher del negative-lookahead
  prisma/
    schema.prisma                                 # EDITA S2 — enum INDUSTRIA + CallStatus + Contact.callStatus
  VARIABLES_ENTORNO.md                            # EDITA S2 — documenta OUTREACH_DAILY_CAP, corrige sección DB
  PROSPECCION_OUTREACH.md                         # EDITA S9 — §11 Fase 4 ya existe; nota del tope global
  package.json                                    # EDITA S5 — alias "import:radar"
  data/prospects/raw/
    radar_prospectos.csv                          # LO PONE EL USUARIO (export de la hoja "Prospectos verificados")
    radar_top20.csv                               # LO PONE EL USUARIO (export de "TOP 20 ataque comercial")
    radar_top25.csv                               # LO PONE EL USUARIO (export de "TOP 25 empresas abordables")
  lib/outreach/
    radar.ts                                      # NUEVO S3+S4 — lógica pura del Radar (parseo, normalización, clasificación, consolidación)
    radar.test.ts                                 # NUEVO S3+S4 — Vitest de radar.ts
    eligibility.ts                                # NUEVO S8 — reparto de cupo + selección de contacto (puro)
    eligibility.test.ts                           # NUEVO S8 — Vitest de eligibility.ts
    templates/
      industria.ts                                # NUEVO S6 — plantilla del segmento INDUSTRIA
      index.ts                                    # EDITA S6 — registra "industria-v1"
      render.test.ts                              # EDITA S6 — casos de la plantilla industria
  scripts/
    import-radar-pallets.ts                       # NUEVO S5 — importador CLI del Radar
    import-radar-pallets.spec.md                  # NUEVO S5 — spec del script
    seed-outreach-campaigns.ts                    # EDITA S7 — 3ª entrada CAMPAIGNS (INDUSTRIA)
  app/
    api/
      cron/outreach/route.ts                      # EDITA S9 — usa eligibility.ts, tope global, 1 por empresa
      cron/outreach/route.spec.md                 # EDITA S9 — nueva query de elegibilidad
      llamadas/route.ts                           # NUEVO S10 — GET + PATCH /api/llamadas
      llamadas/route.spec.md                      # NUEVO S10 — spec de la ruta
    (admin)/admin/crm/
      outreach/page.tsx                           # EDITA S7 — INDUSTRIA en SEGMENT_LABEL
      llamadas/page.tsx                           # NUEVO S12 — vista de lista de llamadas
      llamadas/page.spec.md                       # NUEVO S12 — spec de la página
  components/
    ui/
      CallStatusBadge.tsx                         # NUEVO S11 — badge read-only del estado (clon de TemperatureBadge)
      CallStatusBadge.spec.md                     # NUEVO S11
      AdminSidebar.tsx                            # EDITA S12 — ítem de nav "Llamadas"
    crm/
      CallStatusSelect.tsx                        # NUEVO S11 — editor in-line del estado (PATCH → toast → refresh)
      CallStatusSelect.spec.md                    # NUEVO S11
      ListaLlamadas.tsx                           # NUEVO S12 — tabla cliente de la vista de llamadas
  blueprints/importacion-radar-pallets/           # este bundle (ya en .prettierignore y tsconfig exclude via Finanzas)
```

**Boundary rules**

- Los módulos bajo `lib/` (incluidos `lib/outreach/radar.ts` y `lib/outreach/eligibility.ts`) usan
  **imports relativos** (`./prospects`, `./render`), nunca el alias `@/`. Los archivos bajo `app/`
  y `components/` sí usan `@/`. Ver la matriz de resolución en §19.6.
- `lib/outreach/radar.ts` y `lib/outreach/eligibility.ts` **no importan** `@prisma/client` ni
  `@/lib/db` en runtime: reciben los datos por parámetro (interfaz estructural mínima) y usan
  `import type` para los tipos de Prisma. Es lo que permite que Vitest los pruebe sin base.
- El importador `scripts/import-radar-pallets.ts` es el **único** archivo del cambio que abre una
  conexión Prisma (más el cron y las rutas, que ya la abrían).
- Los modelos de Operaciones e Inventario en `prisma/schema.prisma` **no se tocan**.

Ningún path de este árbol colisiona con `blueprints/` — que ya está en `.prettierignore` y en el
`exclude` de `tsconfig.json` (los agregó el bundle de Finanzas).

---

## 4. Data Model

### Delta

**`enum CallStatus`** — NUEVO. Ciclo de gestión telefónica de un `Contact`.

| Valor | Significado |
|---|---|
| `POR_LLAMAR` | Encolado por el importador (empresa con teléfono y sin correo). Nadie llamó todavía. |
| `LLAMADA` | Ventas llamó. |
| `SIN_RESPUESTA` | Se intentó y no contestaron. |
| `CORREO_CONSEGUIDO` | Se obtuvo un correo por teléfono. Ese correo es para escribir a mano, no para el envío automático. |

**`enum ProspectSegment`** — se agrega `INDUSTRIA` como **último** valor (después de `OTRO`). `OTRO`
se conserva (renombrarlo sería destructivo en Postgres). `INDUSTRIA` es el fallback de
`classifySegment` (§4 de la spec).

**`model Contact`** — se agrega:

| Campo | Tipo | Constraints | Notas |
|---|---|---|---|
| `callStatus` | `CallStatus?` | nullable, sin default | `null` = no aplica gestión telefónica a este contacto. El importador lo pone en `POR_LLAMAR` sólo si el contacto tiene teléfono y no tiene correo. Ventas lo mueve desde `/admin/crm/llamadas`. |

Índice: `@@index([callStatus])` — sirve al filtro `?callStatus=` de `GET /api/llamadas` y a la
exclusión del cron.

### Relationships

Sin cambios de relación. `Contact` sigue perteneciendo a `Company` (`onDelete: Cascade`).

### Indexes

| Tabla | Índice | Por qué |
|---|---|---|
| `Contact` | `callStatus` | El filtro de la lista de llamadas y el `NOT: { contacts: { some: { callStatus: … } } }` del cron. |

### Schema (sólo el delta)

```prisma
enum ProspectSegment {
  LOGISTICA
  FARMACEUTICA
  OTRO
  INDUSTRIA        // fallback de classifySegment — se agrega AL FINAL del bloque
}

enum CallStatus {
  POR_LLAMAR
  LLAMADA
  SIN_RESPUESTA
  CORREO_CONSEGUIDO
}

model Contact {
  // ... campos existentes ...
  callStatus  CallStatus?   // gestión telefónica — null = no aplica

  // ... índices existentes ...
  @@index([callStatus])
}
```

### Migrations

`prisma db push` contra Neon — el repo no usa `prisma/migrations/`. Recipe obligatoria (misma que
`blueprints/modulo-finanzas/blueprint.md` §9 y `CLAUDE.md` §9):

```bash
# El CLI de Prisma NO lee .env.local — exportar en el mismo shell (Git Bash):
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
mkdir -p backups
pg_dump "$DIRECT_URL" > backups/pre-radar-pallets.sql
test -s backups/pre-radar-pallets.sql          # respaldo existe y no está vacío
npm run db:push                                 # DEBE salir 0 sin pedir --accept-data-loss
npx prisma generate
npm run typecheck
```

**Footguns (del `stack-researcher`, 2026-09-09):**

1. **`INDUSTRIA` se declara al FINAL del bloque `enum ProspectSegment`.** Insertarlo a mitad puede
   hacer que Prisma elija drop-and-recreate del tipo enum → cascada a las columnas → flag de
   pérdida de datos (prisma#16180). Al final = simple `ALTER TYPE ... ADD VALUE`.
2. **Un valor agregado a un enum preexistente no se puede USAR en la misma transacción que lo
   agrega** (regla de Postgres, vigente en PG 15/16). Por eso el `db push` de S2 **sólo** agrega
   `INDUSTRIA` — sin `DEFAULT` a `INDUSTRIA`, sin escribir filas con él. El seed (S7) y el
   importador (S5) que escriben `segment: 'INDUSTRIA'` corren en pasos posteriores. `CallStatus` es
   `CREATE` nuevo → exento de esa regla.
3. **`db push` contra `DIRECT_URL` (conexión directa), no el pooler.** El host con `-pooler`
   (PgBouncer transaction mode) puede fallar el DDL. Ya documentado en `CLAUDE.md` §8.
4. Agregar valor de enum + columna nullable en Neon (PG 15+) es aditivo: **no** pide `--force` ni
   `--accept-data-loss`, y **no** da el error `ALTER TYPE ... cannot run inside a transaction`
   (eso es PG < 12).

### Seed data

`npm run seed:outreach-campaigns` crea las 3 `OutreachCampaign` (`isActive:false`) de forma
idempotente (find-by-`templateKey`). Es un paso **manual post-build** (necesita Neon). No hay otro
seed en este cambio; el importador (`npm run import:radar`) es carga de datos reales, también
manual.

### Interfaces held constant

| Interfaz congelada | Espejo en §1 Non-Goals |
|---|---|
| `enum ProspectSegment` **sólo gana valores, nunca se renombra ni se borra** un valor. `OTRO` se queda. | "No tocar" el enum destructivamente. |
| `OutreachSend @@unique([campaignId, contactId])` — la garantía dura de idempotencia del cron. El "un correo por empresa" se implementa en la query/selección, **no** cambiando este constraint. | — |
| `NormalizedProspect` y las firmas **exportadas** de `lib/outreach/prospects.ts` (`clean`, `parseCsv`, `dedupeKey`, `pickBestEmail`, `isPhoneOnly`) — las fija `lib/outreach/prospects.test.ts` y las consume `scripts/import-prospects.ts`. `radar.ts` **importa** `clean`/`parseCsv`, no los modifica. `slugify` y `GENERIC_PREFIXES` son **privados** de `prospects.ts` (no exportados): `eligibility.ts` **replica** el array `["contacto","info","ventas","contact","sac","atencion","hola"]` en vez de importarlo. | — |
| `lib/csv.ts` (`parseCsv(text, delimiter)`, `toCsv`, `detectarDelimitador`) — lo usan CRM e Inventario. No se toca. | — |
| `Contact.email` y `Contact.phone` siguen siendo `String?` **singulares** — varios valores ⇒ varias filas `Contact` (correo distinto) o notas (teléfonos extra). | — |
| `ContactSource` — no se le agregan valores (`CLAUDE.md` §7). Las filas del Radar usan `IMPORT`. | — |

---

## 5. API Design

### Conventions (las del repo — no cambian)

- Sin base path versionada. Las rutas viven en `app/api/<recurso>/route.ts`.
- **Sin envelope de éxito estándar.** Éxito = `NextResponse.json(data)` (o `{ status: 201 }`).
- Error = `apiError(message, status = 400)` de `lib/utils.ts` → `NextResponse.json({ error: message
  }, { status })`. Códigos en uso: 400 (validación / default), 401 ("No autorizado", sin sesión),
  403 ("Acceso denegado", módulo/rol), 404, 409. **Nunca** `NextResponse.redirect` en `/api/*`.
- Validación a mano: destructurar `await req.json()`, guard clauses, enums contra un `const ARR =
  [...]` local + `ARR.includes()`, PATCH parcial con spreads condicionales
  `...(campo !== undefined ? { campo } : {})`. `zod` sólo en `app/api/finanzas/*` — **no** se adopta
  acá.
- Auth: cada handler llama `getServerSession(authOptions)` directo (no hay wrapper) y luego
  `hasModuleAccess(session.user, 'CRM')`. El cron usa su propia `isAuthorized(req)` con `CRON_SECRET`.

### Routes

| Método | Path | Descripción | Auth | Rate limit |
|---|---|---|---|---|
| GET | `/api/llamadas` | Lista `Contact` con `phone != null` + su `Company`. Acepta `?callStatus=` y `?q=`. | sesión + `hasModuleAccess('CRM')` | — |
| PATCH | `/api/llamadas` | Actualiza `callStatus` de un contacto por `id`. | sesión + `hasModuleAccess('CRM')` | — |
| GET | `/api/cron/outreach` | Reescrito: tope global, 1 por empresa, exclusión por gestión telefónica. Sigue respondiendo 200 siempre. | `CRON_SECRET` en header (`Authorization: Bearer` o `x-cron-secret`) | — |

### Critical endpoints — detalle completo

#### `GET /api/llamadas`

- **Auth:** `getServerSession(authOptions)` → si no hay sesión, `apiError("No autorizado", 401)`;
  `!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso denegado", 403)`.
- **Query params:** `?callStatus=<valor>` (opcional; si viene, validar contra `CALL_STATUSES` y
  filtrar; `?callStatus=SIN_ESTADO` no se soporta — filtrar por `null` no es un caso pedido).
  `?q=<texto>` (opcional; `contains insensitive` sobre `company.name` y `Contact.name`).
- **Respuesta 200:** `NextResponse.json(contacts)` donde cada elemento es
  `{ id, name, phone, email, callStatus, company: { id, name, segment } }`, `orderBy: { company: {
  name: "asc" } }`.
- **Errores:** el handler devuelve `apiError("No autorizado", 401)` si `getServerSession` es `null`
  (defensa en profundidad) y `apiError("Acceso denegado", 403)` sin módulo `CRM`. **Comportamiento
  observable sin cookie de sesión:** `withAuth` de `middleware.ts` redirige **307** a
  `/api/auth/signin` antes de llegar al handler — `/api/llamadas` está dentro del matcher, igual
  que toda ruta API del CRM. El `401` del handler sólo se alcanza con un token presente pero
  inválido/stale. Sin 404 (la lista siempre existe, aunque vacía).

#### `PATCH /api/llamadas`

- **Auth:** idéntico a GET.
- **Body:** `{ id: string, callStatus: string | null }`.
- **Validación:** `if (!id) return apiError("id requerido")`. `const CALL_STATUSES =
  ["POR_LLAMAR", "LLAMADA", "SIN_RESPUESTA", "CORREO_CONSEGUIDO"]`. `if (callStatus !== undefined &&
  callStatus !== null && !CALL_STATUSES.includes(callStatus)) return apiError("Estado de gestión
  telefónica inválido")`.
- **Efecto:** `prisma.contact.update({ where: { id }, data: { ...(callStatus !== undefined ? {
  callStatus } : {}) } })`. Sin timestamps del cliente. Sin escritura a `Activity` (la gestión
  telefónica es un estado, no una línea de tiempo — igual que `ContactTemperature`).
- **Respuesta 200:** el contacto actualizado.
- **Errores:** 400 `{ error: "id requerido" }` o `{ error: "Estado de gestión telefónica inválido"
  }`; 401; 403; 404 si `id` no existe (dejar propagar el `P2025` de Prisma como `apiError("Contacto
  no encontrado", 404)` — patrón del repo).

#### `GET /api/cron/outreach` (reescrito)

- **Auth:** `isAuthorized(req)` **intacto** — lee `process.env.CRON_SECRET`, acepta
  `Authorization: Bearer <secret>` o `x-cron-secret`, `return false` si no está configurada; 401
  JSON en fallo.
- **Guard de env legales:** si falta `OUTREACH_PUBLIC_URL` / `OUTREACH_SENDER_LEGAL_NAME` / `_RUT` /
  `_ADDRESS` → **200** con `{ error: "..." }` (config, no reintentar). Intacto.
- **Nueva selección:**
  1. `campaigns = prisma.outreachCampaign.findMany({ where: { isActive: true }, orderBy: {
     createdAt: "asc" } })`. Si 0 → 200 `{ sent: 0, message: "Sin campañas activas" }`.
  2. Por campaña, contar el pool de **empresas** elegibles: `Company` con `isActive: true`,
     `segment: campaign.segment`, **sin `OutreachSend` previo para esa campaña**
     (`outreachSends: { none: { campaignId: campaign.id } }`), **sin gestión telefónica iniciada**
     (`NOT: { contacts: { some: { callStatus: { not: null, notIn: ["POR_LLAMAR"] } } } }`), y con
     **al menos un contacto elegible por correo** (`contacts: { some: { email: { not: null },
     optOut: false, emailStatus: { not: "REBOTADO" } } }`).
  3. `const globalCap = Number(process.env.OUTREACH_DAILY_CAP ?? 25)`. Restar lo ya enviado hoy:
     `enviadosHoy = prisma.outreachSend.count({ where: { sentAt: { gte: inicioDelDiaUTC } } })`.
     `presupuesto = Math.max(0, globalCap - enviadosHoy)`.
  4. `allocateDailyBudget(campaigns.map(c => ({ id: c.id, dailyCap: c.dailyCap })), poolSizes,
     presupuesto)` de `lib/outreach/eligibility.ts` → cuántas empresas toma cada campaña.
  5. Por campaña, traer sus empresas elegibles (`take: asignación`), y por empresa elegir **un**
     contacto con `pickCompanyContact(contactosElegiblesDeLaEmpresa)` (genérico > nominativo >
     menor `createdAt`).
  6. Enviar (jitter, `sendMail`, `OutreachSend` `ENVIADO`/`FALLIDO`, `Activity(type:"EMAIL")`,
     `ensureSystemUser`, `getTemplate(campaign.templateKey)`). Sin cambios acá.
- **Idempotencia:** la query excluye empresas con `OutreachSend` para la campaña
  (`company: { outreachSends: { none: { campaignId } } }`) **más** el `@@unique([campaignId,
  contactId])` como respaldo duro de BD.
- **Respuesta 200:** `{ campaigns, sent, failed, results }`, igual forma que hoy.

### Interfaces held constant

- La **query de elegibilidad** del cron sólo **gana** condiciones (1 por empresa, exclusión por
  gestión telefónica, tope global). No relaja ninguna de las 5 existentes (`email != null`,
  `optOut = false`, `emailStatus != REBOTADO`, `company.isActive`, `company.segment ==
  campaign.segment`, sin `OutreachSend` previo).
- `isAuthorized(req)` del cron — sin cambios.
- Forma de `apiError` — sin cambios.
- `/api/outreach/unsubscribe?t=<token>` — **pública por token, sin login** (ahora sí alcanzable
  tras el fix del matcher en S1). No se toca su código; sólo se la deja pasar el middleware.
- `OutreachSend @@unique([campaignId, contactId])` — respaldo, no se cambia.

---

## 6. Frontend Architecture

### Routes

| Route | Página | Data source | Auth |
|---|---|---|---|
| `/admin/crm/llamadas` | `app/(admin)/admin/crm/llamadas/page.tsx` | Server component: `prisma.contact.findMany({ where: { phone: { not: null } }, include: { company: { select: { id, name, segment } } }, orderBy: { company: { name: "asc" } } })` — prisma directo, sin `fetch` | `middleware.ts` rama `/admin/crm` (redirige a `/login` sin `hasModuleAccess('CRM')`, ADMIN pasa) + el shell `(admin)/layout.tsx` |

### Rendering strategy

Server component por defecto (como el resto del CRM). La data se resuelve en el `async function
getLlamadas()` local. El componente cliente `components/crm/ListaLlamadas.tsx` (`'use client'`)
maneja búsqueda + filtro con `useState`/`useMemo` y navega con `useRouter().push()`. Sin
revalidación especial; `router.refresh()` tras cada PATCH de estado.

### Component hierarchy

```
app/(admin)/admin/crm/llamadas/page.tsx        (server) — getLlamadas() + header + <ListaLlamadas data=… />
  components/crm/ListaLlamadas.tsx             (client) — useState(search), useState(callStatusFilter), useMemo
    components/crm/ui/table                    (Table/TableHeader/TableBody/TableRow/TableCell)
    fila por contacto:
      empresa · contacto · teléfono · <CallStatusSelect id contactId callStatus />   (client, in-line en <TableCell>)
    <Button size="sm" variant={activo ? "default" : "outline"}> por filtro
components/ui/CallStatusBadge.tsx              (puro) — pill read-only; se usa en la ficha del contacto (opcional) y como fallback visual
```

### State management

Server state: la lista viene del server component (prisma directo). Client state: sólo el término
de búsqueda y el filtro de estado en `ListaLlamadas` (`useState`). Sin librería de estado global.
El PATCH de `CallStatusSelect` es fetch + `router.refresh()` (sin optimistic update — el repo no lo
usa en el CRM).

### Loading, empty, and error states

- **Loading:** `CallStatusSelect` muestra un `SpinnerGap` `animate-spin` en lugar del control
  mientras el PATCH está en vuelo (patrón `CompletarActividadButton`).
- **Empty:** si `getLlamadas()` devuelve 0 filas (o el filtro no matchea) → `<div className="crm-card
  text-center py-16">` con un ícono y "No hay contactos con teléfono para llamar."
- **Error:** el PATCH que falla → `toast.error("No se pudo actualizar el estado")` (sonner, ya
  montado en `app/(admin)/admin/crm/layout.tsx`) y el `<Select>` vuelve a su valor previo (no queda
  en loading).

---

## 7. Design System

**No se re-deriva.** El módulo CRM ya tiene su sistema: tokens `crm-*` en `tailwind.config.ts
theme.extend.colors.crm` y composites `@apply` en `app/(admin)/admin/crm/crm.css` (`.crm-card`,
`.crm-btn-*`, `.crm-input`). Los primitivos de `components/crm/ui/*` (`button`, `table`, `select`,
`dialog`, `badge`, …) están construidos sobre `@base-ui/react` y temados sólo con tokens `crm-*`.

### Tokens que usa el cambio

`CallStatusBadge.tsx` se **clona de `components/ui/TemperatureBadge.tsx`** — mismo `Record<Enum,
{ label, className, dot }>`, misma prop `size: 'sm' | 'md'`, mismo fallback al primer valor.
Mapeo propuesto (el builder ajusta a tokens que existan en `theme.extend.colors.crm`):

| `callStatus` | Fondo / texto (tokens `crm-*`) |
|---|---|
| `POR_LLAMAR` | `bg-crm-secondary text-crm-muted` + punto `bg-crm-muted` |
| `LLAMADA` | `bg-crm-temp-tibio-bg text-crm-temp-tibio` + punto `bg-crm-temp-tibio` |
| `SIN_RESPUESTA` | `bg-crm-destructive/10 text-crm-destructive` + punto `bg-crm-destructive` |
| `CORREO_CONSEGUIDO` | `bg-crm-success/10 text-crm-success` + punto `bg-crm-success` |

**Contraste:** el badge hereda el sistema `crm-temp-*` ya en uso (el CRM apunta a WCAG 2.2 AA). El
color **nunca** es el único portador del dato — el badge lleva `label` de texto. No se agregan
tokens nuevos: si `crm-success` / `crm-muted` no existen exactamente, usar el token `crm-*` más
cercano que sí esté definido en `tailwind.config.ts` y anotarlo en el `.spec.md` del componente.

### Component style

Escritorio, denso, sobrio — el estilo del CRM (referencia `auto-crm`). El `<Select>` in-line usa
`components/crm/ui/select` con `SelectTrigger` `size="sm"` (portaliza su content, `z-50` — cabe en
un `<TableCell>` sin romper overflow). Filtros = botones segmentados reales, no un `<select>`
nativo.

### Motion

Sin animación nueva. El `SpinnerGap animate-spin` del loading ya respeta el sistema. No se agregan
transiciones.

---

## 8. Authentication & Authorization

### Provider y rationale

NextAuth v4 (credenciales + bcrypt, JWT, `maxAge` 8h) — ya es el repo. El callback `jwt` re-lee
`role`/`moduleAccess`/`isActive` desde la BD en cada renovación. No se toca.

### Route protection

| Superficie | Regla | Enforced en |
|---|---|---|
| `/admin/crm/llamadas` | `hasModuleAccess(user, 'CRM')` (ADMIN pasa) o redirect a `/login` | `middleware.ts` rama `else if (pathname.startsWith("/admin/crm"))` — **ya cubre la subruta nueva sin tocar el matcher** |
| `GET/PATCH /api/llamadas` | sesión + `hasModuleAccess(session.user, 'CRM')` → si no, `apiError(…, 401/403)` JSON | dentro del handler `app/api/llamadas/route.ts` (el API del CRM se gatea en el handler, no en middleware) |
| `GET /api/cron/outreach` | `Authorization: Bearer $CRON_SECRET` o `x-cron-secret` | `isAuthorized(req)` en el handler |
| `GET /api/outreach/unsubscribe?t=` | pública por token | el handler valida el token; **ahora alcanzable** tras el fix del matcher |

**Enforcement rule:** autorización server-side en cada request. Un botón oculto no es un permiso.

### El fix del matcher (prerrequisito — S1)

`middleware.ts` hoy: `matcher: [..., "/api/((?!auth|posiciones|webhooks).*)"]`. `withAuth` de
`next-auth` v4, sin `callbacks.authorized` custom más allá de `({ token }) => !!token`.

**Verificado dos veces:**
1. El comentario del propio `middleware.ts` (líneas 77-89, commit `e288f80`) lo declara "verificado
   en vivo": *"GET /api/finanzas/algo sin cookie de sesión responde 307 a /api/auth/signin, no 401
   JSON."*
2. El `stack-researcher` (2026-09-09) lo confirmó contra la fuente publicada
   `next-auth@4.24.15/next/middleware.js`: cuando el check de autorización falla, el código hace
   `NextResponse.redirect(signInUrl)` **sin argumento de status → 307**, para **toda** ruta del
   matcher, incluidas `/api/*`. **No hay rama** que devuelva 401/JSON para APIs.

**Consecuencia:** el cron de Vercel (`Authorization: Bearer $CRON_SECRET`, **sin** cookie de
sesión) recibe 307 y su handler nunca corre. El envío diario **nunca ha ejecutado de verdad**
(enmascarado porque las 2 campañas están `isActive=false`). Y el **link de baja está roto** para un
destinatario deslogueado → incumple Ley 19.496 art. 28 B.

**Fix (S1):** `matcher` →
`"/api/((?!auth|posiciones|webhooks|cron|outreach/unsubscribe).*)"`. El `stack-researcher` confirma
que el matcher editado sigue sin tocar `/_next/`, assets ni `/api/auth`. Toca un archivo compartido
por los 4 módulos, pero es **aditivo puro** (agrega exclusiones, no cambia el comportamiento para
Operaciones/CRM/Inventario/Finanzas). La autenticación del cron pasa a vivir **sólo** en su
`isAuthorized(req)` (que ya existía).

---

## 9. BUILD ORDER

12 pasos, 2 épicas de 6. Cada paso: **Do** / **Done when** (EARS `WHEN … THE SYSTEM SHALL …`,
observable) / **Verify** (bash literal, cada línea sale 0 cuando el paso está correcto) /
**Checkpoint** (`git add -A && git commit` + `git tag step-NN-<slug>`).

Whitelist de comandos de Verify: `npm run typecheck` · `npm run test` · `npx vitest run
lib/<x>.test.ts` · `npm run build` · `npm run db:push` · `npx prisma validate` · `npx prisma
generate` · `test -f/-s <ruta>` · un `grep` · `export` (para cargar env de `.env.local` antes de un
comando Prisma) · `mkdir -p backups` · `pg_dump` (respaldo de S2, ver §4 Migrations). **`next lint`
nunca es compuerta.**

### Step map

| # | Paso | Depende de | Toca | Portón |
|---|---|---|---|---|
| 1 | Matcher del middleware (prerrequisito) | — | `middleware.ts` | `grep` del matcher + `typecheck` + `build` |
| 2 | Schema: `INDUSTRIA` + `CallStatus` + `Contact.callStatus` + doc de env | 1 | `prisma/schema.prisma`, `VARIABLES_ENTORNO.md` | `prisma validate` + `db:push` + `generate` + `typecheck` |
| 3 | `lib/outreach/radar.ts` — parseo + normalización | 2 | `lib/outreach/radar.ts`, `radar.test.ts` | `vitest run radar.test.ts` + `typecheck` |
| 4 | `lib/outreach/radar.ts` — clasificación + consolidación | 3 | `lib/outreach/radar.ts`, `radar.test.ts` | `vitest run radar.test.ts` + `typecheck` |
| 5 | `scripts/import-radar-pallets.ts` + spec + alias | 4 | `scripts/import-radar-pallets.ts`, `.spec.md`, `package.json` | `typecheck` + `build` + `grep` alias + `test -f` spec |
| 6 | Plantilla `industria.ts` + registro + tests | 2 | `lib/outreach/templates/{industria.ts,index.ts,render.test.ts}` | `vitest run render.test.ts` + `typecheck` + `build` |
| 7 | Seed 3ª campaña + `SEGMENT_LABEL` | 6 | `scripts/seed-outreach-campaigns.ts`, `app/(admin)/admin/crm/outreach/page.tsx` | `grep` × 2 + `typecheck` + `build` |
| 8 | `lib/outreach/eligibility.ts` — reparto + selección | 2 | `lib/outreach/eligibility.ts`, `eligibility.test.ts` | `vitest run eligibility.test.ts` + `typecheck` |
| 9 | Reescritura del cron | 6, 8 | `app/api/cron/outreach/route.ts`, `route.spec.md`, `PROSPECCION_OUTREACH.md` | `grep` × 2 + `typecheck` + `build` |
| 10 | `app/api/llamadas/route.ts` (GET + PATCH) | 2 | `app/api/llamadas/route.ts`, `route.spec.md` | `grep` × 2 + `test -f` + `typecheck` + `build` |
| 11 | `CallStatusBadge` + `CallStatusSelect` | 10 | `components/ui/CallStatusBadge.tsx` (+spec), `components/crm/CallStatusSelect.tsx` (+spec) | `test -f` × 2 + `grep` + `typecheck` + `build` |
| 12 | Vista de lista de llamadas + nav | 11 | `app/(admin)/admin/crm/llamadas/{page.tsx,page.spec.md}`, `components/crm/ListaLlamadas.tsx`, `components/ui/AdminSidebar.tsx` | `grep` + `test -f` × 2 + `typecheck` + `build` |

Orden: prerrequisito → data layer → la rebanada de ingesta completa (radar puro → importador) →
la campaña INDUSTRIA (plantilla → seed) → el motor de envío (eligibility puro → cron) → la
superficie de llamadas (API → componentes → página). El paso 1 corre `npm run build` en su Verify,
que ejercita el entry point (la app Next) — satisface la regla 13.

---

### Step 1 — Matcher del middleware (prerrequisito)

**Do**

En `middleware.ts`, cambiar el `config.matcher` — sólo la línea de `/api/`:

```
"/api/((?!auth|posiciones|webhooks).*)"
```

por

```
"/api/((?!auth|posiciones|webhooks|cron|outreach/unsubscribe).*)"
```

Nada más en ese archivo. No se toca `withAuth`, ni las ramas de la función, ni `callbacks`.
`middleware.ts` no tiene `.spec.md` (es un archivo de raíz sin él en el repo — no crear uno).

**Done when**

- [ ] WHEN `grep -E "cron\|outreach/unsubscribe" middleware.ts` runs THE SYSTEM SHALL exit 0 (el nuevo negative-lookahead está en el archivo).
- [ ] WHEN `grep -E "\\(\\?!auth\\|posiciones\\|webhooks\\|cron\\|outreach/unsubscribe\\)" middleware.ts` runs THE SYSTEM SHALL exit 0 (el matcher quedó con exactamente esas 5 exclusiones, ni más ni menos).
- [ ] WHEN `npm run typecheck` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `npm run build` runs THE SYSTEM SHALL exit 0 (la app compila con el matcher nuevo).

**Verify**

```bash
grep -Eq "cron\|outreach/unsubscribe" middleware.ts                                   # expect: exit 0
grep -Eq "\(\?!auth\|posiciones\|webhooks\|cron\|outreach/unsubscribe\)" middleware.ts # expect: exit 0
npm run typecheck                                                                      # expect: exit 0
npm run build                                                                          # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 1: excluir /api/cron y /api/outreach/unsubscribe del matcher de middleware"
git tag step-01-middleware-matcher
# rollback si el paso 2 sale mal: git reset --hard step-01-middleware-matcher
```

---

### Step 2 — Schema: `INDUSTRIA` + `CallStatus` + `Contact.callStatus` + doc de env

**Do**

En `prisma/schema.prisma`:
- Agregar `INDUSTRIA` como **último** valor del bloque `enum ProspectSegment` (después de `OTRO`).
- Agregar, junto a `enum ContactTemperature`:
  ```prisma
  enum CallStatus {
    POR_LLAMAR
    LLAMADA
    SIN_RESPUESTA
    CORREO_CONSEGUIDO
  }
  ```
- En `model Contact`: agregar el campo `callStatus  CallStatus?` (nullable, sin default) y
  `@@index([callStatus])`.

En `VARIABLES_ENTORNO.md`: documentar `OUTREACH_DAILY_CAP` como **usada por `/api/cron/outreach`**
(antes estaba listada pero ningún código la leía; ahora la lee el cron reescrito en S9), default
25. Corregir la sección de base de datos que hoy muestra `DATABASE_URL="file:./dev.db"` (SQLite):
el repo usa PostgreSQL/Neon con `DATABASE_URL` (pooled) y `DIRECT_URL` (directa) — dejar el
ejemplo con ese formato y una nota de que la directa no lleva `-pooler` en el host.

Luego, aplicar el schema con la recipe de §4 Migrations (`export` de `DATABASE_URL`/`DIRECT_URL`
desde `.env.local`, `pg_dump` verificado, `npm run db:push`, `npx prisma generate`). El `db push`
**sólo** agrega `INDUSTRIA` — no escribe ninguna fila con ese valor (regla de Postgres: valor de
enum recién agregado no se usa en la misma transacción).

**Done when**

- [ ] WHEN `grep -q "INDUSTRIA" prisma/schema.prisma` runs THE SYSTEM SHALL exit 0 y el valor está dentro del bloque `enum ProspectSegment` como último valor.
- [ ] WHEN `grep -q "enum CallStatus" prisma/schema.prisma` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `grep -q "callStatus  *CallStatus?" prisma/schema.prisma` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `npx prisma validate` runs (con `DATABASE_URL`/`DIRECT_URL` exportadas) THE SYSTEM SHALL exit 0.
- [ ] WHEN `npm run db:push` runs THE SYSTEM SHALL exit 0 **sin** pedir `--accept-data-loss`.
- [ ] WHEN `npx prisma generate` y luego `npm run typecheck` corren THE SYSTEM SHALL exit 0 (el `@prisma/client` regenerado reconoce `Contact.callStatus` y `ProspectSegment.INDUSTRIA`).
- [ ] WHEN `grep -q "OUTREACH_DAILY_CAP" VARIABLES_ENTORNO.md` runs THE SYSTEM SHALL exit 0.

**Verify**

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
grep -q "INDUSTRIA" prisma/schema.prisma            # expect: exit 0
grep -q "enum CallStatus" prisma/schema.prisma      # expect: exit 0
grep -Eq "callStatus +CallStatus\?" prisma/schema.prisma   # expect: exit 0
grep -q "OUTREACH_DAILY_CAP" VARIABLES_ENTORNO.md   # expect: exit 0
npx prisma validate                                 # expect: exit 0
mkdir -p backups && pg_dump "$DIRECT_URL" > backups/pre-radar-pallets.sql
test -s backups/pre-radar-pallets.sql               # expect: exit 0 — respaldo no vacío
npm run db:push                                      # expect: exit 0, sin --accept-data-loss
npx prisma generate                                 # expect: exit 0
npm run typecheck                                    # expect: exit 0
```

> **La cadena `pg_dump` → `npm run db:push` → `npx prisma generate` necesita `.env.local` con
> credenciales reales de Neon y acceso de red.** Es el único gate de §9 que no corre en una máquina
> pelada — igual que la corrida real del importador en S5. El builder corre S2 desde el entorno
> local de Claudio (Git Bash + `.env.local`), donde las credenciales existen. Los `grep` de arriba y
> `npx prisma validate` (que sólo valida el archivo, no conecta — pero igual exige las env vars
> exportadas) sí corren en cualquier lado.

**Checkpoint**

```bash
git add -A && git commit -m "step 2: schema — INDUSTRIA, enum CallStatus, Contact.callStatus + doc OUTREACH_DAILY_CAP"
git tag step-02-schema-radar
# nota: backups/ está en .gitignore — el commit no lo incluye
git check-ignore -q backups/pre-radar-pallets.sql; test $? -eq 0   # expect: exit 0 — backups/ ignorado
# rollback: git reset --hard step-02-schema-radar  (el db push es aditivo; reversa dura = restaurar backups/pre-radar-pallets.sql)
```

---

### Step 3 — `lib/outreach/radar.ts` — parseo + normalización

**Do**

Nuevo `lib/outreach/radar.ts`. Sin `fs`, sin Prisma. Imports relativos: `import { clean, parseCsv }
from "./prospects"`. Exporta:

- `RADAR_SHEETS` — constante `{ PROSPECTOS: 0, TOP20: 1, TOP25: 2 }` (0 = mayor prioridad de
  desempate).
- `interface RadarRow { empresa: string; telefonos: string[]; email: string | null; tipo: string |
  null; perfilOperacional: string | null; evidenciaOperacional: string | null; proximoPaso: string
  | null; observacion: string | null; sheetTag: keyof typeof RADAR_SHEETS }`.
- `HEADER_MAP` — objeto que mapea el nombre de columna del CSV a la clave de `RadarRow`. Basado en
  la spec §3/§4: `"Nombre" → empresa`, `"Teléfono" → telefonos`, `"Correo" → email`, `"Tipo" →
  tipo`, `"Perfil operacional" → perfilOperacional`, `"Evidencia operacional" →
  evidenciaOperacional`, `"Próximo paso" → proximoPaso`, `"Observación" → observacion`. Aceptar
  también variantes sin tilde y en minúscula (`"telefono"`, `"correo"`, etc.). **El usuario ajusta
  este mapa si su export usa otros nombres — el `.spec.md` de S5 lo documenta.**
- `parseRadarSheet(csvText: string, sheetTag: keyof typeof RADAR_SHEETS): RadarRow[]` — usa
  `parseCsv` de `./prospects` (RFC4180 + BOM), aplica `HEADER_MAP`, `clean()` a cada valor (`"sin
  dato"` → `null`), `splitPhones()` a la celda de teléfono, descarta filas sin `empresa`.
- `splitPhones(raw: string | null): string[]` — divide por `/`, `;`, `,`, salto de línea y `" y "`;
  a cada trozo `clean()` + trim; descarta vacíos. `null` → `[]`.
- `normalizeCompanyName(name: string): string` — `toLowerCase()` → `normalize("NFD").replace(/[\u0300-\u036f]/g,
  "")` (sin diacríticos) → colapsar espacios internos a uno (`replace(/\s+/g, " ")`) → trim →
  quitar, **sólo si es el token final**, uno de: `s.a`, `s.a.`, `sa`, `spa`, `s.p.a`, `ltda`,
  `ltda.`, `limitada`, `sac`, `s.a.c`, `eirl`, `e.i.r.l` (comparar el último token en minúscula sin
  puntuación) → trim de nuevo. **Match exacto** tras normalizar — el consumidor compara strings
  igual, nunca substring.

Nuevo `lib/outreach/radar.test.ts` con casos: celda `"sin dato"` → `null`; `splitPhones("+56 2 2333
2126 / +56 9 9689 7446")` → `["+56 2 2333 2126", "+56 9 9689 7446"]`;
`normalizeCompanyName("Transportes Peñaflor Ltda.")` → `"transportes peñaflor"`;
`normalizeCompanyName("NOVOFARMA  SERVICE   S.A.")` → `"novofarma service"` **≠**
`normalizeCompanyName("Laboratorio Novofarma Service S.A.")` → `"laboratorio novofarma service"`.

**Done when**

- [ ] WHEN `normalizeCompanyName("Transportes Peñaflor Ltda.")` se evalúa THE SYSTEM SHALL devolver `"transportes peñaflor"`.
- [ ] WHEN `normalizeCompanyName("Novofarma Service S.A.")` y `normalizeCompanyName("Laboratorio Novofarma Service S.A.")` se evalúan THE SYSTEM SHALL devolver strings distintos (no se fusionan).
- [ ] WHEN `splitPhones("+56 2 2333 2126 / +56 9 9689 7446")` se evalúa THE SYSTEM SHALL devolver un array de 2 strings, cada uno sin espacios sobrantes.
- [ ] WHEN una celda vale `"sin dato"` THE SYSTEM SHALL producir `null` en el campo correspondiente.
- [ ] WHEN `parseRadarSheet(csv, "PROSPECTOS")` recibe un CSV con una fila sin nombre de empresa THE SYSTEM SHALL omitir esa fila.
- [ ] WHEN `npx vitest run lib/outreach/radar.test.ts` runs THE SYSTEM SHALL exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/radar.test.ts   # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                            # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 3: lib/outreach/radar.ts — parseo, splitPhones, normalizeCompanyName + tests"
git tag step-03-radar-parse
```

---

### Step 4 — `lib/outreach/radar.ts` — clasificación + consolidación

**Do**

Editar `lib/outreach/radar.ts` — agregar:

- `classifySegment(tipo: string | null, perfil: string | null, evidencia: string | null):
  "LOGISTICA" | "FARMACEUTICA" | "INDUSTRIA"` — concatena los 3 textos, `toLowerCase` + sin
  diacríticos, y aplica las keywords de la spec §6.2:
  - contiene `farmaceutico` / `laboratorio` / `drogueria` / `medicamento` → `"FARMACEUTICA"`
  - contiene `operador logistico` / `almacenamiento` / `deposito` / `bodega` / `transporte` →
    `"LOGISTICA"`
  - cualquier otra cosa → `"INDUSTRIA"` (fallback).
  Farmacéutica se evalúa antes que logística (si un texto tiene ambas, gana farmacéutica — es el
  segmento con la propuesta de valor más específica).
- `consolidateRows(rows: RadarRow[]): RadarRow[]` — agrupa por `normalizeCompanyName(row.empresa)`;
  dentro de cada grupo, el ganador es la fila con **más campos con valor** entre: `telefonos.length
  > 0`, `email != null`, `tipo != null`, `perfilOperacional != null`, `evidenciaOperacional !=
  null`, `proximoPaso != null`, `observacion != null`. Empate → menor `RADAR_SHEETS[sheetTag]`
  (Prospectos verificados 0 < TOP20 1 < TOP25 2).
- `interface RadarProspect` — la forma que consume el importador: `{ empresa: string; commune:
  null; category: string | null; segment: "LOGISTICA" | "FARMACEUTICA" | "INDUSTRIA"; phone: string
  | null; phonesExtra: string[]; email: string | null; contactName: null; notesParts: { perfil:
  string | null; evidencia: string | null; proximoPaso: string | null; observacion: string | null }
  }`.
- `toRadarProspect(row: RadarRow): RadarProspect` — `category: row.tipo`, `segment:
  classifySegment(row.tipo, row.perfilOperacional, row.evidenciaOperacional)`, `phone:
  row.telefonos[0] ?? null`, `phonesExtra: row.telefonos.slice(1)`, `email: row.email`,
  `contactName: null` (la fuente no trae nombre de persona — el importador cae al nombre de
  empresa), `notesParts: { perfil: row.perfilOperacional, … }`.

Extender `radar.test.ts`: cada rama de `classifySegment` + el fallback; consolidación (gana la fila
con más campos; empate → prioridad de hoja).

**Done when**

- [ ] WHEN un texto contiene `"laboratorio"` THE SYSTEM SHALL clasificar `"FARMACEUTICA"`.
- [ ] WHEN un texto contiene `"bodega"` y ninguna keyword farmacéutica THE SYSTEM SHALL clasificar `"LOGISTICA"`.
- [ ] WHEN un texto no contiene ninguna keyword THE SYSTEM SHALL clasificar `"INDUSTRIA"`.
- [ ] WHEN la misma empresa aparece en 2 hojas con distinto conteo de campos con valor THE SYSTEM SHALL quedarse con la de más campos.
- [ ] WHEN dos filas de la misma empresa empatan en conteo THE SYSTEM SHALL quedarse con la de la hoja de mayor prioridad (`PROSPECTOS` antes que `TOP20` antes que `TOP25`).
- [ ] WHEN `toRadarProspect` recibe una fila con 3 teléfonos THE SYSTEM SHALL poner el primero en `phone` y los otros dos en `phonesExtra`.
- [ ] WHEN `npx vitest run lib/outreach/radar.test.ts` runs THE SYSTEM SHALL exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/radar.test.ts   # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                            # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 4: lib/outreach/radar.ts — classifySegment, consolidateRows, toRadarProspect + tests"
git tag step-04-radar-classify
```

---

### Step 5 — `scripts/import-radar-pallets.ts` + spec + alias

**Do**

Nuevo `scripts/import-radar-pallets.ts` — patrón exacto de `scripts/import-prospects.ts`:

- `loadEnvLocal()` copiado verbatim de `import-prospects.ts` (los scripts `ts-node` no cargan
  `.env.local` solos).
- Lee `data/prospects/raw/radar_prospectos.csv`, `radar_top20.csv`, `radar_top25.csv`. Si falta
  alguno → `throw new Error("No se encontró <path> — exportá las 3 hojas del Radar a CSV UTF-8")`.
- `const rows = [...parseRadarSheet(prospectosCsv, "PROSPECTOS"), ...parseRadarSheet(top20Csv,
  "TOP20"), ...parseRadarSheet(top25Csv, "TOP25")]`. `const consolidated =
  consolidateRows(rows)`. `const prospects = consolidated.map(toRadarProspect)`.
- `findOrCreateCompany(prisma, prospect, allCompaniesByNorm, stats)` — recibe un `Map<string,
  Company>` construido una vez con `prisma.company.findMany({ select: { id, name, segment, website,
  commune, category, address, lat, lng, rating, reviews } })` indexado por
  `normalizeCompanyName(c.name)`. Si existe → `fillData` sólo de campos hoy vacíos (incluido
  `segment` si está `null`), `update` sólo si `Object.keys(fillData).length > 0`. Si no existe →
  `prisma.company.create` y agregar al `Map`. **Jamás pisa** un campo con valor.
- `findOrCreateContact(prisma, companyId, prospect, stats)` — `findFirst({ where: { companyId, OR:
  [ ...(prospect.email ? [{ email: { equals: prospect.email, mode: "insensitive" } }] : []),
  ...(prospect.phone ? [{ phone: prospect.phone }] : []) ] } })`. Si matchea → `fillData` de
  `email`/`phone`/`notes` vacíos + `callStatus` a `POR_LLAMAR` **sólo si** `existing.callStatus ===
  null` y `prospect.phone && !prospect.email`. Si **no** matchea → `create`:
  - `name: prospect.contactName ?? prospect.empresa`
  - `source: "IMPORT"`, `temperature: "FRIO"`
  - `callStatus: prospect.phone && !prospect.email ? "POR_LLAMAR" : null`
  - `notes`: join con `\n` de las líneas que existan, en este orden: `"Origen: Radar de Clientes
    Pallets V7"`, `"Teléfonos adicionales: " + prospect.phonesExtra.join(", ")` (si hay), `"Perfil
    operacional: " + …`, `"Evidencia operacional: " + …`, `"Próximo paso: " + …`, `"Observación: "
    + …` (los de `notesParts` que no sean `null`).
  - **Si el email entrante no matchea ningún contacto de la empresa pero la empresa ya tiene otros
    contactos, se crea uno nuevo** (spec §5: "correo distinto al guardado → conservar ambos").
- `interface ImportStats { companiesCreated, companiesUpdated, contactsCreated, contactsEnriched,
  phoneOnlyMarked, skippedNoContactInfo, dedupedWithinBatch, bySegment: { LOGISTICA: number,
  FARMACEUTICA: number, INDUSTRIA: number } }` — impreso al final con `console.log` en español.
- Flag `--dry-run` (`process.argv.includes("--dry-run")`) — no escribe nada, imprime el plan
  (cuántas empresas se crearían / enriquecerían por segmento) y los stats.
- `main().catch((e) => { console.error(e); process.exitCode = 1; })`.

Nuevo `scripts/import-radar-pallets.spec.md` — formato de `scripts/import-prospects.spec.md`: Qué
hace / Por qué script y no endpoint / Decisiones de diseño (dedup por nombre normalizado sin
RUT/`placeId`; consolidación entre hojas; `--dry-run` primero; `HEADER_MAP` ajustable) / Cómo
correrlo (`npm run import:radar -- --dry-run`, revisar, luego `npm run import:radar`) / Salida
esperada ("correr dos veces seguidas: `companiesCreated: 0`, `contactsCreated: 0`") / Qué NO hace
(no envía correos, no activa campañas, no puntúa) / Siguiente paso.

En `package.json` `scripts`: agregar
`"import:radar": "ts-node --project tsconfig.scripts.json scripts/import-radar-pallets.ts"`.

**Done when**

- [ ] WHEN `npm run typecheck` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `npm run build` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `grep -q '"import:radar"' package.json` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `test -f scripts/import-radar-pallets.spec.md` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `grep -q "dry-run" scripts/import-radar-pallets.ts` runs THE SYSTEM SHALL exit 0 (el flag está manejado).
- [ ] WHEN `grep -q "bySegment" scripts/import-radar-pallets.ts` runs THE SYSTEM SHALL exit 0 (el desglose por segmento está en `ImportStats`).
- [ ] WHEN `grep -q "POR_LLAMAR" scripts/import-radar-pallets.ts` runs THE SYSTEM SHALL exit 0 (marca phone-only).

**Verify**

```bash
npm run typecheck                                     # expect: exit 0
npm run build                                         # expect: exit 0
grep -q '"import:radar"' package.json                 # expect: exit 0
test -f scripts/import-radar-pallets.spec.md          # expect: exit 0
grep -q "dry-run" scripts/import-radar-pallets.ts     # expect: exit 0
grep -q "bySegment" scripts/import-radar-pallets.ts   # expect: exit 0
grep -q "POR_LLAMAR" scripts/import-radar-pallets.ts  # expect: exit 0
```

> La corrida real (`npm run import:radar -- --dry-run` y luego sin flag) necesita `.env.local` con
> Neon y los 3 CSV en `data/prospects/raw/`. Es un paso **manual post-build** — ver el post-build
> launch checklist en §12. No es un `verify`.

**Checkpoint**

```bash
git add -A && git commit -m "step 5: scripts/import-radar-pallets.ts + spec + alias import:radar"
git tag step-05-importer
```

---

### Step 6 — Plantilla `industria.ts` + registro + tests

**Do**

Nuevo `lib/outreach/templates/industria.ts` — espejo **exacto** de `logistica.ts`:

```ts
import {
  ProspectEmailInput,
  SenderFooterInfo,
  RenderedEmail,
  renderGreeting,
  assembleEmail,
  escapeHtml,
} from "./render";

// Segmento INDUSTRIA (fallback de classifySegment; PROSPECCION_OUTREACH.md §7,
// spec IMPORTACION_RADAR_PALLETS.md §6.3): alimentos, papel/cartón, insumos
// médicos, retail, manufactura. Dolor: una planta acumula pallets rotos y
// fuera de medida que ocupan bodega y cuestan retirar. Oferta: retiro de los
// dañados + reposición con pallets reparados y estandarizados certificados,
// sin comprar madera nueva. Gancho: convierte un costo de disposición en un
// canje y deja el parque de pallets parejo — sin el ángulo de trazabilidad
// (FARMACEUTICA) ni el de operador logístico puro (LOGISTICA).
export function renderIndustriaEmail(
  input: ProspectEmailInput,
  footer: SenderFooterInfo
): RenderedEmail {
  const greeting = renderGreeting(input.contacto);
  const comunaLine = input.comuna ? ` en ${input.comuna}` : "";

  const subject = `Pallets fuera de norma en su planta${comunaLine} — los retiramos y reponemos con reparados certificados`;

  const bodyHtml = `
    <p>${escapeHtml(greeting)},</p>
    <p>
      Le escribo de Coopera Pro. En una operación como la de
      <strong>${escapeHtml(input.empresa)}</strong> los pallets rotos y fuera de
      medida se van acumulando${comunaLine ? escapeHtml(comunaLine) : ""} — ocupan
      bodega y cuesta plata sacarlos.
    </p>
    <p>
      Nosotros retiramos los dañados y los reponemos con pallets reparados y
      estandarizados, certificados — sin que tenga que comprar madera nueva. Un
      costo de disposición pasa a ser un canje, y su parque de pallets queda
      parejo.
    </p>
    <p>
      Si le hace sentido, coordinamos una visita corta para ver el volumen y
      cotizar.
    </p>
  `.trim();

  const bodyText = [
    `${greeting},`,
    "",
    `Le escribo de Coopera Pro. En una operación como la de ${input.empresa} los pallets rotos y fuera de medida se van acumulando${comunaLine} — ocupan bodega y cuesta plata sacarlos.`,
    "",
    "Nosotros retiramos los dañados y los reponemos con pallets reparados y estandarizados, certificados — sin que tenga que comprar madera nueva. Un costo de disposición pasa a ser un canje, y su parque de pallets queda parejo.",
    "",
    "Si le hace sentido, coordinamos una visita corta para ver el volumen y cotizar.",
  ].join("\n");

  return assembleEmail(subject, bodyHtml, bodyText, footer);
}
```

Editar `lib/outreach/templates/index.ts`: `import { renderIndustriaEmail } from "./industria";` +
entrada `"industria-v1": renderIndustriaEmail,` en `TEMPLATES`.

Editar `lib/outreach/templates/render.test.ts`: `describe("plantilla industria")` espejo del de
segmento — saludo con fallback (`contacto: null` → `"Estimados"`, sin `"sin dato"` / `"null"` /
`"{{"` en `html` ni `text`); comuna `null` no deja el literal `"null"` en el texto; el `html`
**no** contiene `<img`; el `subject` **no** contiene `"GRATIS"`; el pie legal (razón social + RUT +
link de baja) está presente vía `assembleEmail`. Extender el `describe` del registro para que
`getTemplate("industria-v1")` resuelva a `renderIndustriaEmail`.

**Done when**

- [ ] WHEN `getTemplate("industria-v1")` se llama THE SYSTEM SHALL devolver `renderIndustriaEmail`.
- [ ] WHEN `renderIndustriaEmail({ empresa: "X", comuna: null, rubro: null, contacto: null }, footer)` se llama THE SYSTEM SHALL producir un saludo `"Estimados"` y ningún `"sin dato"` / `"null"` / `"{{"` en `html` ni `text`.
- [ ] WHEN se inspecciona el `html` producido THE SYSTEM SHALL no contener `<img`.
- [ ] WHEN se inspecciona el `subject` producido THE SYSTEM SHALL no contener `"GRATIS"`.
- [ ] WHEN el pie se arma THE SYSTEM SHALL contener `footer.legalName`, `footer.rut` y `footer.unsubscribeUrl`.
- [ ] WHEN `npx vitest run lib/outreach/templates/render.test.ts` runs THE SYSTEM SHALL exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/templates/render.test.ts   # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                                       # expect: exit 0
npm run build                                           # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 6: plantilla industria-v1 + registro + tests de render"
git tag step-06-industria-template
```

---

### Step 7 — Seed 3ª campaña + `SEGMENT_LABEL`

**Do**

Editar `scripts/seed-outreach-campaigns.ts` — agregar como 3ª entrada del array `CAMPAIGNS`:

```ts
{
  name: "Outreach frío — Industria",
  segment: "INDUSTRIA" as const,
  subject:
    "Pallets fuera de norma en su planta — los retiramos y reponemos con reparados certificados",
  templateKey: "industria-v1",
},
```

El `create` del script ya propaga `pdfBlobUrl` (el mismo `OUTREACH_PDF_BLOB_URL`) + `isActive:
false`. No se toca nada más del script.

Editar `app/(admin)/admin/crm/outreach/page.tsx` — agregar `INDUSTRIA: "Industria"` al objeto
`SEGMENT_LABEL` (junto a `LOGISTICA` / `FARMACEUTICA` / `OTRO`).

**Done when**

- [ ] WHEN `grep -q '"industria-v1"' scripts/seed-outreach-campaigns.ts` runs THE SYSTEM SHALL exit 0 y la clave está dentro del array `CAMPAIGNS`.
- [ ] WHEN `grep -Eq 'INDUSTRIA:\s*"Industria"' "app/(admin)/admin/crm/outreach/page.tsx"` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `npm run typecheck` runs THE SYSTEM SHALL exit 0 (`segment: "INDUSTRIA" as const` compila — el enum ya tiene el valor tras S2).
- [ ] WHEN `npm run build` runs THE SYSTEM SHALL exit 0.

**Verify**

```bash
grep -q '"industria-v1"' scripts/seed-outreach-campaigns.ts                       # expect: exit 0
grep -Eq 'INDUSTRIA:\s*"Industria"' "app/(admin)/admin/crm/outreach/page.tsx"     # expect: exit 0
npm run typecheck                                                                 # expect: exit 0
npm run build                                                                     # expect: exit 0
```

> `npm run seed:outreach-campaigns` (crea la fila real, `isActive:false`) es **manual post-build**
> — necesita Neon. Ver §12.

**Checkpoint**

```bash
git add -A && git commit -m "step 7: seed de la campaña Industria + INDUSTRIA en SEGMENT_LABEL del panel"
git tag step-07-seed-industria
```

---

### Step 8 — `lib/outreach/eligibility.ts` — reparto + selección

**Do**

Nuevo `lib/outreach/eligibility.ts`. Sin Prisma, sin `fs`. **`GENERIC_PREFIXES` es privado de
`prospects.ts` (no está exportado)** — replicar el array como `const` local en `eligibility.ts`:
`["contacto", "info", "ventas", "contact", "sac", "atencion", "hola"]`. Exporta:

- `allocateDailyBudget(campaigns: { id: string; dailyCap: number }[], poolSizes: Record<string,
  number>, globalCap: number): Record<string, number>` — reparto **proporcional al pool** de cada
  campaña. Algoritmo: `total = sum(poolSizes)`. Si `total <= globalCap` → cada campaña toma
  `min(poolSizes[id], dailyCap)`. Si `total > globalCap` → asignar `floor(globalCap * poolSizes[id]
  / total)` a cada una, cap a `min(dailyCap, poolSizes[id])`; repartir el remanente (por
  redondeo + caps) de a 1, en orden de mayor pool restante, hasta agotar `globalCap` o los pools.
  La suma del resultado es `min(globalCap, total, sum(min(dailyCap, pool)))`.
- `pickCompanyContact(contacts: { id: string; email: string; createdAt: Date }[]): string | null` —
  devuelve el `id` del contacto elegido: primero el que tenga prefijo local (antes del `@`) en el
  array local de prefijos genéricos; si hay varios genéricos, el de menor `createdAt`; si no hay
  genéricos, el de menor `createdAt` global. `[]` → `null`.
- `isCompanyPhoneManaged(contacts: { callStatus: string | null }[]): boolean` — `true` si algún
  contacto tiene `callStatus != null && callStatus !== "POR_LLAMAR"`.

Nuevo `lib/outreach/eligibility.test.ts`: reparto (proporcional; respeta `dailyCap`; suma ≤ global;
reasignación de remanente; pool 0 → 0 y su cuota va a las demás); selección (genérico gana; entre
genéricos gana el más antiguo; sin genéricos gana el más antiguo); exclusión (`POR_LLAMAR` y `null`
→ `false`; `LLAMADA` → `true`).

**Done when**

- [ ] WHEN `allocateDailyBudget([{id:"a",dailyCap:25},{id:"b",dailyCap:25},{id:"c",dailyCap:25}], {a:60,b:10,c:5}, 25)` se evalúa THE SYSTEM SHALL devolver un objeto cuya suma de valores es ≤ 25 y donde `a` recibe estrictamente más que `b` y `c`.
- [ ] WHEN una campaña tiene `poolSizes` 0 THE SYSTEM SHALL asignarle 0 y repartir su cuota entre las demás.
- [ ] WHEN ninguna campaña llega a su `dailyCap` y `sum(pools) <= globalCap` THE SYSTEM SHALL asignar a cada una exactamente su pool.
- [ ] WHEN `pickCompanyContact([{id:"g",email:"info@x.cl",createdAt:<nuevo>},{id:"n",email:"juan@x.cl",createdAt:<viejo>}])` se evalúa THE SYSTEM SHALL devolver `"g"`.
- [ ] WHEN todos los contactos son nominativos THE SYSTEM SHALL devolver el de menor `createdAt`.
- [ ] WHEN `isCompanyPhoneManaged` recibe un contacto con `callStatus: "LLAMADA"` THE SYSTEM SHALL devolver `true`; con sólo `"POR_LLAMAR"` o `null` THE SYSTEM SHALL devolver `false`.
- [ ] WHEN `npx vitest run lib/outreach/eligibility.test.ts` runs THE SYSTEM SHALL exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/eligibility.test.ts   # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                                  # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 8: lib/outreach/eligibility.ts — allocateDailyBudget, pickCompanyContact, isCompanyPhoneManaged + tests"
git tag step-08-eligibility
```

---

### Step 9 — Reescritura del cron

**Do**

Reescribir `app/api/cron/outreach/route.ts` con la selección de §5 ("`GET /api/cron/outreach`
(reescrito)"). Puntos clave:

- `const globalCap = Number(process.env.OUTREACH_DAILY_CAP ?? 25)`.
- Query de elegibilidad **por empresa** con: `isActive: true`, `segment: campaign.segment`,
  `outreachSends: { none: { campaignId: campaign.id } }`, `NOT: { contacts: { some: { callStatus: {
  not: null, notIn: ["POR_LLAMAR"] } } } }`, `contacts: { some: { email: { not: null }, optOut:
  false, emailStatus: { not: "REBOTADO" } } }`. `include` los contactos elegibles de cada empresa.
- Restar lo enviado hoy: `prisma.outreachSend.count({ where: { sentAt: { gte: <inicio del día
  UTC> } } })`; `presupuesto = Math.max(0, globalCap - enviadosHoy)`.
- `allocateDailyBudget(...)` de `lib/outreach/eligibility.ts`; por campaña `take` su asignación de
  empresas; por empresa `pickCompanyContact(contactosElegibles)`.
- Mantener intacto: `isAuthorized(req)`, el guard de env legales (200 sin enviar), `jitterMs()`,
  `ensureSystemUser()`, `getTemplate(campaign.templateKey)`, la escritura de `OutreachSend`
  (`ENVIADO` / `FALLIDO`) + `Activity(type: "EMAIL")`, la respuesta 200 siempre, `export const
  dynamic = "force-dynamic"`.

Actualizar `app/api/cron/outreach/route.spec.md`: nueva query de elegibilidad (por empresa, tope
global, exclusión por gestión telefónica), 1 correo por empresa, `OUTREACH_DAILY_CAP` cableado,
idempotencia por `company.outreachSends.none` + `@@unique` de respaldo.

En `PROSPECCION_OUTREACH.md` §11: corregir la sección "Fase 4 — Visibilidad" — el endpoint
`/api/outreach/stats` y el panel `/admin/crm/outreach` **ya existen y funcionan** (cambiar los `[ ]`
por `[x]` con la nota de la fecha), y agregar una línea con el texto literal: *"El tope de envío es
global: `OUTREACH_DAILY_CAP` correos/día (default 25) repartidos entre las 3 campañas
proporcionalmente al pool de elegibles, vía `lib/outreach/eligibility.ts`."*

**Done when**

- [ ] WHEN `grep -q "OUTREACH_DAILY_CAP" app/api/cron/outreach/route.ts` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `grep -Eq "allocateDailyBudget|from \"@/lib/outreach/eligibility\"" app/api/cron/outreach/route.ts` runs THE SYSTEM SHALL exit 0.
- [ ] WHEN `grep -q "callStatus" app/api/cron/outreach/route.ts` runs THE SYSTEM SHALL exit 0 (la exclusión por gestión telefónica está en la query).
- [ ] WHEN el handler recibe un GET sin `Authorization: Bearer $CRON_SECRET` ni `x-cron-secret` THE SYSTEM SHALL responder 401 (`isAuthorized` intacto).
- [ ] WHEN no hay campañas activas THE SYSTEM SHALL responder 200 con `sent: 0`.
- [ ] WHEN se lee `PROSPECCION_OUTREACH.md` §11 THE SYSTEM SHALL contener la línea con `OUTREACH_DAILY_CAP` que documenta el tope global repartido entre las 3 campañas.
- [ ] WHEN `npm run typecheck` y `npm run build` corren THE SYSTEM SHALL exit 0.

**Verify**

```bash
grep -q "OUTREACH_DAILY_CAP" app/api/cron/outreach/route.ts                                   # expect: exit 0
grep -Eq "allocateDailyBudget|lib/outreach/eligibility" app/api/cron/outreach/route.ts        # expect: exit 0
grep -q "callStatus" app/api/cron/outreach/route.ts                                           # expect: exit 0
grep -q "isAuthorized" app/api/cron/outreach/route.ts                                         # expect: exit 0
grep -q "OUTREACH_DAILY_CAP" PROSPECCION_OUTREACH.md                                          # expect: exit 0 — la nota del tope global quedó en §11
npm run typecheck && npm run build                                                            # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 9: cron outreach — tope global OUTREACH_DAILY_CAP, 1 correo por empresa, exclusión por gestión telefónica"
git tag step-09-cron-rewrite
```

---

### Step 10 — `app/api/llamadas/route.ts` (GET + PATCH)

**Do**

Nuevo `app/api/llamadas/route.ts`. Imports estándar de una ruta CRM (`NextRequest`/`NextResponse`,
`getServerSession` de `next-auth`, `authOptions` de `@/lib/auth`, `prisma` de `@/lib/db`,
`apiError` de `@/lib/utils`, `hasModuleAccess` de `@/lib/access`).

- `const CALL_STATUSES = ["POR_LLAMAR", "LLAMADA", "SIN_RESPUESTA", "CORREO_CONSEGUIDO"] as const;`
- **GET**: prólogo de auth (`!session` → `apiError("No autorizado", 401)`;
  `!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso denegado", 403)`). Lee
  `req.nextUrl.searchParams` — `callStatus` (si viene y no está en `CALL_STATUSES` → `apiError`),
  `q`. `prisma.contact.findMany({ where: { phone: { not: null }, ...(callStatus ? { callStatus } :
  {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { name: {
  contains: q, mode: "insensitive" } } }] } : {}) }, select: { id, name, phone, email, callStatus,
  company: { select: { id, name, segment } } }, orderBy: { company: { name: "asc" } } })`. →
  `NextResponse.json(contacts)`.
- **PATCH**: mismo prólogo de auth. `const { id, callStatus } = await req.json()`. `if (!id) return
  apiError("id requerido")`. `if (callStatus !== undefined && callStatus !== null &&
  !CALL_STATUSES.includes(callStatus)) return apiError("Estado de gestión telefónica inválido")`.
  `try { const contact = await prisma.contact.update({ where: { id }, data: { ...(callStatus !==
  undefined ? { callStatus } : {}) } }); return NextResponse.json(contact); } catch { return
  apiError("Contacto no encontrado", 404); }`.

Nuevo `app/api/llamadas/route.spec.md` — Qué hace / Auth (`hasModuleAccess('CRM')`, ADMIN pasa;
JSON 403, nunca redirect) / GET (filtros `callStatus`/`q`, forma de la respuesta) / PATCH
(validación contra `CALL_STATUSES`, update parcial, 404 si no existe) / Qué NO hace (no escribe
`Activity`, no toca `temperature`/`score`, no crea contactos).

**Done when**

- [ ] WHEN se lee `app/api/llamadas/route.ts` THE SYSTEM SHALL abrir GET y PATCH con el prólogo `getServerSession(authOptions)` → `apiError("No autorizado", 401)` → `!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso denegado", 403)`, sin ningún `NextResponse.redirect`.
- [ ] WHEN un usuario con sesión válida pero sin `CRM` en `moduleAccess` y sin rol `ADMIN` hace GET THE SYSTEM SHALL responder 403 con `{ error: "Acceso denegado" }` en JSON.
- [ ] WHEN un GET con `?callStatus=SIN_RESPUESTA` llega THE SYSTEM SHALL devolver sólo contactos en ese estado.
- [ ] WHEN un PATCH trae `callStatus` fuera de `CALL_STATUSES` THE SYSTEM SHALL responder 400 con `{ error: "Estado de gestión telefónica inválido" }` y no escribir.
- [ ] WHEN un PATCH válido `{ id, callStatus }` llega THE SYSTEM SHALL actualizar sólo `callStatus` del contacto y devolverlo.
- [ ] WHEN un PATCH trae un `id` inexistente THE SYSTEM SHALL responder 404.
- [ ] WHEN `npm run typecheck` y `npm run build` corren THE SYSTEM SHALL exit 0.

**Verify**

```bash
grep -q "hasModuleAccess" app/api/llamadas/route.ts        # expect: exit 0
grep -q "CALL_STATUSES" app/api/llamadas/route.ts          # expect: exit 0
grep -q "apiError" app/api/llamadas/route.ts               # expect: exit 0
test -f app/api/llamadas/route.spec.md                     # expect: exit 0
npm run typecheck                                          # expect: exit 0
npm run build                                              # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 10: app/api/llamadas — GET + PATCH del estado de gestión telefónica"
git tag step-10-llamadas-api
```

---

### Step 11 — `CallStatusBadge` + `CallStatusSelect`

**Do**

Nuevo `components/ui/CallStatusBadge.tsx` — clon de `components/ui/TemperatureBadge.tsx`:
`Record<CallStatus, { label: string; className: string; dot: string }>` con clases `crm-*` (mapeo
de §7; ajustar a tokens que existan en `tailwind.config.ts theme.extend.colors.crm`), prop `size:
"sm" | "md"`, fallback a `POR_LLAMAR` si el valor es desconocido o `null`. `label`: "Por llamar" /
"Llamada" / "Sin respuesta" / "Correo conseguido".

Nuevo `components/crm/CallStatusSelect.tsx` — `'use client'`. Props `{ contactId: string;
value: string | null }`. Usa `useState(loading)` + `useRouter()` + `toast` de `sonner`. Envuelve el
`<Select>` de `@/components/crm/ui/select` (`SelectTrigger` con `size="sm"` y `className="w-[150px]"`;
`SelectContent` con un `SelectItem` por cada uno de los 4 valores). `onValueChange={(v) => { if
(!v) return; setLoading(true); fetch("/api/llamadas", { method: "PATCH", headers: { "Content-Type":
"application/json" }, body: JSON.stringify({ id: contactId, callStatus: v }) }).then(async (res) =>
{ if (!res.ok) throw new Error((await res.json()).error); toast.success("Estado actualizado");
router.refresh(); }).catch(() => toast.error("No se pudo actualizar el estado")).finally(() =>
setLoading(false)); }}`. Mientras `loading`, mostrar `<SpinnerGap className="animate-spin" />` en
lugar del trigger (patrón `CompletarActividadButton`).

Nuevos `components/ui/CallStatusBadge.spec.md` y `components/crm/CallStatusSelect.spec.md` — Qué es
/ De qué se clona / Props / Qué NO hace. Si algún token `crm-*` del mapeo no existe exactamente,
anotar cuál se usó en su lugar.

**Done when**

- [ ] WHEN `CallStatusBadge` recibe un `callStatus` desconocido o `null` THE SYSTEM SHALL renderizar el estilo y label de `POR_LLAMAR` (fallback).
- [ ] WHEN `CallStatusSelect` cambia de valor THE SYSTEM SHALL hacer `PATCH /api/llamadas` con `{ id, callStatus }` y, si responde ok, llamar `router.refresh()`.
- [ ] WHEN el PATCH falla THE SYSTEM SHALL mostrar `toast.error` y dejar el control fuera de estado de carga.
- [ ] WHEN `npm run typecheck` y `npm run build` corren THE SYSTEM SHALL exit 0.

**Verify**

```bash
test -f components/ui/CallStatusBadge.tsx                          # expect: exit 0
test -f components/ui/CallStatusBadge.spec.md                      # expect: exit 0
test -f components/crm/CallStatusSelect.tsx                        # expect: exit 0
test -f components/crm/CallStatusSelect.spec.md                    # expect: exit 0
grep -q "/api/llamadas" components/crm/CallStatusSelect.tsx        # expect: exit 0
grep -q "router.refresh" components/crm/CallStatusSelect.tsx       # expect: exit 0
npm run typecheck && npm run build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 11: CallStatusBadge + CallStatusSelect (editor in-line del estado telefónico)"
git tag step-11-callstatus-components
```

---

### Step 12 — Vista de lista de llamadas + nav

**Do**

Nuevo `app/(admin)/admin/crm/llamadas/page.tsx` — server component. `async function getLlamadas()`
con `prisma.contact.findMany({ where: { phone: { not: null } }, include: { company: { select: { id,
name, segment } } }, orderBy: { company: { name: "asc" } } })`. Header estándar del CRM: `<div
className="flex items-start justify-between animate-fade-up">` con `<h1 className="text-2xl
font-bold tracking-tight text-crm-foreground">Llamadas</h1>` + `<p className="text-crm-muted
text-sm mt-1">` con el conteo por estado. Pasa la data a `<ListaLlamadas data={...} />`.

Nuevo `components/crm/ListaLlamadas.tsx` — `'use client'`. `useState(search)`,
`useState(callStatusFilter)`, `useMemo` para filtrar. Filtros = array `[{ value: null, label:
"Todos" }, { value: "POR_LLAMAR", label: "Por llamar" }, …]` renderizados como `<Button size="sm"
variant={activo ? "default" : "outline"}>`. Tabla con `@/components/crm/ui/table` — una fila por
contacto: empresa · contacto · teléfono · `<CallStatusSelect contactId={c.id} value={c.callStatus}
/>` in-line en un `<TableCell>`. Click en la fila (fuera del `<Select>`) → `router.push("/admin/crm/
clientes/" + c.company.id)`. Empty state: `<div className="crm-card text-center py-16">` con ícono y
"No hay contactos con teléfono para llamar."

Nuevo `app/(admin)/admin/crm/llamadas/page.spec.md`.

Editar `components/ui/AdminSidebar.tsx`: importar un ícono de `@phosphor-icons/react` (p.ej.
`PhoneCall`) en el bloque de imports de arriba, y agregar al array `nav` del `ModuleDef` con `key:
"crm"` (después de `{ href: "/admin/crm/outreach", ... }`, antes de `{ href: "/admin/crm/
configuracion", ... }`):

```ts
{ href: "/admin/crm/llamadas", label: "Llamadas", icon: PhoneCall },
```

**Done when**

- [ ] WHEN un usuario con `CRM` visita `/admin/crm/llamadas` THE SYSTEM SHALL renderizar la lista de contactos con teléfono, cada uno con su `callStatus` editable in-line.
- [ ] WHEN se activa el filtro `SIN_RESPUESTA` THE SYSTEM SHALL mostrar sólo contactos en ese estado.
- [ ] WHEN se hace click en una fila (fuera del `<Select>`) THE SYSTEM SHALL navegar a `/admin/crm/clientes/<companyId>`.
- [ ] WHEN no hay contactos con teléfono THE SYSTEM SHALL mostrar el empty state, no una tabla vacía sin encabezado.
- [ ] WHEN `grep "/admin/crm/llamadas" components/ui/AdminSidebar.tsx` runs THE SYSTEM SHALL encontrar el ítem de nav.
- [ ] WHEN `npm run typecheck` y `npm run build` corren THE SYSTEM SHALL exit 0 (la ruta `/admin/crm/llamadas` compila).

**Verify**

```bash
grep -q "/admin/crm/llamadas" components/ui/AdminSidebar.tsx           # expect: exit 0
test -f "app/(admin)/admin/crm/llamadas/page.tsx"                      # expect: exit 0
test -f "app/(admin)/admin/crm/llamadas/page.spec.md"                  # expect: exit 0
test -f components/crm/ListaLlamadas.tsx                               # expect: exit 0
npm run typecheck                                                      # expect: exit 0
npm run build                                                          # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 12: vista /admin/crm/llamadas + ítem de nav en AdminSidebar"
git tag step-12-llamadas-page
# rollback si algo del post-build sale mal: git reset --hard step-12-llamadas-page
```

---

## 9.1 Parity and cutover

`NOT APPLICABLE — cambio aditivo sobre un endpoint inactivo. Todas las OutreachCampaign están
isActive=false, así que la reescritura del cron (S9) no reemplaza ningún comportamiento vivo en
producción: no hay tráfico que migrar, no hay coexistencia ni cutover. El importador es una carga
de datos puntual, no un reemplazo de sistema. El fix del matcher (S1) es aditivo (agrega
exclusiones). Ningún dato se migra.`

---

## 10. Environment Setup

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node + npm | la del repo (`package-lock.json` manda) | `node --version` · `npm --version` |
| `pg_dump` | cliente de PostgreSQL, cualquiera ≥ 14 | `pg_dump --version` — **si no está, DETENERSE en S2 y reportar**: `db push` no genera script de reversa y sin respaldo no hay vuelta atrás |
| Git Bash | para la recipe de `db push` (`grep`/`export`/`cut`) | la herramienta Bash de Claude Code ya es Git Bash |

### Accounts to create first

Ninguna cuenta nueva. El repo ya usa Neon, Vercel, Vercel Blob y SMTP Hostinger. Se necesita el
`.env.local` real (con `DATABASE_URL` / `DIRECT_URL` de Neon) para S2, S5 (corrida real) y S7
(seed).

### Environment variables

| Variable | Purpose | Where to get it | Required by step | Secret? |
|---|---|---|---|---|
| `OUTREACH_DAILY_CAP` | Tope **global** diario de correos de outreach, repartido entre las 3 campañas. El cron lo lee en S9 (antes estaba declarada pero muerta). | Constante; default 25 si no está seteada. | S9 (opcional antes; el default cubre) | no |
| `DATABASE_URL` | Conexión Postgres pooled (Prisma runtime). | Neon (host con `-pooler`). Ya existe en `.env.local` / Vercel. | S2 (real), S5 (real), S7 | sí |
| `DIRECT_URL` | Conexión Postgres directa — obligatoria para `db push` y `pg_dump`. | Neon (host **sin** `-pooler`; también `DATABASE_URL_UNPOOLED`). Ya existe. | S2 (real) | sí |
| `CRON_SECRET` · `OUTREACH_PUBLIC_URL` · `OUTREACH_SENDER_LEGAL_NAME` · `OUTREACH_SENDER_RUT` · `OUTREACH_SENDER_ADDRESS` · `SMTP_*` · `OUTREACH_PDF_BLOB_URL` | Ya existentes; el cron y el seed las usan. Los tres `OUTREACH_SENDER_*` siguen siendo bloqueante para activar campañas (no para este build). | Ya documentadas en `VARIABLES_ENTORNO.md`. | — (ya existen) | sí |

El repo **no usa `.env.example`** — la fuente única de variables es `VARIABLES_ENTORNO.md`. S2 la
actualiza para `OUTREACH_DAILY_CAP` y corrige la sección de DB stale. `.env` / `.env.local` /
`.env.*.local` están en `.gitignore` y en el `deny` de `.claude/settings.json`.

### Files that must be committed

El repo YA tiene `.gitignore` y git en `master` — **no hay `git init`**. Ninguna regla de ignore
nueva. Los archivos nuevos de este cambio (los `.spec.md`, `scripts/import-radar-pallets.ts`,
`lib/outreach/radar.ts`, `lib/outreach/eligibility.ts`, `components/...`, `app/...`) no están
cubiertos por ningún patrón de `.gitignore` — se commitean normalmente en el Checkpoint de su paso.

| File | Why it is committed | Ignore-file exception line |
|---|---|---|
| Los `.spec.md`, `.ts`, `.tsx` nuevos de §3 | Son el entregable del cambio | — no matched by any ignore pattern |
| `blueprints/importacion-radar-pallets/**` (este bundle) | Referencia de diseño; los `verify` corren desde la raíz del repo | `blueprints/` ya está en `.prettierignore` y en `tsconfig.json` `exclude` (agregados por el bundle de Finanzas) — no se toca |
| `backups/pre-radar-pallets.sql` (S2) | **NO se commitea** | `backups/` ya está en `.gitignore` (última línea). El Checkpoint de S2 lo verifica con `git check-ignore -q backups/pre-radar-pallets.sql; test $? -eq 0` |

### Bootstrap

```bash
# order matters: el repo ya existe (git master) → sólo copiar workspace/ + npm ci
# La copia de workspace/ es idempotente: cp -Rn no pisa, y el bloque de CLAUDE.md se anexa
# sólo si el marcador RADAR-PALLETS no está presente.

# 1. Copiar la config de agente del bundle a la raíz del repo (no pisa lo existente):
cp -Rn blueprints/importacion-radar-pallets/workspace/. ./ || true   # -n: no clobber. BSD/macOS cp sale 1 al saltar; saltar es lo esperado → || true

# 2. Reemplazar .claude/settings.json por el superset del bundle (config, seguro de sobrescribir):
cp -f blueprints/importacion-radar-pallets/workspace/.claude/settings.json .claude/settings.json

# 3. Anexar los bloques de workspace/CLAUDE.md y workspace/AGENTS.md a los del repo, sólo si no están ya
#    (mismo marcador RADAR-PALLETS:INICIO; el cp -Rn del paso 1 salta AGENTS.md/CLAUDE.md porque ya existen):
grep -q "RADAR-PALLETS:INICIO" CLAUDE.md || cat blueprints/importacion-radar-pallets/workspace/CLAUDE.md >> CLAUDE.md
grep -q "RADAR-PALLETS:INICIO" AGENTS.md || cat blueprints/importacion-radar-pallets/workspace/AGENTS.md >> AGENTS.md

# 4. Instalar dependencias (sin cambios de package.json todavía — S5 agrega el alias):
npm ci

# 5. Regenerar el cliente de Prisma con el schema actual:
npx prisma generate
```

**Todo el bloque sale 0 al correrlo dos veces:** `cp -Rn` + `|| true` no falla; `cp -f` sobre un
archivo que ya es idéntico no falla; el `grep -q || cat` no re-anexa si el marcador ya está; `npm
ci` y `prisma generate` son idempotentes. No hay comando interactivo. No hay servicio local que
levantar (los tests son puros; la BD es Neon remota).

---

## 11. Dependencies

**Cero dependencias nuevas.** Este cambio no agrega ni sube ningún paquete. Todos los pines salen
del `package-lock.json` del repo, leído 2026-09-09. Verificados por el `stack-researcher` ese mismo
día y **re-verificados en un refresh el 2026-09-12** (§20.3 #13-#15) — ningún número cambió.
`Installed by` = §10 Bootstrap (`npm ci`).

### Runtime

| Package | Version (lock) | Source | Checked | Estado | Purpose |
|---|---|---|---|---|---|
| `next` | 14.2.35 | `package-lock.json` + registry.npmjs.org/next (dist-tag `next-14`) | 2026-09-12 | VERIFIED — tip final y totalmente parchado de 14.x (CVE-2025-29927 y la ola RSC-DoS de dic-2025 cubiertas). 14.x está EOL: sin parches futuros. | El framework. S1, S9, S10, S12 tocan rutas/middleware/páginas. |
| `next-auth` | 4.24.15 | `package-lock.json` + github.com/nextauthjs/next-auth releases | 2026-09-12 | VERIFIED — parche de seguridad de la línea 4.x. El fail-open (CVE-2026-73421) afecta **sólo** el middleware v5 (`5.0.0-beta.0`–`5.0.0-beta.31`), no `withAuth` v4. | Auth. `withAuth` en `middleware.ts` (S1). |
| `@prisma/client` | 5.22.0 | `package-lock.json` + github.com/prisma/prisma releases | 2026-09-12 | VERIFIED · línea 5.x EOL para fixes (sin backports). Suficiente para el cambio aditivo de schema. | ORM. S2 (schema), S5/S9/S10 (queries). |
| `react` / `react-dom` | 18.3.1 | `package-lock.json` | 2026-09-12 | VERIFIED — terminal 18.x (18.3.2 no existe). No lo toca el cambio directamente. | UI. Componentes de S11/S12. |
| `nodemailer` | 7.0.13 | `package-lock.json` + github.com/nodemailer/nodemailer | 2026-09-12 | VERIFIED — **7.x EOL con advisories sin parche en 7.x**: DoS O(n²) en addressparser (GHSA-2x7j-588g-ccc2) y bypass de validación de dominio (GHSA-cc9r-2j5m-2m83), **ambos parcheados recién en 9.1.0** (corrección del refresh 2026-09-12: 8.0.4 no corrige ninguno de los dos — ver §20.3 #13). El cron manda correo por este paquete. **Este cambio NO empeora la exposición** — ver §20.2 riesgo 3 y §20.4. | SMTP. El cron (S9) sigue usando `lib/outreach/smtp.ts` sin cambios. |

### Development

| Package | Version (lock) | Source | Checked | Estado | Purpose |
|---|---|---|---|---|---|
| `prisma` (CLI) | 5.22.0 | `package-lock.json` | 2026-09-12 | VERIFIED · en lockstep con `@prisma/client`. CAUTION: el dist-tag `latest` de `prisma` (CLI) es hoy un RC (`8.0.0-rc.14`) mientras el de `@prisma/client` sigue siendo estable (`7.10.0`) — no instalar ninguno de los dos con `@latest` a secas en un futuro bump; ver §20.3 #15. | `prisma validate` / `db push` / `generate` (S2). |
| `vitest` | 4.1.9 | `package-lock.json` + registry (tag `V4` = 4.1.11) | 2026-09-12 | VERIFIED — `^4.1.9` flota a 4.1.11. CVE-2026-47429 afecta `<4.1.0` y sólo con UI/API server expuesto; `vitest run` node no lo activa. vitest 5.0.0 (major nuevo) GA el 2026-09-03 — el caret no cruza el major, sin impacto en este pin. | Tests puros de S3/S4/S6/S8. |
| `ts-node` | 10.9.2 | `package-lock.json` | 2026-09-12 | VERIFIED · stale pero correcto para major 10 (11.x sigue en beta). `--project tsconfig.scripts.json` sin afectar. | El script `import-radar-pallets.ts` (S5). |
| `typescript` | 5.9.3 | `package-lock.json` | 2026-09-12 | VERIFIED — final 5.x. CAUTION: TypeScript 6.0.3 y 7.0.2 (compilador nativo Go) ya son GA; 7.x no expone API de compilador invocable desde JS hasta 7.1+, y `ts-node@10.9.2` depende de esa API — no subir de major sin reemplazar/parchar `ts-node` primero. | `npm run typecheck` (todos los pasos). |

### Deliberately not used

| Rejected | Instead | Why |
|---|---|---|
| `xlsx` / `exceljs` / `sheetjs` / `node-xlsx` | El usuario exporta las 3 hojas a CSV y el script reusa `parseCsv` de `lib/outreach/prospects.ts` | Convención dura del repo: "sin dependencias nuevas" (`import-prospects.spec.md`). La importación es puntual (~127 filas, una vez). |
| `zod` para las rutas nuevas (`/api/llamadas`) | Validación a mano (guard clauses + `const CALL_STATUSES = [...]` + `includes`) | `CLAUDE.md` acota `zod` a `app/api/finanzas/*`; el resto del CRM valida a mano. No se abre un segundo estilo. |
| `papaparse` / `csv-parse` | El `parseCsv` propio del repo | Mismo motivo: sin deps nuevas; el parser existente cubre RFC4180 + BOM. |

---

## 12. Deployment Strategy

### Hosting

Vercel (ya configurado). Deploy en push a `master`. Build command `npm run build` (= `prisma
generate && next build`). `vercel.json` tiene un solo cron: `{ path: "/api/cron/outreach", schedule:
"0 12 * * 1-5" }` — **no se toca** (el fix es en `middleware.ts`, no en el schedule).

### Environments

| Environment | Branch | URL | Database | Third-party |
|---|---|---|---|---|
| Local | — | localhost:3000 | Neon (creds reales en `.env.local`) | SMTP Hostinger real (cuidado: probar el unsubscribe manda/toca correo real) |
| Production | `master` | `intranet.cooperapro.cl` | Neon | SMTP Hostinger |

No hay preview branch db separada en este repo.

### CI/CD

El "CI" efectivo son el hook `.husky/pre-commit` (`lint-staged → typecheck → test`) y el build de
Vercel en cada push. No hay `.github/workflows`. El portón global de §20.1 es lo que corre a mano
antes de mergear a `master`.

### Release and rollback

- **Código:** merge de la rama del cambio a `master` + push → Vercel despliega. Rollback = Instant
  Rollback de Vercel al deployment anterior, o revertir el merge.
- **Schema (S2):** `db push` es **aditivo** (enum gana un valor, columna nullable nueva). Reversa
  dura = restaurar `backups/pre-radar-pallets.sql` con `psql`/`pg_restore` (no instantáneo). No hay
  cambio destructivo, así que un rollback de código sobre el schema nuevo funciona (el
  `@prisma/client` viejo simplemente no conoce `callStatus`, y `ProspectSegment.INDUSTRIA` sólo lo
  usan filas que el importador nuevo creó).
- **Orden:** aplicar el schema (S2) **antes** de mergear el código que lo usa — igual que todos los
  cambios de schema anteriores del repo.

### Post-build launch checklist (fuera del build order — no son pasos de §9)

1. **`git checkout master && git merge <rama> && git push origin master`** → verificar el deployment
   en Vercel (`readyState: READY`, alias `intranet.cooperapro.cl` activo).
2. Poner los 3 CSV del Radar en `data/prospects/raw/` (`radar_prospectos.csv`, `radar_top20.csv`,
   `radar_top25.csv`, UTF-8) y confirmar que los headers calzan con `HEADER_MAP` (o ajustarlo).
3. **`npm run import:radar -- --dry-run`** → revisar el plan y el desglose por segmento. Si el
   reparto por segmento se ve muy sesgado o hay merges/omisiones raras, ajustar `classifySegment` /
   `normalizeCompanyName` y repetir el dry-run.
4. **`npm run import:radar`** (sin flag) → la carga real. Revisar el `ImportStats`.
5. **`npm run import:radar`** otra vez → confirmar `companiesCreated: 0`, `contactsCreated: 0`
   (idempotencia).
6. **`npm run seed:outreach-campaigns`** → crea la `OutreachCampaign` `INDUSTRIA` (`isActive:false`).
7. Verificar en `/admin/crm/outreach` que aparece la 3ª campaña, y en `/admin/crm/llamadas` que
   están los contactos phone-only en `POR_LLAMAR`.
8. **Bloqueante heredado, sin fecha en este cambio:** reunir `OUTREACH_SENDER_LEGAL_NAME` / `_RUT` /
   `_ADDRESS` y publicar SPF/DKIM/DMARC en `cooperapro.cl` (NIC Chile). Recién con eso resuelto,
   `UPDATE "OutreachCampaign" SET "isActive" = true` a mano.

### Domain, DNS, TLS

Sin cambios de DNS en este build. SPF/DKIM/DMARC quedan como bloqueante heredado (punto 8 arriba).

---

## 13. Testing Strategy

| Layer | Framework | What it covers | Where | Runs |
|---|---|---|---|---|
| Unit (puro) | Vitest 4 | `lib/outreach/radar.ts` (parseo, `splitPhones`, `normalizeCompanyName`, `classifySegment`, `consolidateRows`, `toRadarProspect`); `lib/outreach/eligibility.ts` (`allocateDailyBudget`, `pickCompanyContact`, `isCompanyPhoneManaged`); la plantilla `industria-v1` (extensión de `render.test.ts`) | `lib/outreach/radar.test.ts`, `lib/outreach/eligibility.test.ts`, `lib/outreach/templates/render.test.ts` | cada commit (hook `.husky/pre-commit`) + `npm run test` |
| Integración | — | **NOT APPLICABLE** — el repo no tiene tests de rutas ni de integración. `vitest.config.ts` recoge sólo `lib/**/*.test.ts`. | — | — |
| E2E | — | **NOT APPLICABLE** — el repo no tiene E2E (ni Playwright ni Cypress). | — | — |

### Critical flows

Sin cobertura E2E (el repo no la tiene). Los flujos críticos se verifican a mano en el post-build
launch checklist (§12): la idempotencia del importador (correr dos veces → 0 creados) y la
aparición de la campaña/contactos en el CRM.

### Test data

Los tests puros construyen sus propios objetos in-memory (no tocan BD). No hay base de tests.

### What is deliberately not tested

- **Los route handlers** `app/api/cron/outreach/route.ts` y `app/api/llamadas/route.ts` — el repo
  no tiene test de rutas y `import-prospects.ts` tampoco tiene test. Su portón es `npm run
  typecheck` + `npm run build` + `grep` estructural (que el archivo importa `hasModuleAccess`, usa
  `CALL_STATUSES`, lee `OUTREACH_DAILY_CAP`, etc.).
- **`scripts/import-radar-pallets.ts`** — su lógica pura vive en `lib/outreach/radar.ts` (cubierta).
  El script es I/O glue; se valida con una corrida `--dry-run` revisada a ojo (spec §9 de la spec
  del Radar: "revisar el reporte de la primera corrida antes de dar por buena la carga").
- **Accesibilidad automatizada** — el repo no tiene ninguna herramienta a11y. Ver §15 (checks
  manuales antes de lanzar).

---

## 14. Security & Secrets

| Concern | Control | Implemented in |
|---|---|---|
| Secret storage | `.env.local` (local) / Vercel env (prod); nunca en el repo. `.env*` en `.gitignore` y en `deny` de `.claude/settings.json`. | ya existente |
| Input validation | Server-side, a mano: `/api/llamadas` valida `callStatus` contra `CALL_STATUSES`; el importador `clean()` de placeholders. | S10, S5 |
| Output encoding / XSS | Las plantillas de correo aplican `escapeHtml()` a cada valor interpolado en el `bodyHtml` (`render.ts`). `industria.ts` lo mantiene. | S6 |
| SQL injection | Sólo queries Prisma parametrizadas. Cero SQL construido con strings. | todos |
| AuthN / AuthZ | `getServerSession` + `hasModuleAccess('CRM')` server-side en `/api/llamadas`, antes de tocar la BD. El cron por `CRON_SECRET`. Ver §8. | S1, S9, S10 |
| CSRF | NextAuth v4 (ya en el repo). Las mutaciones nuevas son `fetch` same-origin con sesión. | ya existente |
| Rate limiting | No se agrega. `/api/llamadas` es interno (sólo `CRM`). | — |
| Webhook verification | NOT APPLICABLE — este cambio no agrega webhooks. | — |
| Dependency audit | `npm audit` en CI/manual. **`nodemailer` 7.x tiene advisories sin parche en 7.x** (§11, §20.2) — bump a 9.1+ es ticket aparte; este cambio no empeora la exposición (los correos van a `Contact.email` de datos verificados a mano). | §20.4 |
| Logging hygiene | El cron loguea `{ sent, failed, results }` (sin PII). El importador loguea `ImportStats` (conteos, sin datos de contacto). | S5, S9 |
| PII handling | `Contact` guarda nombre/correo/teléfono de empresas — dato de negocio B2B. Sin cambio de retención. El link de baja (`optOut`) se honra para siempre (`optOutAt` es la evidencia — Ley 19.628). | ya existente |

**Hard rules**

- Ningún secreto se commitea, se imprime en log, ni llega al bundle del cliente.
- Toda verificación de autorización corre **antes** del trabajo, server-side.
- El pie legal de todo correo (razón social + RUT + dirección + link de baja) es obligatorio — Ley
  19.496 art. 28 B. `industria.ts` lo hereda vía `assembleEmail`.

Datos regulados: Ley 19.496 art. 28 B (comunicación promocional: remitente identificado + baja
gratuita) y Ley 19.628 (datos personales). La Ley 21.719 (nueva ley de datos, vigencia dic-2026)
endurece el régimen — **verificar sus obligaciones concretas antes de escalar el volumen de
envío** (fuera del alcance de este build).

---

## 15. Accessibility

**Target: WCAG 2.2 AA** (el CRM ya apunta a esto).

### Baseline

| Requirement | Rule en este cambio |
|---|---|
| Semantic HTML | `/admin/crm/llamadas` con un `<h1>`, la lista como `<table>` (primitivo `components/crm/ui/table`). |
| Keyboard | El `<Select>` de `@base-ui` es operable por teclado. Los filtros son `<Button>` reales. El click-en-fila tiene también el `<Select>` y (opcional) un link explícito a la ficha. |
| Focus visible | Heredado del sistema del CRM (`focus:ring-crm-ring/50` en los primitivos). |
| Contrast | El `CallStatusBadge` usa pares `crm-*` del sistema (AA). El color **no** es el único portador: el badge lleva `label` de texto. |
| Forms | El `<Select>` de estado tiene su `<Label>` o `aria-label` ("Estado de gestión telefónica"). |
| Motion | Sólo el `SpinnerGap animate-spin` del loading — ya en el sistema. |

### Verification

```bash
# NOT APPLICABLE — el repo no tiene herramienta a11y automatizada.
```

Checks manuales antes de lanzar: traversal por teclado de `/admin/crm/llamadas` (filtros → filas →
`<Select>` → confirmar), un pase con lector de pantalla sobre la lista, y 200% zoom en el
breakpoint más angosto.

---

## 16. Observability & Cost

### Instrumentation

| Signal | Tool | What it captures | Who |
|---|---|---|---|
| Resultado del cron | la respuesta 200 JSON `{ campaigns, sent, failed, results }` | cuántos correos salieron por campaña ese día | Claudio (revisa logs de Vercel Cron) |
| Resultado de la importación | `console.log` del `ImportStats` + `bySegment` | creados / enriquecidos / duplicados / descartados / desglose por segmento | Claudio (corre el script) |

Sin APM nuevo. El repo no tiene Sentry ni similar; este cambio no lo agrega.

### The metrics that matter

| Metric | Target | Alert at |
|---|---|---|
| `OutreachSend` con `sentAt` = hoy, sumando las 3 campañas | ≤ 25 | > 25 (revisar `allocateDailyBudget`) |
| Empresas del Radar sin `segment` tras importar | 0 | ≥ 1 |
| `companiesCreated` en la 2ª corrida del importador | 0 | ≥ 1 (idempotencia rota) |

### Health check

Sin health check nuevo. El cron responde 200 aunque no envíe nada (por diseño, para que Vercel no
reintente).

### Cost model

| Service | Costo incremental de este cambio |
|---|---|
| Neon | $0 — 1 columna nullable + 2 valores de enum + ~127 filas nuevas de `Contact`/`Company` |
| Vercel | $0 — mismas rutas, 1 página más, 1 ruta de API más |
| SMTP Hostinger | $0 hasta activar campañas (bloqueante heredado) |

**Costo mensual estimado del cambio: $0 incremental.**

---

## 17. Model Routing

`NOT APPLICABLE — este proyecto no llama a ningún LLM en runtime. La clasificación de segmento
(classifySegment) es por palabras clave, sin IA — decisión explícita de la spec (IMPORTACION_RADAR_
PALLETS.md §10 y PROSPECCION_OUTREACH.md §14: "Scoring automático con IA de los prospectos" está
fuera de alcance).`

---

## 18. Skills to Use During Build

| Skill | Build steps | Why | Install |
|---|---|---|---|
| `graphify` | opcional, cualquiera | Navegar el módulo CRM/outreach antes de tocar un archivo grande (`graphify query "<pregunta>"`). El repo ya tiene `graphify-out/`. | ya instalado (`uv tool install graphifyy` + `graphify claude install`) |

Ningún skill es obligatorio. Si `graphify` no está disponible, el builder navega con `grep`/`Read`
y sigue.

---

## 19. Agent Workspace

En **bundle mode**, los archivos de abajo se emiten como archivos reales bajo `workspace/`. El
builder los copia a la raíz del repo con el bloque de §10 Bootstrap (una copia guardada + un
`cp -f` del `settings.json` + un anexo con marcador al `CLAUDE.md`).

`.claude/commands/` **NUNCA** se emite.

### 19.1 `CLAUDE.md` (bloque que se ANEXA al `CLAUDE.md` del repo)

Ver `workspace/CLAUDE.md`. Se anexa bajo `<!-- RADAR-PALLETS:INICIO -->` / `<!-- RADAR-PALLETS:FIN
-->` (idempotente: sólo si el marcador no está). Contiene: los comandos (los mismos del repo), el
alias nuevo `npm run import:radar`, las reglas duras del cambio (importador rellena-jamás-pisa;
`radar.ts`/`eligibility.ts` puros con Prisma por parámetro e imports relativos; `db push` con
respaldo; el matcher del middleware no se vuelve a tocar; `enum ProspectSegment` sólo gana valores;
`.spec.md` por cada ruta/página/script/componente nuevo salvo `lib/outreach/templates/`), y dónde
vive cada cosa nueva.

### 19.2 `AGENTS.md`

Ver `workspace/AGENTS.md`. Bridge corto (bloque anexo equivalente al de `CLAUDE.md`, apuntando a
`CLAUDE.md` como fuente de verdad).

### 19.3 `.claude/settings.json`

Ver `workspace/.claude/settings.json` — es el `.claude/settings.json` **actual del repo** (mismo
`allow`/`deny`) **más** tres entradas en `permissions.allow`: `"Bash(npm run import:radar)"`,
`"Bash(npm run import:radar -- --dry-run)"`, `"Bash(npm run seed:outreach-campaigns)"`. El
Bootstrap lo copia con `cp -f` (reemplaza el del repo — es un superset, seguro).

### 19.4 Project skills

`NOT APPLICABLE — este cambio no agrega un flujo repetible que amerite un skill. La importación es
puntual; el resto son ediciones one-off. Los flujos repetibles del repo (verificar-porteros de
Finanzas) no aplican acá.`

### 19.5 `.claude/rules/*.md`

Ver `workspace/.claude/rules/radar-pallets.md` — `paths:` = `lib/outreach/radar.ts`,
`lib/outreach/eligibility.ts`, `lib/outreach/radar.test.ts`, `lib/outreach/eligibility.test.ts`,
`scripts/import-radar-pallets.ts`. Convenciones que muerden en esa área (puro, sin Prisma en
runtime, imports relativos, `clean()` de `./prospects`, `fillData` rellena-jamás-pisa).

### 19.6 Verify-critical config and local infrastructure

`NOT APPLICABLE (archivos de config) — brownfield: el repo ya trae vitest.config.ts, tsconfig.json,
tsconfig.scripts.json, .prettierrc, .husky/. Ningún Verify de §9 necesita un archivo de config que
este bundle deba emitir. No hay servicio local que provisionar (los tests son puros; la BD es Neon
remota; el smoke test del data layer queda bloqueado por falta de credenciales, no por falta de un
compose file).`

Las sub-tablas que **sí** aplican:

#### Resolution convention matrix

**La convención, dicha una vez:** los módulos bajo `lib/` usan imports **relativos** (`./prospects`,
`./render`), nunca el alias `@/`. Los archivos bajo `app/` y `components/` usan `@/`.

| Context | Command that exercises it | Convention as it appears there | Config + literal setting that makes it work |
|---|---|---|---|
| Application source | `npm run build` | `app/api/cron/outreach/route.ts` importa `@/lib/outreach/eligibility`; `lib/outreach/eligibility.ts` importa `./prospects` | `tsconfig.json` `compilerOptions.paths` `{ "@/*": ["./*"] }` + `moduleResolution: "bundler"` — Next resuelve ambas formas |
| Test files | `npx vitest run lib/outreach/radar.test.ts` | `radar.test.ts` importa `./radar`; `radar.ts` importa `./prospects` | `vitest.config.ts` — `include: ['lib/**/*.test.ts']`, **sin** alias. Sólo funcionan imports relativos → por eso `radar.ts`/`eligibility.ts` usan `./prospects`, no `@/lib/outreach/prospects` |
| Standalone script | `ts-node --project tsconfig.scripts.json scripts/import-radar-pallets.ts` | `import-radar-pallets.ts` importa `../lib/outreach/radar`; `radar.ts` importa `./prospects` | `tsconfig.scripts.json` — `extends ./tsconfig.json` + `module: "CommonJS"` + `moduleResolution: "node"`. `ts-node` no es bundler: sólo resuelve relativos. Por eso el script importa `../lib/outreach/radar` (relativo), igual que `import-prospects.ts` |
| Build / bundle | `npm run build` (= `prisma generate && next build`) | igual que Application source | igual — la convención sobrevive al `next build` |

Todas las celdas apuntan a archivos que el repo ya trae (`tsconfig.json`, `tsconfig.scripts.json`,
`vitest.config.ts`). **Ninguno se emite ni se edita** — §19.6 de config es `NOT APPLICABLE` por eso.

#### Cross-artifact value reconciliation

| Shared value | Single source | Literal | Every other place it appears | Compared |
|---|---|---|---|---|
| `templateKey` de la campaña INDUSTRIA | `lib/outreach/templates/index.ts` (clave del `Record TEMPLATES`) | `"industria-v1"` | `scripts/seed-outreach-campaigns.ts` (campo `templateKey`); `lib/outreach/templates/render.test.ts` (`getTemplate("industria-v1")`) | yes |
| Valor de segmento nuevo | `prisma/schema.prisma` (`enum ProspectSegment`) | `INDUSTRIA` | `scripts/seed-outreach-campaigns.ts` (`segment: "INDUSTRIA" as const`); `lib/outreach/radar.ts` (`classifySegment` return + `RadarProspect.segment`); `app/(admin)/admin/crm/outreach/page.tsx` (`SEGMENT_LABEL`); `scripts/import-radar-pallets.ts` (`bySegment`) | yes |
| Valores de estado telefónico | `prisma/schema.prisma` (`enum CallStatus`) | `POR_LLAMAR` · `LLAMADA` · `SIN_RESPUESTA` · `CORREO_CONSEGUIDO` | `app/api/llamadas/route.ts` (`CALL_STATUSES`); `components/ui/CallStatusBadge.tsx` (`Record` keys + labels); `components/crm/CallStatusSelect.tsx` (`SelectItem`s); `lib/outreach/eligibility.ts` (`isCompanyPhoneManaged` compara `"POR_LLAMAR"`); `app/api/cron/outreach/route.ts` (`notIn: ["POR_LLAMAR"]`); `scripts/import-radar-pallets.ts` (`"POR_LLAMAR"`) | yes |
| Ruta de la página | `app/(admin)/admin/crm/llamadas/page.tsx` (ubicación del archivo) | `/admin/crm/llamadas` | `components/ui/AdminSidebar.tsx` (`href` del ítem de nav); `components/crm/ListaLlamadas.tsx` no la usa (navega a `/admin/crm/clientes/<id>`) | yes |
| Ruta de la API | `app/api/llamadas/route.ts` (ubicación) | `/api/llamadas` | `components/crm/CallStatusSelect.tsx` (`fetch("/api/llamadas", ...)`) | yes |
| Env del tope global | `app/api/cron/outreach/route.ts` (`process.env.OUTREACH_DAILY_CAP`) | `OUTREACH_DAILY_CAP` (default `25`) | `VARIABLES_ENTORNO.md` (documentada); §10 tabla de env | yes |
| Asunto de la campaña INDUSTRIA | `lib/outreach/templates/industria.ts` (`subject` de `renderIndustriaEmail`) | `"Pallets fuera de norma en su planta — los retiramos y reponemos con reparados certificados"` | `scripts/seed-outreach-campaigns.ts` (`subject` de la 3ª entrada de `CAMPAIGNS`) — mismo string **sin** el segmento `${comunaLine}` interpolado; réplica del patrón `logistica`/`farmaceutica` del repo (el `subject` del schema queda decorativo: el cron usa `email.subject` de la plantilla renderizada) | yes |

**El default `25`** aparece en `app/api/cron/outreach/route.ts` (`?? 25`), en `VARIABLES_ENTORNO.md`
(ejemplo `OUTREACH_DAILY_CAP=25`) y en §10 / §20.1 de este blueprint. Un solo número, en todas
partes; es el mismo que la spec del Radar §7.7 ("tope global de 25 correos diarios").

#### Byte-exact artifact reconciliation

`NOT APPLICABLE — este blueprint no autora bytes literales que algo compare carácter por carácter.
Los tests de S3/S4/S6/S8 asertan propiedades de funciones que este mismo blueprint especifica
(`normalizeCompanyName(...)` devuelve tal string, `classifySegment(...)` devuelve tal enum, la suma
del reparto es ≤ globalCap), no golden files pre-autorados contra un productor futuro.`

#### El bundle dentro del proyecto

El repo **no** corre formatter/linter sobre todo el árbol como compuerta. El portón §20.1 usa
`npx prettier --check` con la **lista explícita de los archivos nuevos** del cambio (no un glob de
directorio) — no recorre `blueprints/`. Además `blueprints/` ya está en `.prettierignore` y en
`tsconfig.json` `exclude` (los agregó el bundle de Finanzas). `next build` y `tsc` no recorren
`blueprints/` por ese `exclude`.

| File | Path | Which Verify need it | Resolution/env handling | Bundle-path exclusion |
|---|---|---|---|---|
| (ninguno emitido) | — | — | — | `blueprints/` ya excluido por `.prettierignore` + `tsconfig exclude` preexistentes (Finanzas) — no se agrega línea nueva |

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

El cambio está **listo** cuando todo lo de abajo sale 0 en un checkout limpio del repo con el
schema ya aplicado (S2 corrido contra Neon), y no antes.

```bash
npm ci                                                        # expect: exit 0
npm run typecheck                                             # expect: exit 0, cero errores
npm run test                                                  # expect: exit 0, 0 failed, 0 skipped
npm run build                                                 # expect: exit 0
# Prettier SÓLO sobre los archivos NUEVOS del cambio (lista explícita — no un glob de directorio:
# algunos archivos viejos del repo no pasan Prettier y este cambio no los toca):
npx prettier --check \
  lib/outreach/radar.ts lib/outreach/radar.test.ts \
  lib/outreach/eligibility.ts lib/outreach/eligibility.test.ts \
  lib/outreach/templates/industria.ts \
  scripts/import-radar-pallets.ts \
  app/api/llamadas/route.ts \
  "app/(admin)/admin/crm/llamadas/page.tsx" \
  components/ui/CallStatusBadge.tsx \
  components/crm/CallStatusSelect.tsx components/crm/ListaLlamadas.tsx   # expect: exit 0
```

**No** `npm run lint` (nunca compuerta en este repo). **No** `test:e2e` ni comando de a11y (el repo
no tiene ninguno).

Gates manuales, cada uno chequeado una vez antes de lanzar:

- [ ] Cada paso de §9 tiene su tag `step-NN-<slug>` en git — `git tag -l 'step-*'` lista uno por
      paso (12). El repo ya existe (git `master`); no lo crea un scaffolder.
- [ ] Ningún archivo nuevo quedó fuera de git — `git ls-files --error-unmatch <path>` sale 0 para
      cada `.spec.md`, `.ts`, `.tsx` de §3 (uno por invocación). `backups/pre-radar-pallets.sql`
      **no** está trackeado: `git check-ignore -q backups/pre-radar-pallets.sql; test $? -eq 0`.
- [ ] `db push` (S2) aplicado contra Neon **con `backups/pre-radar-pallets.sql` verificado antes**
      (`test -s`).
- [ ] El bloque de §10 Bootstrap se re-corrió una vez sobre un árbol ya bootstrapeado, **salió 0**,
      y no cambió nada que importe: `.claude/settings.json` y `CLAUDE.md` intactos (el marcador
      `RADAR-PALLETS:INICIO` no se re-anexó), `package.json` sigue con el alias `import:radar`, y el
      comando siguiente sigue encontrando sus binarios (`npm ci` no revirtió nada).
- [ ] Cada fila de la tabla *Cross-artifact value reconciliation* (§19.6) fue comparada carácter
      por carácter — `Compared: yes` en todas.
- [ ] `npm run import:radar -- --dry-run` corrido y revisado (desglose por segmento sin sesgo
      absurdo; sin merges/omisiones raras en el reporte). Luego la corrida real, y una tercera
      corrida con `companiesCreated: 0` y `contactsCreated: 0`.
- [ ] `npm run seed:outreach-campaigns` corrido → la 3ª `OutreachCampaign` (`segment: INDUSTRIA`,
      `isActive: false`) existe.
- [ ] El matcher de `middleware.ts` quedó con exactamente 5 exclusiones
      (`auth|posiciones|webhooks|cron|outreach/unsubscribe`), ni una de más.
- [ ] Con `npm run dev` corriendo, sin cookie de sesión:
      `test "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/cron/outreach)" = 401`
      (el cron está EXCLUIDO del matcher tras S1 → llega al handler → `isAuthorized` sin `Bearer` → 401 JSON), y
      `test "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/llamadas)" = 307`
      (`/api/llamadas` SÍ está en el matcher → `withAuth` redirige 307 a `/api/auth/signin` sin cookie —
      comportamiento conocido del repo, igual que toda ruta API del CRM; el guard `apiError(401)` del
      handler es defensa en profundidad para una sesión stale, no el camino sin-cookie).
- [ ] Ningún non-goal de §1 se construyó.
- [ ] `OUTREACH_DAILY_CAP` está en la env de producción (o se acepta el default 25 — documentado).

**Ninguna advertencia se ignora.**

### 20.2 Risk register

| Risk | Likelihood | Impact | Early signal | Mitigation |
|---|---|---|---|---|
| `normalizeCompanyName` fusiona dos empresas distintas de nombre parecido, o no detecta un duplicado (nombre comercial vs razón social). Sin RUT ni `placeId` no hay identificador fuerte. | M | M | El reporte de `--dry-run` muestra `companiesUpdated` sobre empresas que no deberían matchear, o `companiesCreated` sobre empresas que ya existían. | Lista de sufijos **cerrada** (no heurística); **match exacto** tras normalizar, nunca substring; `--dry-run` obligatorio y revisión del reporte antes de la corrida real (spec §9). Reversa: agregar `Company.normalizedName` persistida + backfill si se vuelve recurrente. |
| El clasificador por palabras clave sesga el reparto por segmento (p.ej. 90% cae en `INDUSTRIA`). | M | M | El desglose `bySegment` del `ImportStats` sale muy desbalanceado. | Revisar el `bySegment` del `--dry-run`; ajustar el diccionario de keywords de `classifySegment` y repetir. Es heurística, se espera afinarla en la 1ª corrida. |
| `nodemailer` 7.x con advisories sin parche en 7.x (DoS O(n²) en addressparser; bypass de validación de dominio). El cron manda correo por ese paquete. | M | M | Correos entregados a dominios inesperados, o el cron cuelga procesando una lista de direcciones. | **Este cambio no empeora la exposición** (los correos van a `Contact.email` de datos verificados a mano, no a input de usuario arbitrario). El bump `nodemailer` 7→9.1+ es un ticket de seguridad **aparte** (§20.4). Las campañas siguen `isActive=false` hasta resolver los bloqueantes legales. |
| El fix del matcher (S1) toca `middleware.ts`, compartido por los 4 módulos. Un error en el negative-lookahead podría dejar de autenticar alguna ruta `/api/*` o romper una redirección de página. | B | A | Una ruta `/api/*` que antes pedía sesión ahora responde sin ella; o `/admin/*` deja de redirigir. | Cambio **aditivo puro** (sólo suma 2 exclusiones). El Verify de S1 asserta que el matcher quedó con **exactamente** las 5 exclusiones. `npm run build` + `npm run typecheck`. El `stack-researcher` confirmó que las 2 rutas nuevas excluidas se autentican por su cuenta (`isAuthorized` del cron; token en el unsubscribe). |
| `db push` (S2) contra producción: si Prisma detecta pérdida de datos pide `--accept-data-loss`. | B | A | `npm run db:push` pide confirmación / se cuelga. | `pg_dump "$DIRECT_URL" > backups/pre-radar-pallets.sql` verificado con `test -s` **antes**. `INDUSTRIA` declarado **al final** del enum (evita drop-and-recreate). Sin `DEFAULT` a `INDUSTRIA` ni escritura de filas con él en el mismo `db push`. `DIRECT_URL`, no el pooler. Si pide `--accept-data-loss` → **parar**, la edición no es aditiva. |
| Idempotencia sin RUT/`placeId`: si Ventas renombra una empresa a mano entre la 1ª y la 2ª corrida, la 2ª no la reconoce por nombre normalizado y la duplica. | B | M | `companiesCreated > 0` en la 2ª corrida del importador. | Carga **puntual supervisada** (una vez). `--dry-run` primero. Reversa documentada: `Company.normalizedName` persistida + backfill si la importación pasa a recurrente. |

### 20.3 Decision log

| # | Decisión | Alternativa rechazada | Por qué | Would reverse if |
|---|---|---|---|---|
| 1 | Lectura del `.xlsx`: el usuario exporta las 3 hojas a CSV UTF-8 en `data/prospects/raw/`; el script reusa `parseCsv` de `prospects.ts`. Cero deps nuevas. | Agregar `xlsx`/SheetJS para leer el `.xlsx` directo. | Convención dura del repo ("sin dependencias nuevas"). La importación es puntual (~127 filas, una vez). | La importación deja de ser puntual y se vuelve un canal recurrente que justifique un lector `.xlsx`. |
| 2 | El estado de gestión telefónica vive en `Contact` (`enum CallStatus` + `callStatus CallStatus?`). | En `Company`; o un modelo `CallLog` con historial de intentos fechados. | Precedente exacto: `ContactTemperature` (enum + `@@index` + badge + `<Select>` + filtro). La "lista de llamadas" lista contactos. La exclusión del correo se resuelve en la query del cron. | El negocio necesita historial de intentos fechados por empresa (quién llamó, cuándo, resultado). |
| 3 | Elección del correo de envío: **genérico > nominativo** (> menor `createdAt`). | "Nominativo > genérico" (lo que decía la spec del Radar §7.6). | Mantiene PROSPECCION_OUTREACH.md §9.1 (regla de mínima exposición legal) — el mismo criterio de prefijos genéricos que ya aplica `pickBestEmail` en el importador. La spec del Radar §7.6 se ajusta a esto. | Cambia el criterio legal de exposición, o Ventas pide explícitamente escribirle a la persona nominada. |
| 4 | Tope global de 25 vía env `OUTREACH_DAILY_CAP` (ya declarada, hoy muerta); `OutreachCampaign.dailyCap` pasa a sub-techo por campaña. | Modelo singleton `OutreachConfig` (patrón `OrderCounter`); o constante hardcodeada. | Sólo hay que cablear una env que ya existe. Sin modelo nuevo, sin UI (no hay pantalla de config de outreach donde exponerlo). | Se construye una pantalla de configuración de outreach donde exponer el tope → modelo singleton. |
| 5 | Reparto del cupo global: proporcional al pool de elegibles de cada campaña, con `dailyCap` como techo; sobrante reasignado. | Orden fijo por prioridad de segmento; o equitativo `25÷3`. | Ninguna campaña acapara ni se queda en cero mientras tenga candidatos. Es el reparto más justo sin decidir prioridades de negocio. | El negocio prioriza un segmento por sobre otro. |
| 6 | Consolidación entre hojas: gana la fila con más campos con valor; empate → prioridad de hoja Prospectos verificados > TOP20 > TOP25. | Primera aparición (orden de lectura); o "la que tenga correo" como criterio primario. | "Prospectos verificados" es la hoja más curada. El conteo de campos es un proxy objetivo de completitud. | Aparece un identificador fuerte en la fuente (RUT) que permita un desempate objetivo. |
| 7 | Exclusión del correo automático: cualquier `callStatus` distinto de `POR_LLAMAR` y no nulo. | "Cualquier estado no nulo, incluido `POR_LLAMAR`"; o "sólo cuando llega a `CORREO_CONSEGUIDO`". | `POR_LLAMAR` = sólo encolada por el importador, nadie llamó. En cuanto Ventas la trabaja, sale del correo automático para siempre (spec §7.8). | Ventas pide que las empresas en `SIN_RESPUESTA` vuelvan a la cola de correo tras N días. |
| 8 | `Contact.source = IMPORT` para las filas del Radar + línea de nota "Origen: Radar de Clientes Pallets V7". | Agregar un valor `RADAR` a `ContactSource`. | `CLAUDE.md` §7 prohíbe agregar valores a `ContactSource`. `IMPORT` es el más cercano. | Se necesita segmentar reportes por "vino del Radar". |
| 9 | Teléfonos múltiples en una celda: `splitPhones` divide; el primero a `Contact.phone`, el resto a `Contact.notes`. Sin contactos fantasma. | Crear un `Contact` por teléfono (con `name` = nombre de empresa). | `Contact.phone` es singular; un `Contact` sin persona identificada ensucia la lista de llamadas y el dedup por teléfono. | Ventas necesita marcar/llamar cada número por separado con su propio estado. |
| 10 | `INDUSTRIA` se agrega al enum `ProspectSegment` al final; `OTRO` se conserva. | Renombrar `OTRO` → `INDUSTRIA`. | Renombrar un valor de enum es destructivo en Postgres/`db push`. Agregar es aditivo. | Se confirma que ninguna fila usa `OTRO` y se hace una migración de limpieza aparte. |
| 11 | Dedup contra el CRM sin columna `Company.normalizedName` persistida (match en memoria al vuelo). | Columna persistida + backfill de las ~120 empresas Apify + índice. | Alcanza para una carga supervisada de una vez (`--dry-run` + revisión, spec §9). | La importación pasa a recurrente, o Ventas renombra empresas entre corridas. |
| 12 | La campaña `INDUSTRIA` reusa el mismo `OUTREACH_PDF_BLOB_URL` que las otras dos. | Un PDF propio para el segmento INDUSTRIA. | Decisión §13.1 de PROSPECCION_OUTREACH.md: un único PDF para todos los segmentos. | El segmento INDUSTRIA necesita un material distinto. |
| 13 | Refresh de versiones (`/architect-refresh`, 2026-09-12): ningún pin de §11 cambia de número — los 9 paquetes siguen siendo el último patch de su línea, EOL/terminal por diseño (brownfield, igual al repo en producción). Se corrige la cita de `nodemailer`: los dos GHSA citados (2x7j-588g-ccc2, cc9r-2j5m-2m83) parchan sólo en 9.1.0 — **8.0.4 no corrige ninguno**, el texto anterior lo atribuía mal. | Dejar la cita de `nodemailer` sin corregir. | Un texto que atribuye el fix a 8.0.4 podría llevar al ticket de §20.4 ("bump nodemailer 7→9.1+") a considerar 8.0.4 como opción válida — no lo es para estas dos CVE. | La atribución 8.0.4 se confirma correcta contra una nueva lectura de los GHSA (no se espera). |
| 14 | Se elimina la entrada `Bash(npm install --save-exact zod@4.4.3)` del allowlist de `workspace/.claude/settings.json`. | Actualizar el pin a `zod@4.6.3` y conservar la entrada. | Este bundle no usa `zod` — la tabla "Deliberately not used" de §11 lo confirma explícitamente. La entrada era un residuo copiado de `blueprints/modulo-finanzas/` (que sí usa zod en `/api/finanzas`). Un comando pre-aprobado para instalar un paquete que el propio blueprint dice no adoptar es ruido en el allowlist, no una previsión útil. | Este cambio adopta `zod` para validar `/api/llamadas` (contradiría la decisión §11 vigente de validar a mano). |
| 15 | No se hace ningún bump de `prisma`/`@prisma/client` en este refresh; se documenta que sus dist-tags `latest` están hoy desincronizados (`prisma@latest` = `8.0.0-rc.14`, un RC; `@prisma/client@latest` = `7.10.0`, estable). | Dejar la nota sólo en la celda de §11 sin registrarla acá. | Un futuro bump que corra `npm install -D prisma@latest @prisma/client@latest` a secas instalaría una RC sin darse cuenta, dado que ambos paquetes deben ir en lockstep (§11). Registrar la razón acá evita que la nota se pierda si la celda de §11 se reescribe en un refresh posterior. | `prisma` 8.0.0 llega a GA y ambos dist-tags `latest` vuelven a coincidir en una versión estable. |

### 20.4 What to build next

1. **Bump `nodemailer` 7.x → 9.1+** — ticket de seguridad. Trigger: ahora (advisories sin parche en
   7.x; la línea está EOL). Requiere revisar breaking changes de 8.x (Node 20+) y 9.x/10.x (rewrite
   TS).
2. **Endpoint HTTP de importación (`/api/prospects/import`)** — para que Ventas suba CSV desde el
   navegador sin CLI. Trigger: otra persona además de Claudio necesita cargar prospectos.
3. **Parser de rebotes** — procesar `SendStatus.REBOTADO` / `emailStatus.REBOTADO` de verdad
   (webhook SMTP o poll IMAP). Trigger: el volumen de envío justifique medir tasa de rebote real
   (PROSPECCION_OUTREACH.md §10 pide detener la campaña si supera 5%).
4. **`Company.normalizedName` persistida + backfill** — si la importación del Radar deja de ser
   puntual. Trigger: se corre un segundo lote, o Ventas renombra empresas a mano entre corridas.
5. **Secuencia de seguimiento (2º toque a los 5 días)** — modelar pasos en la campaña. Trigger: la
   tasa de respuesta de un solo toque se estabilice y se quiera subirla.

---

*Fin del blueprint. El orden de construcción es §9. Parar cuando §20.1 esté en verde.*
