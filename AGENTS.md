# TrackResiduos — instrucciones para agentes

Intranet de Coopera Pro (Santiago, Chile): Operaciones, Inventario, CRM y **Finanzas**.
Next.js 15 (App Router) · TypeScript 5 · Prisma 5 sobre PostgreSQL · NextAuth v4 · Tailwind 4 ·
Vitest · desplegado en Vercel.

## Coordinación entre Codex y Claude

Antes de iniciar trabajo, leer [REGISTRO_TRABAJO.md](./REGISTRO_TRABAJO.md).
Registrar allí la tarea, responsable, estado, archivos previstos y rama antes de editar;
al cerrar, anotar cambios, decisiones, verificaciones y referencia de commit/PR o publicación pendiente.
Respetar las tareas y modificaciones del otro agente. El protocolo completo vive en ese documento.
Las reglas técnicas y de seguridad siguen teniendo su fuente de verdad en `CLAUDE.md`.

## Comandos

| Tarea              | Comando                                      |
| ------------------ | -------------------------------------------- |
| Dev                | `npm run dev`                                |
| Typecheck          | `npm run typecheck`                          |
| Tests (todo)       | `npm run test`                               |
| Test de un archivo | `npx vitest run lib/finanzas/crypto.test.ts` |
| Build              | `npm run build`                              |
| Esquema a la BD    | `npm run db:push` — exige respaldo previo    |
| Inspeccionar la BD | `npm run db:studio`                          |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de dar
por terminada cualquier tarea.

El CLI de Prisma **no** lee `.env.local`. Antes de cualquier comando `prisma`, en el mismo shell:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

## No negociable

1. Validar en el servidor. La validación de cliente es UX, no seguridad.
2. Timestamps del servidor, nunca del cliente.
3. Nunca retornar `User.password` ni `Employee.bankAccountEnc` en una respuesta de API.
4. `prisma.$transaction` cuando se tocan varias tablas.
5. Errores de API siempre vía `apiError()` de `lib/utils.ts`.
6. **Finanzas: nunca uses `hasModuleAccess()`** — tiene bypass de ADMIN. Usa `hasFinanceAccess()` o
   `canWriteFinance()` de `lib/access.ts`.
7. **Finanzas: toda mutación escribe auditoría en la misma transacción**, y todos los montos son
   `Int` en pesos chilenos.
8. Nada de secretos en el repo. Todo a `.env.local`, documentado en `VARIABLES_ENTORNO.md`.
9. Cada componente o ruta nueva lleva su `*.spec.md` al lado.

Arquitectura completa, fronteras, reglas de Finanzas y tokens de diseño: ver `CLAUDE.md` en este
mismo directorio, que es la fuente de verdad.

<!-- ERP-COOPERA:INICIO -->

## Qué es el ERP de Coopera Pro y qué se hace en él

> Guía de contexto para Codex. Resume `README.md`, `PRODUCT.md`, `ARQUITECTURA.md`,
> `FLUJOS_DE_USUARIO.md`, `RASTREO_GPS.md`, `PROSPECCION_OUTREACH.md`,
> `IMPORTACION_RADAR_PALLETS.md`, `INVENTARIO_EPP.md`, `CLAUDE.md` §9–§10 y las specs.
> Si algo aquí contradice el código o `prisma/schema.prisma`, **el código gana** y esta sección
> se corrige. Las reglas duras siguen viviendo en `CLAUDE.md`.

### El negocio en una frase

**Coopera Pro** (Santiago, Chile) es una cooperativa de gestión de residuos y economía circular:
retira material reciclable desde empresas clientes, lo lleva a su bodega y opera un **taller de
pallets** que necesita clientes. **TrackResiduos** (nombre comercial: _Central Coopera_) es su
intranet y, de facto, su ERP: una sola app, una sola base de datos, una sola sesión y un mismo
control de permisos para operación, bodega, ventas y dinero.

Nació para prevenir el **robo hormiga** (sustracción parcial de material por el chofer o en el
trayecto) cerrando la cadena de custodia: lo declarado en el retiro se compara con lo recibido en
bodega. Después crecieron Inventario, CRM y Finanzas.

### Quién lo usa y desde dónde

