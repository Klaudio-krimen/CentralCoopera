# Epic 01: Ingesta y modelo

> Después de esta épica: el schema tiene `INDUSTRIA`, `enum CallStatus` y `Contact.callStatus`
> aplicados a Neon; el middleware deja pasar el cron y el unsubscribe; existe el módulo puro
> `lib/outreach/radar.ts` con sus tests; existe el script `scripts/import-radar-pallets.ts` y la
> plantilla `industria-v1` registrada.

| | |
|---|---|
| **Epic id** | `01-ingesta-modelo` |
| **Tasks** | `E1-T1` … `E1-T6` |
| **Depends on** | nothing — start here |
| **Unlocks** | `02-envio-llamadas` |
| **Parallel with** | — (es la primera épica) |

No necesitás ningún otro archivo para completar esta épica. Todo lo de abajo está repetido acá a
propósito.

---

## Stack

Next.js 14.2.35 (App Router) · TypeScript 5.9.3 · Tailwind 3 + `@base-ui/react` · PostgreSQL en Neon
(`DATABASE_URL` pooled + `DIRECT_URL` directa) · Prisma 5.22.0 · NextAuth v4.24.15 · Vercel · Vitest
4.1.9. Gestor: `npm`. Versiones en `package-lock.json` — leelo, no adivines. **Este cambio no agrega
ni sube ninguna dependencia.**

| Task | Command |
|---|---|
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` (= `tsc --noEmit`) — correr SIEMPRE antes de dar algo por terminado |
| Test (todo) | `npm run test` (= `vitest run`) |
| Test (un archivo) | `npx vitest run lib/outreach/radar.test.ts` |
| Build | `npm run build` (= `prisma generate && next build`) |
| Esquema a la BD | `npm run db:push` — exige respaldo `pg_dump` verificado antes (ver *Conventions*) |
| Correr el importador (manual, post-build) | `npm run import:radar -- --dry-run` / `npm run import:radar` |

**Gate:** `npm run typecheck && npm run test && npm run build` pasa antes de marcar cualquier tarea
de esta épica como done. **`next lint` NUNCA es compuerta** (el repo no tiene `.eslintrc`; abre un
prompt interactivo y cuelga).

El CLI de Prisma **no** lee `.env.local`. Antes de cualquier comando `prisma` (E1-T2), en el mismo
shell (Git Bash):

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

Esta épica no verifica contra ningún servicio local: los tests son puros y la BD es Neon remota.

## Directory subtree

Sólo lo que esta épica toca:

```
middleware.ts                                 # EDIT E1-T1 — matcher del negative-lookahead
prisma/
  schema.prisma                               # EDIT E1-T2 — enum INDUSTRIA + CallStatus + Contact.callStatus
VARIABLES_ENTORNO.md                          # EDIT E1-T2 — documenta OUTREACH_DAILY_CAP, corrige sección DB
package.json                                  # EDIT E1-T5 — alias "import:radar"
data/prospects/raw/
  radar_prospectos.csv                        # LO PONE EL USUARIO (post-build) — export de "Prospectos verificados"
  radar_top20.csv                             # LO PONE EL USUARIO — export de "TOP 20 ataque comercial"
  radar_top25.csv                             # LO PONE EL USUARIO — export de "TOP 25 empresas abordables"
lib/outreach/
  prospects.ts                                # EXISTE, read-only para esta épica — radar.ts importa `clean`/`parseCsv` de acá
  prospects.test.ts                           # EXISTE, read-only — fija el contrato de prospects.ts (no romperlo)
  radar.ts                                    # NEW E1-T3 (parseo) + E1-T4 (clasificación) — lógica pura del Radar
  radar.test.ts                               # NEW E1-T3 + E1-T4 — Vitest de radar.ts
  templates/
    render.ts                                 # EXISTE, read-only — industria.ts importa renderGreeting/assembleEmail/escapeHtml
    logistica.ts                              # EXISTE, read-only — es el espejo exacto de industria.ts
    industria.ts                              # NEW E1-T6 — plantilla del segmento INDUSTRIA
    index.ts                                  # EDIT E1-T6 — registra "industria-v1"
    render.test.ts                            # EDIT E1-T6 — casos de la plantilla industria
scripts/
  import-prospects.ts                         # EXISTE, read-only — es el patrón exacto de import-radar-pallets.ts
  import-radar-pallets.ts                     # NEW E1-T5 — importador CLI del Radar
  import-radar-pallets.spec.md               # NEW E1-T5 — spec del script
  seed-outreach-campaigns.ts                  # EXISTE, read-only para esta épica (lo edita E2-T1)
