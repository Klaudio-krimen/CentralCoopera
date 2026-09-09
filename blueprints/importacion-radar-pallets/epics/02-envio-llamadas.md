# Epic 02: Motor de envío y lista de llamadas

> Después de esta épica: existe la campaña `INDUSTRIA` (`isActive=false`); el cron respeta un tope
> global de 25/día, manda un solo correo por empresa y se salta las empresas con gestión telefónica
> iniciada; y el CRM tiene una vista `/admin/crm/llamadas` con el estado de gestión telefónica
> editable in-line.

| | |
|---|---|
| **Epic id** | `02-envio-llamadas` |
| **Tasks** | `E2-T1` … `E2-T6` |
| **Depends on** | `01-ingesta-modelo` (el schema con `INDUSTRIA` + `CallStatus` + `Contact.callStatus` aplicado; la plantilla `industria-v1` registrada) |
| **Unlocks** | — (última épica) |
| **Parallel with** | — |

No necesitás ningún otro archivo para completar esta épica. Todo lo de abajo está repetido acá a
propósito.

---

## Stack

Next.js 14.2.35 (App Router) · TypeScript 5.9.3 · Tailwind 3 + tokens `crm-*` + `@base-ui/react`
primitivos (`components/crm/ui/*`) · PostgreSQL en Neon · Prisma 5.22.0 · NextAuth v4.24.15 ·
Vercel · Vitest 4.1.9. Gestor: `npm`. **Este cambio no agrega ni sube ninguna dependencia.**

| Task | Command |
|---|---|
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Test (todo) | `npm run test` |
| Test (un archivo) | `npx vitest run lib/outreach/eligibility.test.ts` |
| Build | `npm run build` |
| Seed de campañas (manual, post-build) | `npm run seed:outreach-campaigns` |

**Gate:** `npm run typecheck && npm run test && npm run build` pasa antes de marcar cualquier tarea
de esta épica como done. **`next lint` NUNCA es compuerta.**

Esta épica no verifica contra ningún servicio local: `eligibility.ts` es puro; las rutas y la
página se validan con `typecheck` + `build` + `grep` estructural (el repo no tiene test de rutas).

## Directory subtree

Sólo lo que esta épica toca:

```
lib/outreach/
  prospects.ts                                # EXISTE, read-only — eligibility.ts REPLICA su array GENERIC_PREFIXES (privado de prospects.ts, no exportado)
  eligibility.ts                              # NEW E2-T2 — reparto de cupo + selección de contacto (puro)
  eligibility.test.ts                         # NEW E2-T2 — Vitest de eligibility.ts
  templates/index.ts                          # EXISTE (E1-T6 registró "industria-v1") — el cron llama getTemplate
scripts/
  seed-outreach-campaigns.ts                  # EDIT E2-T1 — 3ª entrada CAMPAIGNS (INDUSTRIA)
PROSPECCION_OUTREACH.md                        # EDIT E2-T3 — §11 Fase 4 ya existe; nota del tope global
app/
  api/
    cron/outreach/route.ts                    # EDIT E2-T3 — usa eligibility.ts, tope global, 1 por empresa, exclusión
    cron/outreach/route.spec.md               # EDIT E2-T3 — nueva query de elegibilidad
    llamadas/route.ts                         # NEW E2-T4 — GET + PATCH /api/llamadas
    llamadas/route.spec.md                    # NEW E2-T4 — spec de la ruta
  (admin)/admin/crm/
    outreach/page.tsx                         # EDIT E2-T1 — INDUSTRIA en SEGMENT_LABEL
    clientes/page.tsx                         # EXISTE, read-only — patrón de página de lista (server + prisma directo)
    llamadas/page.tsx                         # NEW E2-T6 — vista de lista de llamadas
    llamadas/page.spec.md                     # NEW E2-T6 — spec de la página
components/
  ui/
    TemperatureBadge.tsx                      # EXISTE, read-only — CallStatusBadge se clona de acá
    CallStatusBadge.tsx                       # NEW E2-T5 — badge read-only del estado
    CallStatusBadge.spec.md                   # NEW E2-T5
    AdminSidebar.tsx                          # EDIT E2-T6 — ítem de nav "Llamadas"
  crm/
    CompletarActividadButton.tsx              # EXISTE, read-only — patrón "mutar campo → toast → refresh"
    ui/select.tsx                             # EXISTE, read-only — el primitivo <Select> que envuelve CallStatusSelect
    ui/table.tsx                              # EXISTE, read-only — primitivos de tabla para ListaLlamadas
    CallStatusSelect.tsx                      # NEW E2-T5 — editor in-line del estado (PATCH → toast → refresh)
    CallStatusSelect.spec.md                  # NEW E2-T5
    ListaLlamadas.tsx                          # NEW E2-T6 — tabla cliente de la vista de llamadas
```