| Persona / rol                | Dispositivo              | Entra a                                | Necesita                                        |
| ---------------------------- | ------------------------ | -------------------------------------- | ----------------------------------------------- |
| `CHOFER`                     | Celular, en terreno      | `/chofer/*`                            | Botones grandes (≥44px), pocos pasos, sin texto |
| `RECEPCION`                  | Tablet o PC en bodega    | `/recepcion/*`                         | Comparar declarado vs. recibido rápido          |
| `BODEGA`                     | PC                       | `/admin/inventario/*`                  | Stock y movimientos del taller                  |
| `VENTAS`                     | Escritorio, sesión larga | `/admin/crm/*`                         | Pipeline, contactos, llamadas, outreach         |
| `ADMIN`                      | PC                       | `/admin/*` (sin Finanzas)              | Visión completa de Operaciones, CRM, Inventario |
| Finanzas (Marcela/Elizabeth) | Escritorio               | `/admin/finanzas/*` por `moduleAccess` | Tablas densas, montos con signo, auditoría      |

El trabajo es operativo y repetitivo: cada rol vuelve a las mismas 3–5 pantallas muchas veces al
día. Éxito = cada rol termina su tarea sin preguntarle a otro cómo usar la herramienta.

### Modelo de permisos (leer antes de tocar cualquier ruta)

- `UserRole` (`CHOFER RECEPCION ADMIN VENTAS BODEGA FINANZAS`) dice **quién es** el usuario.
- `ModuleAccess[]` (`OPERACIONES CRM INVENTARIO FINANZAS FINANZAS_LECTURA`) dice **qué módulos ve**.
  Para combinaciones (p. ej. supervisor Operaciones + CRM) se usa `moduleAccess`; **no** se crean roles.
- `lib/access.ts`:
  - `hasModuleAccess(user, "OPERACIONES" | "CRM" | "INVENTARIO")` → **ADMIN siempre pasa**.
  - `hasFinanceAccess(user)` / `canWriteFinance(user)` → **sin bypass de ADMIN**. `FINANZAS` escribe,
    `FINANZAS_LECTURA` sólo lee (aunque además sea ADMIN).
- `middleware.ts` gatea páginas por prefijo, en este orden: `/api/finanzas` → `/api/*` (sólo exige
  token) → `/chofer` → `/recepcion` → `/admin/finanzas` → `/admin/crm` → `/admin/inventario` →
  fallback `/admin` (exige `OPERACIONES`). El matcher excluye `auth|posiciones|webhooks|cron|outreach/unsubscribe`;
  esas rutas se autentican solas (dispositivo, secreto de cron, token de baja o webhook).
- Las rutas `/api/*` **siempre** gatean dentro del handler: `getServerSession` → `401` →
  chequeo de módulo → `403`, todo vía `apiError()`. Nunca `NextResponse.redirect` en una API.

### Módulo 1 — Operaciones (cadena de custodia) · productivo

**Para qué:** que todo kilo retirado de un cliente llegue a bodega, o que la diferencia quede
registrada con evidencia.

Flujo de una orden de retiro (`PickupOrder`, código `RET-AAAA-NNNN` generado en servidor con
`OrderCounter` dentro de una transacción):

```
BORRADOR → EN_RETIRO → EN_TRANSITO → RECIBIDA ──────────→ CERRADA
                                    └→ DISCREPANCIA → (admin resuelve) → CERRADA
```

1. **Chofer** (`/chofer/nueva-orden`, wizard): elige empresa (`Company`), agrega ítems
   (`OrderItem` con `MaterialType` y `declaredQuantity`), toma 1–5 fotos (`Evidence` etapa
   `RETIRO`, timestamp y GPS del servidor/celular), obtiene **firma del cliente** en canvas (PNG +
   nombre del firmante) y confirma → `EN_TRANSITO`, se fija `pickupAt` en el servidor.
2. **Recepción** (`/recepcion/recibir/[ordenId]`): ingresa `receivedQuantity` por ítem y fotos de
   etapa `RECEPCION`. El servidor calcula `|declarado − recibido| / declarado`:
   ≤2 % → `RECIBIDA`; >2 % → `DISCREPANCIA` y crea `Discrepancy` con severidad
   `MENOR` (<5 %), `MODERADA` (5–20 %), `GRAVE` (>20 %).
3. **Admin** (`/admin/discrepancias`, `/admin/ordenes`): investiga (`EN_INVESTIGACION`), resuelve
   con nota obligatoria (`RESUELTA`) y la orden pasa a `CERRADA`. Además gestiona choferes,
   empresas, reportes (`/admin/reportes`, CSV) y usuarios.