```

Todo lo que esté fuera de este subárbol está fuera de alcance de esta épica. Si una tarea parece
requerir editar un archivo no listado acá, parar y reportar — significa que el límite de la épica
está mal.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `enum ProspectSegment` | + `INDUSTRIA` como **último** valor (después de `OTRO`) | `OTRO` se conserva. Renombrar sería destructivo en Postgres. |
| `enum CallStatus` | NUEVO: `POR_LLAMAR` `LLAMADA` `SIN_RESPUESTA` `CORREO_CONSEGUIDO` | Ciclo de gestión telefónica de un `Contact`. |
| `model Contact` | + `callStatus  CallStatus?` (nullable, sin default) · `@@index([callStatus])` | `null` = no aplica gestión telefónica. El importador lo pone en `POR_LLAMAR` sólo si el contacto tiene teléfono y no tiene correo. |
| `model Company` | (sólo lectura + enriquecimiento) — `name`, `segment`, `website`, `commune`, `category`, `address`, `lat`, `lng`, `rating`, `reviews` | El importador rellena campos vacíos, jamás pisa. |

**`db push` sólo agrega `INDUSTRIA`** — no escribe ninguna fila con ese valor (regla de Postgres:
un valor recién agregado a un enum preexistente no se usa en la misma transacción que lo agrega).
El seed (E2-T1) y el importador (E1-T5, corrida real post-build) escriben `segment: "INDUSTRIA"`
después. `CallStatus` es `CREATE` nuevo → exento de esa regla.

## Contracts

**Consumed** — ya existe, no lo rebuildees:

| From | Interface | Guarantee |
|---|---|---|
| `lib/outreach/prospects.ts` | `clean(v): string \| null` | `"sin dato"` / `"sindato"` / `"n/a"` / `"na"` / `"-"` / `"null"` / `"undefined"` / `""` → `null`; el resto trim. |
| `lib/outreach/prospects.ts` | `parseCsv(text): Record<string,string>[]` | Quita BOM utf-8, `split(/\r?\n/)`, primera línea = headers, comillas RFC4180 básico. |
| `lib/outreach/templates/render.ts` | `renderGreeting(c): string` · `assembleEmail(subj, html, text, footer): RenderedEmail` · `escapeHtml(v): string` · tipos `ProspectEmailInput` / `SenderFooterInfo` / `RenderedEmail` | El pie legal (razón social + RUT + link de baja, Ley 19.496 art. 28 B) lo arma `assembleEmail`, no la plantilla. `renderGreeting(null)` → `"Estimados"`. |
| `lib/outreach/templates/index.ts` | `getTemplate(key): (input, footer) => RenderedEmail` | Lanza `Error("Plantilla desconocida: ...")` si la clave no está en `TEMPLATES`. |
| `prisma` (`@prisma/client`) | `PrismaClient` | El importador abre y cierra su propia instancia (patrón `import-prospects.ts`). |

**Produced** — épicas/pasos posteriores dependen de estas firmas exactas. Cambiar una las rompe:

| Export | Signature | Used by |
|---|---|---|
| `lib/outreach/radar.ts` → `parseRadarSheet` | `(csvText: string, sheetTag: "PROSPECTOS" \| "TOP20" \| "TOP25") => RadarRow[]` | `scripts/import-radar-pallets.ts` (E1-T5) |
| `lib/outreach/radar.ts` → `splitPhones` | `(raw: string \| null) => string[]` | E1-T5 |
| `lib/outreach/radar.ts` → `normalizeCompanyName` | `(name: string) => string` | E1-T5 (dedup en memoria contra el CRM) |
| `lib/outreach/radar.ts` → `classifySegment` | `(tipo: string\|null, perfil: string\|null, evidencia: string\|null) => "LOGISTICA" \| "FARMACEUTICA" \| "INDUSTRIA"` | E1-T5 |
| `lib/outreach/radar.ts` → `consolidateRows` | `(rows: RadarRow[]) => RadarRow[]` | E1-T5 |
| `lib/outreach/radar.ts` → `toRadarProspect` | `(row: RadarRow) => RadarProspect` | E1-T5 |
| `lib/outreach/templates/industria.ts` → `renderIndustriaEmail` | `(input: ProspectEmailInput, footer: SenderFooterInfo) => RenderedEmail` | `lib/outreach/templates/index.ts` (E1-T6), `app/api/cron/outreach/route.ts` (E2-T3) |
| `lib/outreach/templates/index.ts` → `TEMPLATES["industria-v1"]` | mismo tipo que las otras plantillas | E2-T3, `scripts/seed-outreach-campaigns.ts` (E2-T1) |

## Conventions that bite in this area

- **Lógica testeable = funciones puras bajo `lib/`.** `radar.ts` NO importa `@prisma/client` ni
  `@/lib/db` en runtime, recibe datos por parámetro, usa `import type` para tipos de Prisma, e
  imports **relativos** (`./prospects`, `./render`) — **nunca** `@/`. Vitest sólo recoge
  `lib/**/*.test.ts` y no resuelve el alias `@/`.
- **`normalizeCompanyName` es función nueva.** NO se toca `slugify` ni `dedupeKey` de
  `prospects.ts` — los fija `prospects.test.ts` y los usa `import-prospects.ts`. Match **exacto**
  tras normalizar, nunca substring (para no fusionar "Novofarma Service" con "Laboratorio Novofarma
  Service"). Lista de sufijos societarios **cerrada**, no heurística.
- **`db push` contra prod exige respaldo verificado antes:** `pg_dump "$DIRECT_URL" >
  backups/pre-radar-pallets.sql` + `test -s`. `backups/` está en `.gitignore`. `--accept-data-loss`
  está prohibido (en el `deny` de `.claude/settings.json`); si `db push` lo pide, la edición no es
  aditiva — parar. `DIRECT_URL` (sin `-pooler` en el host) para operaciones de esquema.
- **`INDUSTRIA` al final del bloque enum** — insertarlo a mitad puede hacer que Prisma elija
  drop-and-recreate del tipo (prisma#16180) → flag de pérdida de datos.
- **El script `ts-node`:** `ts-node --project tsconfig.scripts.json` (CommonJS/node) — obligatorio
  para que resuelva `../lib/outreach/radar`. Copiar `loadEnvLocal()` verbatim de
  `import-prospects.ts` (los scripts no cargan `.env.local` solos).
- **Importar = rellenar campos vacíos, JAMÁS pisar.** Construir un `fillData` sólo con claves cuyo
  valor actual es `null`/`""`; `update` sólo si `Object.keys(fillData).length > 0`. Mismo criterio
  para `Company` y `Contact`. Correo entrante distinto al de todos los contactos de la empresa → se
  crea un `Contact` nuevo (spec §5).
- **`"sin dato"` → `null` vía `clean()`.** No re-implementar el set de placeholders.
- **`ContactSource`:** usar `IMPORT` (no agregar valores — `CLAUDE.md` §7). Las filas del Radar
  llevan además una línea de nota `"Origen: Radar de Clientes Pallets V7"`.
- **Plantillas de correo:** una por segmento en `lib/outreach/templates/<segmento>.ts`, registrada
  en `TEMPLATES` con clave `"<segmento>-v1"`, usando `renderGreeting`/`assembleEmail`/`escapeHtml`.
  Ese directorio NO lleva `.spec.md` (es la única excepción a la convención del repo). Sin `<img>`
  en el HTML, sin `"GRATIS"` en el subject, sin acortadores de links.
- **`middleware.ts` no lleva `.spec.md`** (archivo de raíz sin él en el repo — no crear uno).
- Docs en español, comentarios de código en español y densos, citando secciones de la spec.
- Mensajes de commit `step N: <resumen>` en minúscula.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de área: `.claude/rules/radar-pallets.md`. Ambos
están en la raíz del repo (el builder los copió de `workspace/` en el Bootstrap).

---

## Tasks

Listadas en el mismo orden que `tasks.json` — ese orden es el orden de construcción. Trabajar de
arriba hacia abajo, no re-ordenar por prioridad ni por lo que parezca rápido.

### `E1-T1` — Excluir /api/cron y /api/outreach/unsubscribe del matcher de middleware

**Depends on:** nothing · **Priority:** p0 — metadata para cortes de alcance, no orden de ejecución

Prerrequisito de todo lo demás. Hoy `middleware.ts` intercepta `/api/cron/outreach` y
`/api/outreach/unsubscribe` con `withAuth` de `next-auth`; sin cookie de sesión responde **307** a
`/api/auth/signin` y el handler nunca corre. El cron de Vercel manda `Authorization: Bearer`, no
cookie → nunca ha ejecutado (enmascarado porque las campañas están `isActive=false`). El link de
baja está roto para un destinatario deslogueado → incumple Ley 19.496 art. 28 B. Confirmado por el
comentario del propio `middleware.ts` (líneas 77-89) y por el `stack-researcher` contra
`next-auth@4.24.15/next/middleware.js`.

Cambiar SÓLO la regla `/api/` del `config.matcher`:
`"/api/((?!auth|posiciones|webhooks).*)"` → `"/api/((?!auth|posiciones|webhooks|cron|outreach/unsubscribe).*)"`.
No tocar `withAuth`, ni las ramas de la función, ni `callbacks`. Es aditivo puro (suma 2
exclusiones). La autenticación del cron ya vive en su `isAuthorized(req)`; el unsubscribe se
autentica por el token del query.

**Files**
- `middleware.ts` — edit: sólo el string del `matcher` de `/api/`

**Acceptance**

1. **WHEN** se busca `cron` y `outreach/unsubscribe` en el `config.matcher` de `middleware.ts` **THE SYSTEM SHALL** encontrarlos dentro del negative-lookahead de la regla `/api/`.
2. **WHEN** se inspecciona el negative-lookahead de la regla `/api/` en `middleware.ts` **THE SYSTEM SHALL** tener exactamente estas cinco exclusiones: `auth`, `posiciones`, `webhooks`, `cron`, `outreach/unsubscribe`.
3. **WHEN** `npm run typecheck` runs **THE SYSTEM SHALL** exit 0.
4. **WHEN** `npm run build` runs **THE SYSTEM SHALL** exit 0.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
grep -Eq 'cron\|outreach/unsubscribe' middleware.ts
grep -Eq '\(\?!auth\|posiciones\|webhooks\|cron\|outreach/unsubscribe\)' middleware.ts
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 1: excluir /api/cron y /api/outreach/unsubscribe del matcher de middleware"
git tag step-01-middleware-matcher
```