Todo lo que esté fuera de este subárbol está fuera de alcance. Si una tarea parece requerir editar
un archivo no listado, parar y reportar — el límite de la épica está mal.

## Data model touched here

| Entity | Fields this epic reads / filters on | Notes |
|---|---|---|
| `Contact` | `callStatus`, `phone`, `email`, `name`, `company` | `GET/PATCH /api/llamadas` lo lee y actualiza; el cron filtra por `callStatus` a nivel empresa (`NOT: { contacts: { some: { callStatus: { not: null, notIn: ["POR_LLAMAR"] } } } }`). |
| `Company` | `segment`, `isActive`, `outreachSends`, `contacts` | El cron elige empresas elegibles y luego un contacto por empresa. |
| `OutreachCampaign` | `segment`, `dailyCap`, `templateKey`, `isActive`, `pdfBlobUrl` | E2-T1 agrega la 3ª (`INDUSTRIA`, `isActive:false`). El cron itera las activas. |
| `OutreachSend` | `campaignId`, `contactId`, `companyId`, `status`, `sentAt` | `@@unique([campaignId, contactId])` — respaldo de idempotencia, no se toca. El cron cuenta `sentAt` = hoy para el tope global. |

Sin cambios de schema en esta épica (los hizo E1-T2).

## Contracts

**Consumed** — ya existe, no lo rebuildees:

| From | Interface | Guarantee |
|---|---|---|
| `E1-T2` (schema) | `enum CallStatus`, `Contact.callStatus CallStatus?` | Nullable; el importador pone `POR_LLAMAR` a los phone-only. |
| `E1-T6` | `lib/outreach/templates/index.ts` `getTemplate("industria-v1")` | Resuelve a `renderIndustriaEmail`; lanza si la clave falta. |
| `lib/outreach/prospects.ts` | `const GENERIC_PREFIXES` — **privado del módulo, NO exportado** | `["contacto","info","ventas","contact","sac","atencion","hola"]`. `eligibility.ts` **replica** este array como `const` local; no lo importa. |
| `lib/access.ts` | `hasModuleAccess(user, "CRM"): boolean` | `user.role === "ADMIN" \|\| user.moduleAccess.includes("CRM")`. Firma congelada — no se toca. |
| `lib/utils.ts` | `apiError(message: string, status = 400)` | `NextResponse.json({ error: message }, { status })`. Nunca redirect en `/api/*`. |
| `@/lib/auth` | `authOptions` (para `getServerSession`) | Sesión JWT; `session.user` = `{ id, name, email, role, moduleAccess, image }`. |
| `app/api/cron/outreach/route.ts` (parte que NO cambia) | `isAuthorized(req)`, `ensureSystemUser()`, `jitterMs()`, `sendMail`, el guard de env legales, `export const dynamic = "force-dynamic"`, respuesta 200 siempre | Se preservan tal cual. |
| `components/ui/TemperatureBadge.tsx` | patrón `Record<Enum, { label, className, dot }>` + prop `size` + fallback | `CallStatusBadge` lo clona. |
| `components/crm/ui/select.tsx` | `<Select value onValueChange>` con `SelectTrigger`/`SelectContent`/`SelectItem` | Portaliza el content (`z-50`), soporta `size="sm"` — cabe en un `<TableCell>`. |
| `components/crm/CompletarActividadButton.tsx` | patrón `'use client'` + `useState(loading)` + `fetch PATCH` + `if(!res.ok) throw` + `toast` + `router.refresh()` + spinner | `CallStatusSelect` lo replica. |

**Produced** — dependen de estas firmas:

| Export | Signature | Used by |
|---|---|---|
| `lib/outreach/eligibility.ts` → `allocateDailyBudget` | `(campaigns: { id: string; dailyCap: number }[], poolSizes: Record<string, number>, globalCap: number) => Record<string, number>` | `app/api/cron/outreach/route.ts` (E2-T3) |
| `lib/outreach/eligibility.ts` → `pickCompanyContact` | `(contacts: { id: string; email: string; createdAt: Date }[]) => string \| null` | E2-T3 |
| `lib/outreach/eligibility.ts` → `isCompanyPhoneManaged` | `(contacts: { callStatus: string \| null }[]) => boolean` | E2-T3 (documenta la regla; la query Prisma la replica con `notIn`) |
| `app/api/llamadas/route.ts` → `GET` / `PATCH` | `/api/llamadas` — GET lista contactos con teléfono (`?callStatus=`, `?q=`); PATCH `{ id, callStatus }` | `components/crm/CallStatusSelect.tsx` (E2-T5), `components/crm/ListaLlamadas.tsx` (E2-T6) |
| `components/ui/CallStatusBadge.tsx` → default export | `({ callStatus, size }) => JSX` | `ListaLlamadas.tsx` (E2-T6), fichas de contacto (opcional) |
| `components/crm/CallStatusSelect.tsx` → default export | `({ contactId, value }) => JSX` | `ListaLlamadas.tsx` (E2-T6) |