**Rastreo GPS** (fuente única: `RASTREO_GPS.md`): el **turno (`Shift`) es el interruptor**. Sin
turno abierto no se guardan posiciones ni se aparece en `/admin/mapa`. Requiere
`User.locationConsentAt` (sin él `POST /api/turnos` → `409`). Un turno se cierra por botón
(`MANUAL`), cierre de sesión (`LOGOUT`), 15 min sin señal (`INACTIVIDAD`, disparado por los polls,
sin cron) o revocar el consentimiento (`CONSENTIMIENTO_REVOCADO`). Los GPS físicos (`Tracker`
`DISPOSITIVO`) reportan a `POST /api/posiciones` con `x-device-key`. `tracker.isActive` es una
bandera administrativa, **no** significa "conectado".

Archivos clave: `app/(chofer)/`, `app/(recepcion)/`, `app/api/ordenes/`, `app/api/evidencias/`,
`app/api/discrepancias/`, `app/api/turnos/`, `app/api/posiciones/`, `lib/operations/`,
`lib/turnos*.ts`, `lib/tracking.ts`, `components/firma/`, `components/evidencia/`.

Ojo: las evidencias van a Vercel Blob con `access: 'public'`. Aceptable aquí; **prohibido** copiar
ese patrón a Finanzas.

### Módulo 2 — Inventario (bodega y taller de pallets) · productivo

**Para qué:** saber cuánto hay de materia prima, pallets, pintura, materiales, herramientas y EPP,
y quién movió qué.

- `InventoryItem` con `numero` correlativo visible (`max+1` en transacción; nunca se reutiliza ni
  se renumera), categoría (`MATERIA_PRIMA PALLET PINTURA MATERIAL HERRAMIENTA OTRO EPP`),
  condición nuevo/usado, unidad de medida y `fillPercent` para envases abiertos.
- `InventoryMovement`: `ENTRADA` suma, `SALIDA` resta (rechaza stock negativo con `409`),
  `AJUSTE` fija el conteo físico, `NIVEL` cambia el porcentaje del envase. Todo con
  `quantityBefore`/`quantityAfter` y usuario del servidor, en la **misma transacción** y con
  bloqueo de fila (SEC-008).
- Editar en línea `quantity` o `fillPercent` genera movimiento; editar nombre/marca/color no.
- Archivar y borrar exigen `ADMIN`; borrar se rechaza si el ítem tiene historial.
- Importación desde planilla: el navegador parsea y previsualiza (`lib/inventario/parse.ts`); el
  servidor revalida, tope 500 filas. Exportación CSV con las 12 columnas de la planilla original.
- **EPP** (`INVENTARIO_EPP.md`): el servidor detecta por nombre los elementos de protección
  personal y fuerza `EPP` aunque el cliente envíe otra categoría. Fuente única:
  `lib/inventario/category.ts`.

Archivos clave: `app/(admin)/admin/inventario/`, `app/api/inventario/`, `lib/inventario/`.

### Módulo 3 — CRM (ventas del taller de pallets) · base implementada

**Para qué:** convertir empresas en clientes del taller de pallets.

- Entidades: `Company` (con `segment` `LOGISTICA FARMACEUTICA OTRO INDUSTRIA`, `placeId`,
  comuna, sitio web), `Contact` (`ContactTemperature` `FRIO TIBIO CALIENTE`, `ContactSource`,
  `optOut`, `emailStatus`, `callStatus`), `Deal` sobre `PipelineStage` (tablero arrastrable),
  `Activity` (`LLAMADA EMAIL REUNION NOTA SEGUIMIENTO` — línea de tiempo para humanos) y
  `CrmWebhookConfig` (leads entrantes por `app/api/webhooks/leads`).
- Pantallas: dashboard, clientes, contactos, deals, pipeline, actividades, **llamadas**,
  **outreach** y configuración bajo `/admin/crm/*`.
- **Prospección y outreach** (`PROSPECCION_OUTREACH.md`): listados scrapeados (Apify / Google
  Places) → `scripts/import-prospects.ts` (normaliza `"sin dato"`, BOM, `\r\n`; deduplica por
  `placeId` → dominio → nombre+comuna) → Vercel Cron L–V 09:00 → `app/api/cron/outreach`
  envía por SMTP (`lib/outreach/smtp.ts`, `nodemailer`, STARTTLS obligatorio) con plantilla por
  segmento. Tope **global** `OUTREACH_DAILY_CAP` (default 25), 1 correo por empresa.
  Idempotencia en `OutreachSend` (`EN_COLA ENVIADO FALLIDO REBOTADO`), no en `Activity`; se
  escriben ambos. Baja por `/api/outreach/unsubscribe?t=…`. El cron responde `200` salvo `401`.