---

### `E1-T2` — Schema: INDUSTRIA + enum CallStatus + Contact.callStatus + doc OUTREACH_DAILY_CAP

**Depends on:** `E1-T1` · **Priority:** p0

En `prisma/schema.prisma`: agregar `INDUSTRIA` como último valor de `enum ProspectSegment`; agregar
`enum CallStatus { POR_LLAMAR LLAMADA SIN_RESPUESTA CORREO_CONSEGUIDO }` junto a
`enum ContactTemperature`; agregar a `model Contact` el campo `callStatus  CallStatus?` (nullable,
sin default) y `@@index([callStatus])`.

En `VARIABLES_ENTORNO.md`: documentar `OUTREACH_DAILY_CAP` como usada por `/api/cron/outreach`
(default 25 — antes estaba listada pero ningún código la leía); corregir la sección de base de
datos que muestra `DATABASE_URL="file:./dev.db"` (SQLite) por el formato real Postgres/Neon
(`DATABASE_URL` pooled + `DIRECT_URL` directa, la directa sin `-pooler` en el host).

Luego aplicar el schema con la recipe (con `DATABASE_URL`/`DIRECT_URL` exportadas, `pg_dump`
verificado, `npm run db:push`, `npx prisma generate`). El `db push` **sólo** agrega `INDUSTRIA` —
no escribe filas con ese valor.