## Conventions that bite in this area

- **`eligibility.ts` es puro.** Sin Prisma, sin `fs`, imports relativos (`./prospects` sólo si hace
  falta). `GENERIC_PREFIXES` es **privado** de `prospects.ts` (no exportado) → **replicar** el array
  como `const` local: `["contacto","info","ventas","contact","sac","atencion","hola"]`. Recibe todo
  por parámetro. Vitest sólo recoge `lib/**/*.test.ts`.
- **Rutas de API del CRM: gate DENTRO del handler**, en CADA método exportado:
  `const session = await getServerSession(authOptions); if (!session) return apiError("No
  autorizado", 401); if (!hasModuleAccess(session.user, "CRM")) return apiError("Acceso denegado",
  403);`. **`/api/finanzas` es la única que gatea en middleware — el CRM no.**
- **"VENTAS o ADMIN" = `hasModuleAccess(session.user, "CRM")`**, nunca `session.user.role ===
  "VENTAS"`.
- **`apiError` siempre**, forma `{ error: string }` + status. **Nunca `NextResponse.redirect` en un
  handler `/api/*`** — un `fetch` que recibe un redirect a `/login` obtiene HTML y el bug aparece
  como error de parseo JSON.
- **Validación de enum a mano:** `const CALL_STATUSES = ["POR_LLAMAR","LLAMADA","SIN_RESPUESTA",
  "CORREO_CONSEGUIDO"] as const;` + `.includes()`. PATCH parcial con spread condicional
  `...(callStatus !== undefined ? { callStatus } : {})`. **No** adoptar `zod` (acotado a
  `app/api/finanzas/*`).
- **Timestamps del servidor.** El PATCH de `/api/llamadas` no acepta ninguna fecha del cliente.
- **La lista de llamadas NO escribe `Activity`.** El estado de gestión telefónica es un estado, no
  una línea de tiempo — igual que `ContactTemperature`. `Activity` la sigue escribiendo sólo el
  cron (correo enviado) y el resto del CRM.
- **El cron responde 200 SIEMPRE** (sin campañas activas, sin elegibles, con env faltante) — sólo
  401 si falla `isAuthorized`. Nunca 4xx/5xx sobre un lote que Vercel deba reintentar.
- **Idempotencia del cron por empresa:** la query excluye empresas con `OutreachSend` para la
  campaña (`company: { outreachSends: { none: { campaignId } } }`) + el `@@unique([campaignId,
  contactId])` de respaldo. El "1 por empresa" NO se implementa cambiando el constraint.
- **Página de lista = server component** con `async function getX()` que llama `prisma` DIRECTO
  (nunca `fetch`), pasa la data a un componente `'use client'`. La API existe para las mutaciones
  y el export, no para alimentar la página.
- **Sólo tokens/clases `crm-*`** (`bg-crm-*`, `text-crm-*`, `.crm-card`, primitivos de
  `components/crm/ui/*`). **Prohibido** `.card` / `.btn-primary` / `.input-base` (emerald/zinc, son
  de los otros módulos). Si un token `crm-*` del mapeo del badge no existe exactamente, usar el más
  cercano definido en `tailwind.config.ts` y anotarlo en el `.spec.md`.
- **Íconos:** `@phosphor-icons/react` en el `AdminSidebar` (importar arriba, agregar al array
  `nav` del `ModuleDef` `key: "crm"`). `lucide-react` en tablas/detalle si hace falta.

Reglas completas: `CLAUDE.md`. Reglas de área: `.claude/rules/radar-pallets.md`.

---

## Tasks

Listadas en el mismo orden que `tasks.json` — ese orden es el orden de construcción.

### `E2-T1` — Seed de la campaña Industria + INDUSTRIA en SEGMENT_LABEL del panel

**Depends on:** `E1-T6` · **Priority:** p1

Editar `scripts/seed-outreach-campaigns.ts` — agregar como 3ª entrada de `CAMPAIGNS`:
`{ name: "Outreach frío — Industria", segment: "INDUSTRIA" as const, subject: "Pallets fuera de
norma en su planta — los retiramos y reponemos con reparados certificados", templateKey:
"industria-v1" }`. El `create` del script ya propaga `pdfBlobUrl` + `isActive: false`. No tocar
nada más del script.