- **Radar de Clientes Pallets** (`IMPORTACION_RADAR_PALLETS.md`, `CLAUDE.md` §10): importador
  `npm run import:radar` que **rellena vacíos y jamás pisa**; contactos con teléfono y sin correo
  entran a la **lista de llamadas** con `CallStatus` (`POR_LLAMAR LLAMADA SIN_RESPUESTA
CORREO_CONSEGUIDO`), que es un estado y **no** escribe `Activity`.
- Decisiones vigentes: Claude/Codex construyen, **el cron ejecuta**; se envía por lote, nunca por
  evento; ni Microsoft Graph ni Outlook COM (el correo no está en M365 y la app corre en Vercel).

Archivos clave: `app/(admin)/admin/crm/`, `app/api/{contactos,deals,pipeline,actividades,llamadas,outreach,cron,webhooks,configuracion}/`,
`lib/outreach/` (puro, imports relativos), `lib/pipeline.ts`, `lib/scoring.ts`, `scripts/`.

### Módulo 4 — Finanzas · implementado, sin bypass de ADMIN

**Para qué:** que el dinero deje de vivir en planillas Excel sueltas. v1 = carga manual +
reportes + **trazabilidad** (quién cambió qué, cuándo y desde qué valor). Dos usuarias: Marcela
(escritura, `FINANZAS`) y Elizabeth, directora (lectura total, `FINANZAS_LECTURA`). Los choferes
nunca entran. Diseño en `blueprints/modulo-finanzas/blueprint.md`.

| Pantalla (`/admin/finanzas/…`) | Qué se hace                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| raíz                           | Resumen del mes: ingresos, egresos, saldo                                                                                                                         |
| `trabajadores`                 | `Employee` (`ACTIVO`/`DESVINCULADO`, RUT validado, cuenta bancaria **cifrada**)                                                                                   |
| `proveedores`                  | `Supplier` (cuenta bancaria cifrada; nunca se devuelve completo)                                                                                                  |
| `movimientos`                  | `FinanceTransaction` `INGRESO`/`EGRESO`, `BORRADOR → CONFIRMADO → ANULADO`, con `FinanceCategory` y `PaymentMethod`                                               |
| `anticipos`                    | `Advance` `PENDIENTE → PAGADO → DESCONTADO` (o `ANULADO`), se descuentan en la nómina                                                                             |
| `nominas`                      | `PayrollRun` mensual `BORRADOR → APROBADA → PAGADA` con `PayrollItem`; líquido en `lib/finanzas/payroll.ts`; descifra cuentas sólo al generar el pago y lo audita |
| `auditoria`                    | Visor paginado de `FinanceAuditLog` (append-only, serializado)                                                                                                    |

Reglas que más muerden (completas en `CLAUDE.md` §9): montos `Int` en CLP; toda mutación con
auditoría en la misma `prisma.$transaction` (`withAudit()`/`mutarConAuditoria()`); toda salida por
`lib/finanzas/serialize.ts`; paginación en BD con `resolverPaginacion()` (tope 100); timestamps
de servidor salvo `FinanceTransaction.date`; nunca borrado duro de `Employee` ni de auditoría;
nunca devolver `bankAccountEnc`; perder `FINANZAS_ENCRYPTION_KEY` hace irrecuperables las cuentas.
`lib/finanzas/routes.test.ts` falla si una ruta de `app/api/finanzas/` no llama a su portero.
Fuera de v1: banco, SII, Previred, adjuntos, UF/USD, móvil.

### Cómo trabajar una tarea en este repo (checklist para Codex)

1. Leer `REGISTRO_TRABAJO.md`, registrar la tarea (ID, responsable, estado, rama, archivos) y
   revisar `git status`. No pisar trabajo de Claude ni cambios locales ajenos.
2. Identificar el módulo y leer su documento fuente y el `*.spec.md` junto al archivo a tocar.
3. Confirmar el portero correcto: `hasModuleAccess()` para Operaciones/CRM/Inventario;
   `hasFinanceAccess()`/`canWriteFinance()` para Finanzas.
4. Validar en servidor, transacción si toca varias tablas, errores con `apiError()`, sin secretos.
5. Lógica pura en `lib/**` con imports relativos y su `*.test.ts` (Vitest sólo ve `lib/**/*.test.ts`).
6. Componente, ruta, página o script nuevo → su `*.spec.md` al lado.
7. Cambios de schema: sólo aditivos, `db push` con `DIRECT_URL` (sin `-pooler`) y respaldo
   `pg_dump` verificado antes; nunca `--accept-data-loss`.