**Files**
- `prisma/schema.prisma` — edit: `enum ProspectSegment` + `enum CallStatus` (nuevo) + `Contact.callStatus` + `@@index`
- `VARIABLES_ENTORNO.md` — edit: `OUTREACH_DAILY_CAP` documentada; sección DB corregida

**Acceptance**

1. **WHEN** se lee `prisma/schema.prisma` **THE SYSTEM SHALL** tener `INDUSTRIA` como último valor del bloque `enum ProspectSegment` y un bloque `enum CallStatus { POR_LLAMAR LLAMADA SIN_RESPUESTA CORREO_CONSEGUIDO }`.
2. **WHEN** se lee `model Contact` en `prisma/schema.prisma` **THE SYSTEM SHALL** tener el campo `callStatus CallStatus?` (nullable, sin default) y `@@index([callStatus])`.
3. **WHEN** `npx prisma validate` runs con `DATABASE_URL`/`DIRECT_URL` exportadas **THE SYSTEM SHALL** exit 0.
4. **WHEN** `npm run db:push` runs **THE SYSTEM SHALL** exit 0 sin pedir `--accept-data-loss`.
5. **WHEN** `npx prisma generate` y luego `npm run typecheck` corren **THE SYSTEM SHALL** exit 0 con el cliente reconociendo `Contact.callStatus` y `ProspectSegment.INDUSTRIA`.
6. **WHEN** se busca `OUTREACH_DAILY_CAP` en `VARIABLES_ENTORNO.md` **THE SYSTEM SHALL** encontrarlo documentado como usado por el cron.