Editar `app/(admin)/admin/crm/outreach/page.tsx` — agregar `INDUSTRIA: "Industria"` al objeto
`SEGMENT_LABEL`.

**Files**
- `scripts/seed-outreach-campaigns.ts` — edit: 3ª entrada en `CAMPAIGNS`
- `app/(admin)/admin/crm/outreach/page.tsx` — edit: `SEGMENT_LABEL`

**Acceptance**

1. **WHEN** se lee el array `CAMPAIGNS` de `scripts/seed-outreach-campaigns.ts` **THE SYSTEM SHALL** tener una tercera entrada con `segment: "INDUSTRIA" as const` y `templateKey: "industria-v1"`.
2. **WHEN** se lee `SEGMENT_LABEL` en `app/(admin)/admin/crm/outreach/page.tsx` **THE SYSTEM SHALL** incluir la clave `INDUSTRIA` con etiqueta `"Industria"`.
3. **WHEN** `npm run typecheck` runs **THE SYSTEM SHALL** exit 0 (`segment: "INDUSTRIA" as const` compila contra el enum ya extendido).
4. **WHEN** `npm run build` runs **THE SYSTEM SHALL** exit 0.

**Verify**

```bash
grep -q '"industria-v1"' scripts/seed-outreach-campaigns.ts
grep -Eq 'INDUSTRIA:\s*"Industria"' 'app/(admin)/admin/crm/outreach/page.tsx'
npm run typecheck
npm run build
```

> `npm run seed:outreach-campaigns` (crea la fila real, `isActive:false`) es **manual post-build**
> — necesita Neon.

**Checkpoint**

```bash
git add -A && git commit -m "step 7: seed de la campaña Industria + INDUSTRIA en SEGMENT_LABEL del panel"
git tag step-07-seed-industria
```

---

### `E2-T2` — lib/outreach/eligibility.ts — allocateDailyBudget, pickCompanyContact, isCompanyPhoneManaged + tests

**Depends on:** `E1-T2` · **Priority:** p0

Nuevo `lib/outreach/eligibility.ts`, puro. **`GENERIC_PREFIXES` es privado de `prospects.ts` (no
exportado)** → replicar el array como `const` local: `["contacto", "info", "ventas", "contact",
"sac", "atencion", "hola"]`. `allocateDailyBudget(campaigns, poolSizes, globalCap)`
→ reparto proporcional al pool de cada campaña (cada asignación ≤ `dailyCap` y ≤ pool; si
`sum(pools) <= globalCap` cada campaña toma `min(pool, dailyCap)`; si no, `floor(globalCap * pool /
total)` con cap, y el remanente por redondeo se reparte de a 1 en orden de mayor pool restante
hasta agotar `globalCap` o los pools). `pickCompanyContact(contacts)` → id del contacto: prefijo
local (antes del `@`) en el array de prefijos genéricos primero; entre varios, el de menor
`createdAt`; sin genéricos, el de menor `createdAt` global; `[]` → `null`. `isCompanyPhoneManaged(contacts)`
→ `true` si algún contacto tiene `callStatus != null && callStatus !== "POR_LLAMAR"`.

`lib/outreach/eligibility.test.ts` con los casos de la Acceptance.

**Files**
- `lib/outreach/eligibility.ts` — new
- `lib/outreach/eligibility.test.ts` — new

**Acceptance**