8. Cerrar con el portón (`typecheck && test && build`) y anotar resultado en el registro.

### Mapa de documentos

| Necesitas…                              | Lee                                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Reglas técnicas y de seguridad (fuente) | `CLAUDE.md`                                                                                                                                   |
| Coordinación y estado de tareas         | `REGISTRO_TRABAJO.md`                                                                                                                         |
| Usuarios, tono y principios de diseño   | `PRODUCT.md`                                                                                                                                  |
| Operaciones (flujos, API, esquema base) | `FLUJOS_DE_USUARIO.md`, `ESPECIFICACION_API.md`, `ESQUEMA_BASE_DATOS.md`, `ARQUITECTURA.md` — describen sólo Operaciones; el schema real gana |
| Turnos, consentimiento y mapa           | `RASTREO_GPS.md`                                                                                                                              |
| Outreach y Radar de pallets             | `PROSPECCION_OUTREACH.md`, `IMPORTACION_RADAR_PALLETS.md`, `blueprints/importacion-radar-pallets/`                                            |
| Finanzas                                | `CLAUDE.md` §9, `blueprints/modulo-finanzas/`                                                                                                 |
| Inventario EPP                          | `INVENTARIO_EPP.md`, `app/api/inventario/route.spec.md`                                                                                       |
| Variables de entorno                    | `VARIABLES_ENTORNO.md` (fuente); `.env.example` sólo como plantilla                                                                           |
| Auditorías de seguridad                 | `docs/auditorias/`                                                                                                                            |

`PARA_CLAUDE_CODE.md` describe la construcción inicial (Next 14) y es histórico.

<!-- ERP-COOPERA:FIN -->
<!-- RADAR-PALLETS:INICIO -->
<!--
  Se ANEXA al AGENTS.md del repo, no lo reemplaza. El Bootstrap lo agrega sólo si el marcador no
  está. Fuente de verdad completa: CLAUDE.md (sección 10) y blueprints/importacion-radar-pallets/.
-->

## Cambio activo: Importación Radar de Clientes Pallets + segmento INDUSTRIA

Incorpora ~127 prospectos de un Excel (3 hojas → CSV) al CRM, habilita el segmento `INDUSTRIA` con
campaña y plantilla, agrega un estado de gestión telefónica en `Contact` con su vista de lista de
llamadas, y cambia el tope de outreach de por-campaña a global. 12 pasos en
`blueprints/importacion-radar-pallets/tasks.json`.

### Comandos

| Tarea                      | Comando                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| Typecheck                  | `npm run typecheck`                                                      |
| Tests                      | `npm run test` · un archivo: `npx vitest run lib/outreach/radar.test.ts` |
| Build                      | `npm run build`                                                          |
| Esquema a la BD            | `npm run db:push` (respaldo `pg_dump` verificado antes)                  |
| Importar el Radar (manual) | `npm run import:radar -- --dry-run` → revisar → `npm run import:radar`   |

**Portón:** `npm run typecheck && npm run test && npm run build`. `next lint` no es compuerta.
El CLI de Prisma no lee `.env.local` → `export DATABASE_URL`/`DIRECT_URL` en el mismo shell.

### Las 5 reglas que más muerden

1. `lib/outreach/radar.ts` y `lib/outreach/eligibility.ts` son **puros**: sin Prisma/fs en runtime,
   imports **relativos** (nunca `@/`), datos por parámetro. Vitest sólo ve `lib/**/*.test.ts`.
2. El importador **rellena campos vacíos, jamás pisa**. Correo entrante distinto → `Contact` nuevo.
3. `enum ProspectSegment` sólo **gana** valores: `INDUSTRIA` al final, `OTRO` se queda. El `db push`
   que lo agrega NO escribe filas con él.
4. Rutas de API del CRM gatean **en el handler** con `hasModuleAccess(session.user, "CRM")`;
   errores por `apiError` (`{ error }` + status), **nunca** `NextResponse.redirect` en `/api/*`.
5. `middleware.ts` se toca **una vez** (paso 1: agregar `cron` y `outreach/unsubscribe` al
   negative-lookahead) y no se vuelve a tocar.

Reglas completas, dónde vive cada cosa y las trampas: **`CLAUDE.md` sección 10** — es la fuente de
verdad.

<!-- RADAR-PALLETS:FIN -->