**Verify**

```bash
grep -q INDUSTRIA prisma/schema.prisma
grep -q 'enum CallStatus' prisma/schema.prisma
grep -Eq 'callStatus +CallStatus\?' prisma/schema.prisma
grep -q OUTREACH_DAILY_CAP VARIABLES_ENTORNO.md
export DATABASE_URL=$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"') && export DIRECT_URL=$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"') && npx prisma validate && mkdir -p backups && pg_dump "$DIRECT_URL" > backups/pre-radar-pallets.sql && test -s backups/pre-radar-pallets.sql && npm run db:push && npx prisma generate && npm run typecheck
```

> El último comando (la cadena `export` → `prisma validate` → `pg_dump` → `db:push` → `generate` →
> `typecheck`) necesita `.env.local` con credenciales reales de Neon y acceso de red. Es el único
> `verify` de esta épica que no corre en una máquina pelada — el builder lo corre desde el entorno
> local de Claudio (Git Bash + `.env.local`). Los cuatro `grep` de arriba sí corren en cualquier lado.

**Checkpoint**

```bash
git add -A && git commit -m "step 2: schema — INDUSTRIA, enum CallStatus, Contact.callStatus + doc OUTREACH_DAILY_CAP"
git tag step-02-schema-radar
git check-ignore -q backups/pre-radar-pallets.sql; test $? -eq 0
```

---

### `E1-T3` — lib/outreach/radar.ts — parseRadarSheet, splitPhones, normalizeCompanyName + tests

**Depends on:** `E1-T2` · **Priority:** p0

Nuevo `lib/outreach/radar.ts`, puro. Imports relativos: `import { clean, parseCsv } from
"./prospects"`. Exporta `RADAR_SHEETS` (`{ PROSPECTOS: 0, TOP20: 1, TOP25: 2 }` — el número es la
prioridad de desempate, 0 = gana), `interface RadarRow`, `HEADER_MAP` (nombre de columna del CSV →
clave de `RadarRow`; base: `"Nombre"→empresa`, `"Teléfono"→telefonos`, `"Correo"→email`,
`"Tipo"→tipo`, `"Perfil operacional"→perfilOperacional`, `"Evidencia operacional"→
evidenciaOperacional`, `"Próximo paso"→proximoPaso`, `"Observación"→observacion`; aceptar variantes
sin tilde y en minúscula — el usuario ajusta este mapa si su export difiere), `parseRadarSheet`
(usa `parseCsv`, aplica `HEADER_MAP` + `clean()`, `splitPhones()` a la celda de teléfono, descarta
filas sin `empresa`), `splitPhones` (divide por `/`, `;`, `,`, salto de línea y `" y "`; a cada
trozo `clean()` + trim; `null` → `[]`), `normalizeCompanyName` (`toLowerCase` → `normalize("NFD")`
sin diacríticos → colapsar espacios a uno → trim → quitar, **sólo si es el token final**, uno de
`s.a` / `s.a.` / `sa` / `spa` / `s.p.a` / `ltda` / `ltda.` / `limitada` / `sac` / `s.a.c` / `eirl`
/ `e.i.r.l` → trim; comparar strings **exacto**, nunca substring).

`lib/outreach/radar.test.ts` con los casos de la Acceptance.

**Files**
- `lib/outreach/radar.ts` — new
- `lib/outreach/radar.test.ts` — new

**Acceptance**