1. **WHEN** `allocateDailyBudget` recibe tres campañas con `dailyCap` 25 c/u, pools 60/10/5 y `globalCap` 25 **THE SYSTEM SHALL** devolver un objeto cuya suma de valores es ≤ 25 y donde la campaña de pool 60 recibe estrictamente más que las otras dos.
2. **WHEN** una campaña tiene pool 0 **THE SYSTEM SHALL** asignarle 0 y repartir su cuota entre las demás.
3. **WHEN** `sum(pools) <= globalCap` y ninguna campaña llega a su `dailyCap` **THE SYSTEM SHALL** asignar a cada campaña exactamente su pool.
4. **WHEN** `pickCompanyContact` recibe un contacto genérico nuevo y uno nominativo viejo **THE SYSTEM SHALL** devolver el id del genérico; si todos son nominativos **THE SYSTEM SHALL** devolver el de menor `createdAt`.
5. **WHEN** `isCompanyPhoneManaged` recibe algún contacto con `callStatus` distinto de `null` y de `"POR_LLAMAR"` **THE SYSTEM SHALL** devolver `true`; en otro caso **THE SYSTEM SHALL** devolver `false`.
6. **WHEN** `npx vitest run lib/outreach/eligibility.test.ts` runs **THE SYSTEM SHALL** exit 0 con 0 fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/outreach/eligibility.test.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "step 8: lib/outreach/eligibility.ts — allocateDailyBudget, pickCompanyContact, isCompanyPhoneManaged + tests"
git tag step-08-eligibility
```

---

### `E2-T3` — Reescritura del cron: tope global, 1 correo por empresa, exclusión por gestión telefónica

**Depends on:** `E1-T6`, `E2-T2` · **Priority:** p0

Reescribir `app/api/cron/outreach/route.ts`. `const globalCap = Number(process.env.OUTREACH_DAILY_CAP
?? 25)`. Query de elegibilidad **por empresa**: `Company` con `isActive: true`, `segment:
campaign.segment`, `outreachSends: { none: { campaignId: campaign.id } }`, `NOT: { contacts: {
some: { callStatus: { not: null, notIn: ["POR_LLAMAR"] } } } }`, y `contacts: { some: { email: {
not: null }, optOut: false, emailStatus: { not: "REBOTADO" } } }`; `include` los contactos
elegibles. Restar lo enviado hoy: `prisma.outreachSend.count({ where: { sentAt: { gte: <inicio del
día UTC> } } })` → `presupuesto = Math.max(0, globalCap - enviadosHoy)`. `allocateDailyBudget(...)`
de `lib/outreach/eligibility.ts`; por campaña `take` su asignación de empresas; por empresa
`pickCompanyContact(contactosElegibles)`. Preservar intacto: `isAuthorized(req)`, el guard de env
legales (200 sin enviar), `jitterMs()`, `ensureSystemUser()`, `getTemplate(campaign.templateKey)`,
la escritura de `OutreachSend` (`ENVIADO`/`FALLIDO`) + `Activity(type: "EMAIL")`, la respuesta 200
siempre, `export const dynamic = "force-dynamic"`.

Actualizar `app/api/cron/outreach/route.spec.md` (nueva query, tope global, 1 por empresa,
exclusión por gestión telefónica). En `PROSPECCION_OUTREACH.md` §11: corregir la Fase 4 Visibilidad
(`[ ]` → `[x]`, el endpoint y el panel ya existen) y agregar una línea sobre el tope global de
25/día repartido entre las 3 campañas.

**Files**
- `app/api/cron/outreach/route.ts` — edit: reescritura de la selección
- `app/api/cron/outreach/route.spec.md` — edit: nueva query de elegibilidad
- `PROSPECCION_OUTREACH.md` — edit: §11 Fase 4 + nota del tope global

**Acceptance**

1. **WHEN** se lee `app/api/cron/outreach/route.ts` **THE SYSTEM SHALL** leer `process.env.OUTREACH_DAILY_CAP` (default 25), usar `allocateDailyBudget` de `lib/outreach/eligibility.ts`, y excluir de la query toda empresa con un contacto cuyo `callStatus` no sea `null` ni `"POR_LLAMAR"`.
2. **WHEN** el handler recibe un GET sin `Authorization: Bearer $CRON_SECRET` ni `x-cron-secret` **THE SYSTEM SHALL** responder 401 (`isAuthorized` intacto).
3. **WHEN** no hay campañas activas **THE SYSTEM SHALL** responder 200 con `sent: 0`.
4. **WHEN** se lee `PROSPECCION_OUTREACH.md` §11 **THE SYSTEM SHALL** contener una línea con `OUTREACH_DAILY_CAP` que documenta el tope global repartido entre las 3 campañas.
5. **WHEN** `npm run typecheck` y `npm run build` corren **THE SYSTEM SHALL** exit 0.

**Verify**

```bash
grep -q OUTREACH_DAILY_CAP app/api/cron/outreach/route.ts
grep -Eq 'allocateDailyBudget|lib/outreach/eligibility' app/api/cron/outreach/route.ts
grep -q callStatus app/api/cron/outreach/route.ts
grep -q isAuthorized app/api/cron/outreach/route.ts
grep -q OUTREACH_DAILY_CAP PROSPECCION_OUTREACH.md
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 9: cron outreach — tope global OUTREACH_DAILY_CAP, 1 correo por empresa, exclusión por gestión telefónica"
git tag step-09-cron-rewrite
```

---

### `E2-T4` — app/api/llamadas — GET + PATCH del estado de gestión telefónica

**Depends on:** `E1-T2` · **Priority:** p0

Nuevo `app/api/llamadas/route.ts`. Imports estándar de una ruta CRM. `const CALL_STATUSES =
["POR_LLAMAR", "LLAMADA", "SIN_RESPUESTA", "CORREO_CONSEGUIDO"] as const;`.

**GET**: prólogo de auth (`!session` → `apiError("No autorizado", 401)`;
`!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso denegado", 403)`). Lee
`req.nextUrl.searchParams`: `callStatus` (si viene y no está en `CALL_STATUSES` → `apiError("Estado
de gestión telefónica inválido")`), `q`. `prisma.contact.findMany({ where: { phone: { not: null },
...(callStatus ? { callStatus } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive"
} }, { company: { name: { contains: q, mode: "insensitive" } } }] } : {}) }, select: { id, name,
phone, email, callStatus, company: { select: { id, name, segment } } }, orderBy: { company: {
name: "asc" } } })` → `NextResponse.json(contacts)`.

**PATCH**: mismo prólogo de auth. `const { id, callStatus } = await req.json()`. `if (!id) return
apiError("id requerido")`. `if (callStatus !== undefined && callStatus !== null &&
!CALL_STATUSES.includes(callStatus)) return apiError("Estado de gestión telefónica inválido")`.
`try { const contact = await prisma.contact.update({ where: { id }, data: { ...(callStatus !==
undefined ? { callStatus } : {}) } }); return NextResponse.json(contact); } catch { return
apiError("Contacto no encontrado", 404); }`.

`app/api/llamadas/route.spec.md`.

**Files**
- `app/api/llamadas/route.ts` — new
- `app/api/llamadas/route.spec.md` — new

**Acceptance**

1. **WHEN** se lee `app/api/llamadas/route.ts` **THE SYSTEM SHALL** abrir GET y PATCH con el prólogo `getServerSession(authOptions)` → `apiError("No autorizado", 401)` → `!hasModuleAccess(session.user, "CRM")` → `apiError("Acceso denegado", 403)`, sin ningún `NextResponse.redirect`.
2. **WHEN** un usuario con sesión válida pero sin `"CRM"` en `moduleAccess` y sin rol `ADMIN` hace GET **THE SYSTEM SHALL** responder 403 con `{ error: "Acceso denegado" }` en JSON.
3. **WHEN** un GET trae `?callStatus=SIN_RESPUESTA` **THE SYSTEM SHALL** devolver sólo contactos con teléfono en ese estado.
4. **WHEN** un PATCH trae `callStatus` fuera de `["POR_LLAMAR","LLAMADA","SIN_RESPUESTA","CORREO_CONSEGUIDO"]` **THE SYSTEM SHALL** responder 400 con `{ error: "Estado de gestión telefónica inválido" }` y no escribir.
5. **WHEN** un PATCH válido `{ id, callStatus }` llega **THE SYSTEM SHALL** actualizar sólo `callStatus` del contacto y devolverlo; con un `id` inexistente **THE SYSTEM SHALL** responder 404.
6. **WHEN** `npm run typecheck` y `npm run build` corren **THE SYSTEM SHALL** exit 0.

**Verify**

```bash
grep -q hasModuleAccess app/api/llamadas/route.ts
grep -q CALL_STATUSES app/api/llamadas/route.ts
grep -q apiError app/api/llamadas/route.ts
test -f app/api/llamadas/route.spec.md
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 10: app/api/llamadas — GET + PATCH del estado de gestión telefónica"
git tag step-10-llamadas-api
```

---

### `E2-T5` — CallStatusBadge + CallStatusSelect (editor in-line del estado telefónico)

**Depends on:** `E2-T4` · **Priority:** p0

Nuevo `components/ui/CallStatusBadge.tsx` — clon de `components/ui/TemperatureBadge.tsx`:
`Record<CallStatus, { label, className, dot }>` con clases `crm-*` (mapeo en `blueprint.md` §7 —
ajustar a tokens que existan en `tailwind.config.ts`), prop `size: "sm" | "md"`, fallback a
`POR_LLAMAR` si el valor es desconocido o `null`. Labels: "Por llamar" / "Llamada" / "Sin
respuesta" / "Correo conseguido".

Nuevo `components/crm/CallStatusSelect.tsx` — `'use client'`, props `{ contactId: string; value:
string | null }`. `useState(loading)` + `useRouter()` + `toast` de `sonner`. Envuelve el `<Select>`
de `@/components/crm/ui/select` (`SelectTrigger size="sm"`, `SelectContent` con 4 `SelectItem`).
`onValueChange` → `fetch("/api/llamadas", { method: "PATCH", headers: { "Content-Type":
"application/json" }, body: JSON.stringify({ id: contactId, callStatus: v }) })` → `if (!res.ok)
throw new Error((await res.json()).error)` → `toast.success("Estado actualizado")` →
`router.refresh()`; `catch` → `toast.error("No se pudo actualizar el estado")`; `finally` →
`setLoading(false)`. Mientras `loading`, `<SpinnerGap className="animate-spin" />` en lugar del
trigger (patrón `CompletarActividadButton`).