1. **WHEN** `normalizeCompanyName("Transportes Peñaflor Ltda.")` se evalúa **THE SYSTEM SHALL** devolver `"transportes peñaflor"`.
2. **WHEN** `normalizeCompanyName("Novofarma Service S.A.")` y `normalizeCompanyName("Laboratorio Novofarma Service S.A.")` se evalúan **THE SYSTEM SHALL** devolver strings distintos.
3. **WHEN** `splitPhones("+56 2 2333 2126 / +56 9 9689 7446")` se evalúa **THE SYSTEM SHALL** devolver un array de dos strings, cada uno sin espacios sobrantes.
4. **WHEN** una celda del CSV vale `"sin dato"` **THE SYSTEM SHALL** producir `null` en el campo correspondiente.
5. **WHEN** `parseRadarSheet(csv, "PROSPECTOS")` recibe una fila sin nombre de empresa **THE SYSTEM SHALL** omitir esa fila.
6. **WHEN** `npx vitest run lib/outreach/radar.test.ts` runs **THE SYSTEM SHALL** exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/radar.test.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "step 3: lib/outreach/radar.ts — parseo, splitPhones, normalizeCompanyName + tests"
git tag step-03-radar-parse
```

---

### `E1-T4` — lib/outreach/radar.ts — classifySegment, consolidateRows, toRadarProspect + tests

**Depends on:** `E1-T3` · **Priority:** p0

Editar `lib/outreach/radar.ts`. `classifySegment(tipo, perfil, evidencia)` — concatena los 3
textos, `toLowerCase` + sin diacríticos, keywords de la spec §6.2: `farmaceutico` / `laboratorio` /
`drogueria` / `medicamento` → `"FARMACEUTICA"`; `operador logistico` / `almacenamiento` /
`deposito` / `bodega` / `transporte` → `"LOGISTICA"`; cualquier otra cosa → `"INDUSTRIA"`.
Farmacéutica se evalúa antes que logística. `consolidateRows(rows)` — agrupa por
`normalizeCompanyName(row.empresa)`; ganador = fila con más campos con valor entre `telefonos.length
> 0`, `email`, `tipo`, `perfilOperacional`, `evidenciaOperacional`, `proximoPaso`, `observacion`;
empate → menor `RADAR_SHEETS[sheetTag]`. `interface RadarProspect` + `toRadarProspect(row)`
(`category: row.tipo`, `segment: classifySegment(...)`, `phone: row.telefonos[0] ?? null`,
`phonesExtra: row.telefonos.slice(1)`, `email: row.email`, `contactName: null`, `notesParts:
{ perfil, evidencia, proximoPaso, observacion }`, `commune: null`).

Extender `radar.test.ts`.

**Files**
- `lib/outreach/radar.ts` — edit: `classifySegment`, `consolidateRows`, `toRadarProspect`, `RadarProspect`
- `lib/outreach/radar.test.ts` — edit: casos nuevos

**Acceptance**

1. **WHEN** un texto contiene `"laboratorio"` **THE SYSTEM SHALL** clasificar `"FARMACEUTICA"`.
2. **WHEN** un texto contiene `"bodega"` y ninguna keyword farmacéutica **THE SYSTEM SHALL** clasificar `"LOGISTICA"`.
3. **WHEN** un texto no contiene ninguna keyword **THE SYSTEM SHALL** clasificar `"INDUSTRIA"`.
4. **WHEN** la misma empresa aparece en dos hojas con distinto conteo de campos con valor **THE SYSTEM SHALL** quedarse con la fila de más campos; si empatan, con la de la hoja de mayor prioridad (PROSPECTOS antes que TOP20 antes que TOP25).
5. **WHEN** `toRadarProspect` recibe una fila con tres teléfonos **THE SYSTEM SHALL** poner el primero en `phone` y los otros dos en `phonesExtra`.
6. **WHEN** `npx vitest run lib/outreach/radar.test.ts` runs **THE SYSTEM SHALL** exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/radar.test.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "step 4: lib/outreach/radar.ts — classifySegment, consolidateRows, toRadarProspect + tests"
git tag step-04-radar-classify
```

---

### `E1-T5` — scripts/import-radar-pallets.ts + spec + alias import:radar

**Depends on:** `E1-T4` · **Priority:** p0

Nuevo `scripts/import-radar-pallets.ts`, patrón exacto de `scripts/import-prospects.ts`:
`loadEnvLocal()` copiado verbatim; lee `data/prospects/raw/radar_{prospectos,top20,top25}.csv` (si
falta alguno → `throw` con mensaje claro); `parseRadarSheet` × 3 → `consolidateRows` →
`toRadarProspect`; `findOrCreateCompany` (indexa TODAS las `Company` por `normalizeCompanyName(c.name)`
una vez con un `findMany({ select: {...} })`, match exacto; `fillData` sólo de campos vacíos —
incluido `segment` si `null`; si no existe, `create` y agregar al índice); `findOrCreateContact`
(`findFirst` por `companyId` + `OR:[email equals insensitive, phone exact]`; si matchea → `fillData`
de `email`/`phone`/`notes` vacíos + `callStatus: "POR_LLAMAR"` sólo si `existing.callStatus ===
null` y `phone && !email`; si no matchea → `create` con `name: contactName ?? empresa`, `source:
"IMPORT"`, `temperature: "FRIO"`, `callStatus: phone && !email ? "POR_LLAMAR" : null`, `notes` =
join `\n` de `"Origen: Radar de Clientes Pallets V7"` + `"Teléfonos adicionales: …"` (si hay) +
`"Perfil operacional: …"` + `"Evidencia operacional: …"` + `"Próximo paso: …"` + `"Observación: …"`
de los `notesParts` no-null); si el email entrante no matchea ningún contacto de la empresa que ya
tiene contactos → `create` uno nuevo). `interface ImportStats` con
`companiesCreated`/`companiesUpdated`/`contactsCreated`/`contactsEnriched`/`phoneOnlyMarked`/
`skippedNoContactInfo`/`dedupedWithinBatch` + `bySegment: { LOGISTICA, FARMACEUTICA, INDUSTRIA }`.
Flag `--dry-run` (`process.argv.includes("--dry-run")`) — no escribe, imprime el plan + stats.
`main().catch(e => { console.error(e); process.exitCode = 1; })`.

`scripts/import-radar-pallets.spec.md` — formato de `import-prospects.spec.md`. `package.json`
scripts: `"import:radar": "ts-node --project tsconfig.scripts.json scripts/import-radar-pallets.ts"`.

**Files**
- `scripts/import-radar-pallets.ts` — new
- `scripts/import-radar-pallets.spec.md` — new
- `package.json` — edit: agregar `scripts["import:radar"]`

**Acceptance**

1. **WHEN** `npm run typecheck` y `npm run build` corren **THE SYSTEM SHALL** exit 0.
2. **WHEN** se busca la clave `"import:radar"` en `package.json` **THE SYSTEM SHALL** encontrarla apuntando a `ts-node --project tsconfig.scripts.json scripts/import-radar-pallets.ts`.
3. **WHEN** se lee `scripts/import-radar-pallets.ts` **THE SYSTEM SHALL** manejar el flag `--dry-run` (no escribe, imprime el plan), acumular `bySegment` en el `ImportStats`, y setear `callStatus: "POR_LLAMAR"` sólo cuando el contacto tiene teléfono y no tiene correo.
4. **WHEN** `test -f scripts/import-radar-pallets.spec.md` runs **THE SYSTEM SHALL** exit 0.
5. **WHEN** el importador enriquece una `Company` o un `Contact` existente **THE SYSTEM SHALL** rellenar sólo campos hoy vacíos y nunca sobrescribir un valor presente.

**Verify**

```bash
npm run typecheck
npm run build
grep -q '"import:radar"' package.json
grep -q dry-run scripts/import-radar-pallets.ts
grep -q bySegment scripts/import-radar-pallets.ts
grep -q POR_LLAMAR scripts/import-radar-pallets.ts
test -f scripts/import-radar-pallets.spec.md
```

> La corrida real (`npm run import:radar -- --dry-run` y luego sin flag) necesita `.env.local` con
> Neon y los 3 CSV. Es un paso **manual post-build** — ver `blueprint.md` §12. No es un `verify`.

**Checkpoint**

```bash
git add -A && git commit -m "step 5: scripts/import-radar-pallets.ts + spec + alias import:radar"
git tag step-05-importer
```

---

### `E1-T6` — Plantilla industria-v1 + registro en TEMPLATES + tests de render

**Depends on:** `E1-T2` · **Priority:** p1

Nuevo `lib/outreach/templates/industria.ts` — espejo exacto de `logistica.ts` (misma firma
`(input: ProspectEmailInput, footer: SenderFooterInfo) => RenderedEmail`, `renderGreeting`,
`comunaLine`, `subject` plain string, `bodyHtml` con `escapeHtml` en cada valor, `bodyText` array
`.join("\n")`, `return assembleEmail(...)`). Comentario de cabecera con el Dolor/Oferta/Gancho de
INDUSTRIA (ver el bloque literal en `blueprint.md` §9 Step 6). `subject` sugerido: `"Pallets fuera
de norma en su planta${comunaLine} — los retiramos y reponemos con reparados certificados"`.

Editar `lib/outreach/templates/index.ts`: `import { renderIndustriaEmail } from "./industria";` +
`"industria-v1": renderIndustriaEmail,` en `TEMPLATES`.

Editar `lib/outreach/templates/render.test.ts`: `describe("plantilla industria")` espejo del de
segmento (saludo fallback con `contacto: null`; comuna null sin literal `"null"`; sin `<img`; sin
`"GRATIS"` en el subject; pie legal presente) + extender el `describe` del registro para
`getTemplate("industria-v1")`.