`components/ui/CallStatusBadge.spec.md` y `components/crm/CallStatusSelect.spec.md`.

**Files**
- `components/ui/CallStatusBadge.tsx` — new
- `components/ui/CallStatusBadge.spec.md` — new
- `components/crm/CallStatusSelect.tsx` — new
- `components/crm/CallStatusSelect.spec.md` — new

**Acceptance**

1. **WHEN** `CallStatusBadge` recibe un `callStatus` desconocido o `null` **THE SYSTEM SHALL** renderizar el estilo y la etiqueta de `POR_LLAMAR` (fallback), con la etiqueta de texto presente además del color.
2. **WHEN** `CallStatusSelect` cambia de valor **THE SYSTEM SHALL** hacer `PATCH /api/llamadas` con `{ id, callStatus }` y, si responde ok, llamar `router.refresh()`.
3. **WHEN** el PATCH de `CallStatusSelect` falla **THE SYSTEM SHALL** mostrar `toast.error` y dejar el control fuera de estado de carga.
4. **WHEN** `npm run typecheck` y `npm run build` corren **THE SYSTEM SHALL** exit 0.

**Verify**

```bash
test -f components/ui/CallStatusBadge.tsx
test -f components/crm/CallStatusSelect.tsx
test -f components/ui/CallStatusBadge.spec.md
test -f components/crm/CallStatusSelect.spec.md
grep -q '/api/llamadas' components/crm/CallStatusSelect.tsx
grep -q router.refresh components/crm/CallStatusSelect.tsx
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 11: CallStatusBadge + CallStatusSelect (editor in-line del estado telefónico)"
git tag step-11-callstatus-components
```

---

### `E2-T6` — Vista /admin/crm/llamadas + ítem de nav en AdminSidebar

**Depends on:** `E2-T5` · **Priority:** p0

Nuevo `app/(admin)/admin/crm/llamadas/page.tsx` — server component. `async function getLlamadas()`
con `prisma.contact.findMany({ where: { phone: { not: null } }, include: { company: { select: { id,
name, segment } } }, orderBy: { company: { name: "asc" } } })`. Header estándar del CRM (`<h1
className="text-2xl font-bold tracking-tight text-crm-foreground">Llamadas</h1>` + `<p
className="text-crm-muted text-sm mt-1">` con el conteo por estado). `<ListaLlamadas data={...} />`.

Nuevo `components/crm/ListaLlamadas.tsx` — `'use client'`. `useState(search)`,
`useState(callStatusFilter)`, `useMemo` para filtrar. Filtros = array `[{ value: null, label:
"Todos" }, ...]` como `<Button size="sm" variant={activo ? "default" : "outline"}>`. Tabla con
`@/components/crm/ui/table` — una fila por contacto: empresa · contacto · teléfono ·
`<CallStatusSelect contactId={c.id} value={c.callStatus} />` in-line en un `<TableCell>`. Click en
la fila (fuera del `<Select>`) → `router.push("/admin/crm/clientes/" + c.company.id)`. Empty state:
`<div className="crm-card text-center py-16">` con ícono y "No hay contactos con teléfono para
llamar."

`app/(admin)/admin/crm/llamadas/page.spec.md`.

Editar `components/ui/AdminSidebar.tsx`: importar `PhoneCall` de `@phosphor-icons/react` arriba, y
agregar al array `nav` del `ModuleDef` `key: "crm"` (después de `{ href: "/admin/crm/outreach", ...
}`, antes de `{ href: "/admin/crm/configuracion", ... }`): `{ href: "/admin/crm/llamadas", label:
"Llamadas", icon: PhoneCall }`.

**Files**
- `app/(admin)/admin/crm/llamadas/page.tsx` — new
- `app/(admin)/admin/crm/llamadas/page.spec.md` — new
- `components/crm/ListaLlamadas.tsx` — new
- `components/ui/AdminSidebar.tsx` — edit: import + ítem de nav en el módulo CRM

**Acceptance**