**Files**
- `lib/outreach/templates/industria.ts` — new
- `lib/outreach/templates/index.ts` — edit: import + entrada en `TEMPLATES`
- `lib/outreach/templates/render.test.ts` — edit: `describe("plantilla industria")` + registro

**Acceptance**

1. **WHEN** `getTemplate("industria-v1")` se llama **THE SYSTEM SHALL** devolver `renderIndustriaEmail`.
2. **WHEN** `renderIndustriaEmail({ empresa: "X", comuna: null, rubro: null, contacto: null }, footer)` se llama **THE SYSTEM SHALL** producir el saludo `"Estimados"` y ningún `"sin dato"`, `"null"` ni `"{{"` en `html` ni en `text`.
3. **WHEN** se inspecciona el `html` producido **THE SYSTEM SHALL** no contener `<img`.
4. **WHEN** se inspecciona el `subject` producido **THE SYSTEM SHALL** no contener `"GRATIS"`.
5. **WHEN** el pie se arma **THE SYSTEM SHALL** contener `footer.legalName`, `footer.rut` y `footer.unsubscribeUrl` (vía `assembleEmail`).
6. **WHEN** `npx vitest run lib/outreach/templates/render.test.ts` runs **THE SYSTEM SHALL** exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/templates/render.test.ts
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 6: plantilla industria-v1 + registro + tests de render"
git tag step-06-industria-template
```

---

## Epic acceptance

La épica está lista cuando las 6 tareas están `done` **y**:

1. **WHEN** `git tag -l 'step-0[1-6]-*'` runs **THE SYSTEM SHALL** listar 6 tags (uno por paso 1-6).
2. **WHEN** `npm run typecheck && npm run test && npm run build` runs desde la raíz **THE SYSTEM SHALL** exit 0 — el schema nuevo compila, los tests de `radar.ts` y de la plantilla `industria` pasan, la app buildea.
3. **WHEN** `npx prisma validate` runs con `DATABASE_URL`/`DIRECT_URL` exportadas **THE SYSTEM SHALL** exit 0 — el schema con `INDUSTRIA` + `CallStatus` + `Contact.callStatus` es válido y está aplicado a Neon.

```bash
npm run typecheck && npm run test && npm run build
git tag -l 'step-0[1-6]-*'
```

## Pitfalls

- **`radar.ts` importa `@/lib/outreach/prospects` en vez de `./prospects`** — compila con `tsc`
  pero `npx vitest run` muere con "Cannot find module". Vitest no resuelve el alias `@/`. Usar
  imports relativos.
- **`db push` (E1-T2) contra el pooler** — se cuelga. Es `DIRECT_URL` (host sin `-pooler`).
- **Escribir una fila con `segment: "INDUSTRIA"` en el mismo `db push` que agrega el valor** —
  Postgres lo rechaza (`unsafe use of new value`). El `db push` de E1-T2 SÓLO agrega el valor; el
  seed y el importador escriben con él después.
- **Tocar `slugify`/`dedupeKey` de `prospects.ts`** para "reusar" en el Radar — rompe
  `prospects.test.ts` y la idempotencia de `import-prospects.ts`. `normalizeCompanyName` es
  función NUEVA y separada.
- **`consolidateRows` con match por substring** — fusiona "Novofarma Service" con "Laboratorio
  Novofarma Service", que son empresas distintas en el CSV farmacéutico real. Match exacto tras
  normalizar.
- **Poner un `.spec.md` en `lib/outreach/templates/`** — ese directorio es la única excepción a la
  convención del repo; no lo tiene y no debe tenerlo.

## Before moving on

- [ ] Las 6 tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los `verify` de las 6 tareas pasaron, no sólo el primero de cada una.
- [ ] Ningún `verify` fue editado, y ninguno se saltó porque un archivo que nombra no existía.
- [ ] Los 6 tags `step-0[1-6]-*` están en git.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio desde la raíz.
- [ ] Los contratos "Produced" existen con la firma indicada (`parseRadarSheet`, `splitPhones`,
      `normalizeCompanyName`, `classifySegment`, `consolidateRows`, `toRadarProspect`,
      `renderIndustriaEmail`, `TEMPLATES["industria-v1"]`).
- [ ] Ningún archivo fuera del subárbol de esta épica fue modificado.
- [ ] `VARIABLES_ENTORNO.md` actualizado con `OUTREACH_DAILY_CAP`.
- [ ] Un commit por tarea, cada uno prefijado con `step N:`, cada uno seguido de su tag.