1. **WHEN** un usuario con `"CRM"` visita `/admin/crm/llamadas` **THE SYSTEM SHALL** renderizar la lista de contactos con teléfono, cada uno con su `callStatus` editable in-line.
2. **WHEN** se activa el filtro `SIN_RESPUESTA` en la lista **THE SYSTEM SHALL** mostrar sólo contactos en ese estado.
3. **WHEN** se hace click en una fila fuera del `<Select>` **THE SYSTEM SHALL** navegar a `/admin/crm/clientes/<companyId>`.
4. **WHEN** no hay contactos con teléfono **THE SYSTEM SHALL** mostrar un empty state, no una tabla vacía sin encabezado.
5. **WHEN** se busca `/admin/crm/llamadas` en `components/ui/AdminSidebar.tsx` **THE SYSTEM SHALL** encontrar el ítem de nav dentro del módulo CRM.
6. **WHEN** `npm run typecheck` y `npm run build` corren **THE SYSTEM SHALL** exit 0.

**Verify**

```bash
grep -q '/admin/crm/llamadas' components/ui/AdminSidebar.tsx
test -f 'app/(admin)/admin/crm/llamadas/page.tsx'
test -f 'app/(admin)/admin/crm/llamadas/page.spec.md'
test -f components/crm/ListaLlamadas.tsx
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "step 12: vista /admin/crm/llamadas + ítem de nav en AdminSidebar"
git tag step-12-llamadas-page
```

---

## Epic acceptance

La épica está lista cuando las 6 tareas están `done` **y**:

1. **WHEN** `git tag -l 'step-0[7-9]-*' 'step-1[0-2]-*'` runs **THE SYSTEM SHALL** listar 6 tags (uno por paso 7-12).
2. **WHEN** `npm run typecheck && npm run test && npm run build` runs desde la raíz **THE SYSTEM SHALL** exit 0 — `eligibility.ts` + sus tests pasan, la ruta `/api/llamadas` y la página `/admin/crm/llamadas` compilan, el cron reescrito buildea.
3. **WHEN** un usuario con `"CRM"` abre `/admin/crm/llamadas` en `npm run dev` y cambia un `callStatus` **THE SYSTEM SHALL** persistir el cambio (PATCH 200) y refrescar la lista.

```bash
npm run typecheck && npm run test && npm run build
git tag -l 'step-0[7-9]-*' 'step-1[0-2]-*'
```

## Pitfalls

- **`eligibility.ts` importa Prisma** para "traer los pools" — rompe el test de Vitest (no resuelve
  `@/`, y aunque lo hiciera necesitaría una BD). El módulo recibe `poolSizes` y las listas de
  contactos **por parámetro**; el `route.ts` del cron hace el I/O y le pasa los datos.
- **La query del cron filtra `Contact` en vez de `Company`** — si filtra contactos, "1 correo por
  empresa" no se logra: una empresa con 3 contactos elegibles vuelve a mandar 3. La query es por
  `Company`, con `include` de sus contactos elegibles, y `pickCompanyContact` elige uno.
- **`middleware.ts` matcher para `/admin/crm/llamadas`** — NO hace falta tocarlo: la rama
  `else if (pathname.startsWith("/admin/crm"))` ya cubre la subruta nueva. Agregar una rama es un
  defecto.
- **`CallStatusSelect` sin `finally` en el `catch`** — deja el control en `loading` para siempre
  tras un error de red. Usar `.finally(() => setLoading(false))`.
- **El `<Select>` in-line dispara el `router.push` de la fila** — el click en el `<Select>` burbujea
  al `onClick` de la fila. El primitivo de `@base-ui` ya para la propagación en su content
  portalizado; si igual pasa, envolver el `<TableCell>` del `<Select>` en un `<div
  onClick={e => e.stopPropagation()}>`.
- **Usar `.card` / `.btn-primary` / `.input-base`** en la página nueva — son de Operaciones
  (emerald/zinc). Sólo `crm-*` y los primitivos de `components/crm/ui/*`.

## Before moving on

- [ ] Las 6 tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los `verify` de las 6 tareas pasaron, no sólo el primero de cada una.
- [ ] Ningún `verify` fue editado, y ninguno se saltó porque un archivo que nombra no existía.
- [ ] Los 6 tags `step-07..step-12` están en git.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio desde la raíz.
- [ ] Los contratos "Produced" existen con la firma indicada (`allocateDailyBudget`,
      `pickCompanyContact`, `isCompanyPhoneManaged`, `GET/PATCH /api/llamadas`, `CallStatusBadge`,
      `CallStatusSelect`).
- [ ] Ningún archivo fuera del subárbol de esta épica fue modificado (en particular `middleware.ts`
      no se volvió a tocar).
- [ ] `.env.example` — este repo no lo usa; `OUTREACH_DAILY_CAP` quedó documentada en
      `VARIABLES_ENTORNO.md` en la épica 01.
- [ ] Un commit por tarea, cada uno prefijado con `step N:`, cada uno seguido de su tag.
