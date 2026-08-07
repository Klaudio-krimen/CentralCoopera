# Módulo de Finanzas — Coopera Pro — Blueprint

> Generado por The Architect el 2026-08-07
> Forma: internal-tool · `knowledge/shapes/internal-tool.md`
> Runtime track: TypeScript/Node — pero **brownfield**: los pines salen del lockfile del repo destino, no del catálogo
> Modo de emisión: bundle
> Versión del blueprint: 1
> Versiones verificadas por última vez: 2026-08-07 — procedencia por paquete en §11

**Este es un cambio BROWNFIELD.** El repo destino es `track-residuos`, la intranet de Coopera Pro,
que ya está en producción con tres módulos vivos. Finanzas entra como cuarto módulo. Nada de lo que
ya funciona se reescribe.

---

## 1. Project Overview & Non-Goals

### Visión

Marcela Sánchez lleva las finanzas de Coopera Pro en planillas Excel y ya perdió archivos con
información que no se puede reconstruir. TrackResiduos ya es de facto el ERP de la empresa —
Operaciones, Inventario y CRM viven ahí y la gente entra todos los días. Finanzas entra como cuarto
módulo para que el dinero deje de vivir en archivos sueltos: pagos de sueldos, anticipos a
trabajadores, pagos a proveedores y cuadre de ingresos y egresos, todo en la misma base de datos que
el resto de la operación, con la misma sesión y el mismo control de permisos.

La v1 es carga manual más reportes. No hay integración bancaria, no hay SII, no hay Previred. El
valor de la v1 no es automatizar: es que el dato exista en un solo lugar, con historial, y que sólo
lo vean dos personas. Lo que la planilla nunca dio y esto sí da es **trazabilidad**: cada cambio en
un sueldo, cada anticipo, cada pago a proveedor queda con autor, fecha y valor anterior.

### Usuarios

| Persona | A qué entra | Frecuencia |
|---|---|---|
| **Marcela Sánchez** — finanzas | Cargar movimientos, anticipos, nóminas y pagos a proveedores; generar la nómina de pago | Diaria |
| **Elizabeth Cabrera** — directora y dueña | Revisar el resumen del mes, ver sueldos individuales con nombre, revisar el visor de auditoría | Semanal |

Nadie más. Los choferes **nunca** entran a Finanzas. No hay auto-registro, no hay clientes, no hay
invitación pública. Las cuentas las crea un ADMIN desde `/admin/usuarios`, que ya existe.

### Goals — alcance v1

1. El sistema guarda trabajadores, proveedores, categorías, ingresos, egresos, anticipos y nóminas
   mensuales en Postgres, con montos en pesos chilenos enteros.
2. El sistema restringe todo el módulo a quien tenga `FINANZAS` (escritura) o `FINANZAS_LECTURA`
   (sólo lectura) en `moduleAccess`, **sin excepción para ADMIN**.
3. El sistema deja fila de auditoría inmutable por cada mutación de datos financieros, escrita en la
   misma transacción que la mutación.
4. El sistema cifra las cuentas bancarias en reposo y las descifra sólo al generar la nómina de pago,
   dejando rastro de ese descifrado.
5. El sistema entrega el resumen del mes (ingresos, egresos, saldo), la exportación CSV limitada y el
   visor de auditoría paginado.
6. El sistema deja de permitir que un ADMIN fije la contraseña de una cuenta de Finanzas; la
   recuperación es por enlace al correo del titular.

### Non-Goals — explícitamente fuera de v1

| No se construye | Por qué no ahora | Se revisa cuando |
|---|---|---|
| Integración bancaria / conciliación automática | Requiere convenio con el banco y un formato por institución; la v1 ni siquiera tiene los datos cargados todavía | Haya 3 meses seguidos de movimientos cargados a mano y el cuadre manual pase de 2 h/mes |
| Integración con SII (facturación electrónica, F29) | Certificación digital, ambiente de pruebas y una obligación legal que no se puede entregar a medias | El contador externo pida los datos en formato SII más de una vez por trimestre |
| Integración con Previred | Depende de tener la nómina estable y validada varios meses | La nómina del sistema cuadre con la de Previred tres meses seguidos |
| Archivos adjuntos (liquidaciones, facturas, comprobantes) | Ver §20.2 — el patrón de Blob del repo hoy es público; adjuntar aquí sin cambiarlo sería una filtración | Se implemente descarga autenticada con `@vercel/blob` privado. **El usuario ya avisó que esto probablemente cambie** |
| Moneda distinta de CLP (UF, USD) | Todos los montos son enteros sin decimales; la UF rompe esa premisa | Aparezca el primer contrato indexado a UF |
| App móvil / diseño mobile-first para Finanzas | Es una herramienta de escritorio, se usa sentado frente a un computador con tablas densas | Alguien pida ver el resumen desde el celular más de una vez |
| Auto-registro de usuarios | El módulo tiene exactamente dos usuarios conocidos | Nunca, mientras el equipo sea este |
| Acceso de choferes a cualquier superficie de Finanzas | Es la razón por la que existe el portero sin bypass | Nunca |
| Borrado duro de trabajadores o de filas de auditoría | La obligación tributaria chilena exige conservar el historial de pagos 6 años | Nunca dentro de esos 6 años |
| Migrar a Prisma Migrate en este cambio | El repo trabaja con `prisma db push` y este cambio es puramente aditivo | Llegue el primer cambio destructivo de schema, o entre un segundo desarrollador — ver §20.3 decisión 2 |
| Modificar el comportamiento de `hasModuleAccess()` para OPERACIONES, CRM e INVENTARIO | Está en producción y funciona; tocarlo cambia quién ve qué en tres módulos vivos | Se decida quitar el bypass de ADMIN a nivel de toda la app, que es otro proyecto |

**Interfaces congeladas** — cambiarlas rompe módulos que ya están en producción. Son filas de esta
misma valla de alcance y se detallan en §5 *Interfaces held constant*:

| No cambia | Por qué |
|---|---|
| Firma y semántica de `hasModuleAccess(user, module)` | La usan `middleware.ts`, el sidebar y las rutas de tres módulos |
| Forma de respuesta de `apiError(message, status)` → `{ error: string }` | Todo el frontend existente la parsea así |
| Contrato de sesión NextAuth: `session.user.{id,role,moduleAccess}` | Lo lee cada handler del repo |
| Forma de los endpoints existentes de Operaciones, CRM e Inventario | No se tocan |
| `ModuleAccess` y `UserRole` sólo **ganan** valores | Renombrar o borrar un valor de enum en Postgres es destructivo |
| Ninguna columna existente cambia de tipo ni se borra | `prisma db push` sin `--accept-data-loss` falla si lo intentas, y con razón |

**El builder no debe implementar nada de estas tablas**, ni siquiera como añadido pequeño mientras
trabaja en un paso adyacente. Si un paso parece exigir un non-goal, eso es un defecto del blueprint:
detente y repórtalo en vez de ampliar el alcance.

### Current state — los cinco hallazgos que este cambio corrige

Estos son hechos verificados del repo al 2026-08-07, no sospechas. Cada paso de §9 que cierra uno lo
referencia por número.

1. **`lib/access.ts:13` tiene el bypass de ADMIN cableado** — `return user.role === "ADMIN" || …`.
   Cualquier ADMIN entra a cualquier módulo sin grant. Finanzas por lo tanto **no puede** usar
   `hasModuleAccess()`. *Se cierra en el paso 2.*
2. **No existe tabla de auditoría** en todo el schema. Ninguna mutación de ningún módulo deja rastro
   de quién la hizo ni de qué valor tenía antes. *Se cierra en los pasos 1 y 4.*
3. **Las rutas `/api/*` no se gatean por módulo en el middleware** (`middleware.ts:15-20`): sólo se
   valida presencia de token y se retorna `NextResponse.next()`. Un `hasModuleAccess()` olvidado
   dentro de un handler deja el endpoint abierto a **cualquier usuario logueado, chofer incluido**.
   *Se cierra en los pasos 3 y 10.*
4. **`app/api/usuarios/route.ts:139-143`** — el `PATCH` deja al ADMIN fijar la contraseña de
   cualquier usuario, sin notificar a nadie. Es la puerta trasera que invalida el escenario (A).
   *Se cierra en el paso 9.*
5. **`components/ui/AdminSidebar.tsx:148`** repite el bypass en el cliente:
   `const visibleModules = isAdmin ? MODULES : MODULES.filter(...)`. *Se cierra en el paso 20.*

### Métricas de éxito

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Movimientos del mes cargados en el sistema y no en Excel | 100% de los movimientos de un mes calendario, dentro de los 60 días de la puesta en marcha | `select count(*) from "FinanceTransaction" where date >= …` comparado contra la planilla de ese mes |
| Nóminas mensuales generadas desde el sistema | 3 meses consecutivos | `select count(*) from "PayrollRun" where status = 'PAGADA'` |
| Mutaciones financieras sin fila de auditoría | 0, siempre | El test `lib/finanzas/audit.test.ts` más el visor de §18 |
| Accesos de un usuario sin grant a `/api/finanzas/*` que devuelvan datos | 0 | `lib/finanzas/routes.test.ts` en cada `npm run test` |

---

## 2. Tech Stack

**No se elige stack: se hereda.** Este cambio entra en un repo Next.js 14 en producción. La única
decisión de stack nueva es zod. Todo lo demás es la pila que ya está corriendo.

Los pines viven en §11 y en ningún otro lugar de la prosa. Todos salen del lockfile del repo destino
(`package-lock.json`), leído el 2026-08-07 — un lockfile es autoridad más fuerte que cualquier
catálogo de versiones, porque es lo que está instalado de verdad. La única excepción es zod, que no
está instalado todavía y se verificó contra el registro npm ese mismo día.

| Capa | Elección | Por qué esta, en vez de qué |
|---|---|---|
| Lenguaje / runtime | TypeScript sobre Node | Ya es el lenguaje del repo. Introducir otro runtime para un cuarto módulo interno sería absurdo |
| Framework | Next.js 14, App Router | Ya está. Los route handlers y el `middleware.ts` son el mecanismo de autorización que Finanzas necesita reutilizar, no reemplazar |
| Estilos | Tailwind 3 | Ya está, y el resto del admin lo usa. Meter una segunda librería de UI parte el sistema visual en dos |
| Capa de componentes | `@base-ui/react` + Phosphor Icons + Recharts + `sonner` | Todo ya instalado y usado por Operaciones e Inventario. Finanzas reusa; no agrega ninguna librería de UI |
| Base de datos | PostgreSQL | Ya está, y las nóminas son datos relacionales con invariantes entre tablas — exactamente lo que un motor relacional resuelve |
| ORM / acceso a datos | Prisma | Ya está, y `prisma.$transaction` es lo que hace posible la regla "auditoría en la misma transacción que la mutación" |
| Auth | NextAuth v4 con credenciales + bcrypt | Ya está, con revalidación de rol y `isActive` contra la BD en cada renovación del JWT. Cambiar de proveedor de identidad por un módulo interno de dos usuarios no se justifica |
| Autorización | `lib/access.ts` — funciones nuevas **sin** bypass de ADMIN | Ver §8. El bypass existente se conserva para los otros tres módulos; Finanzas no lo usa |
| Validación de entrada | zod (**nueva dependencia**) | Ver §20.3 decisión 1. ~8 entidades con RUT, montos, cuentas bancarias y enums; validar a mano en ese volumen es donde se cuela el error de plata |
| Trabajo en segundo plano | Ninguno | La v1 no tiene nada asíncrono. La exportación CSV es síncrona y limitada; no hay cola que justificar |
| Pagos | NOT APPLICABLE | El módulo registra pagos, no los ejecuta. No hay pasarela |
| Almacenamiento de archivos | NOT APPLICABLE en v1 | Sin adjuntos — ver §1 Non-Goals y §20.2. El patrón actual de Vercel Blob es `access: 'public'` y no sirve aquí |
| Correo / notificaciones | `lib/outreach/smtp.ts` (nodemailer sobre SMTP de Hostinger) | Ya existe, ya está probado y ya tiene sus variables documentadas. Se reusa `sendMail()` para el enlace de recuperación y para la notificación de cambio de permisos |
| Cifrado | `node:crypto`, AES-256-GCM | Sin dependencia nueva. La alternativa (una librería de cifrado) agregaría superficie de suministro para algo que el runtime ya trae |
| Hosting | Vercel | Ya está desplegado ahí |
| Gestor de paquetes | npm | Es el del repo — hay `package-lock.json`, no `pnpm-lock.yaml` |
| Tests | Vitest, **sólo sobre `lib/**/*.test.ts`** | Ver §13. Es la restricción que moldea todo el diseño: la lógica de seguridad vive en `lib/finanzas/` como funciones puras porque es lo único que el arnés existente puede verificar |

### Compatibility check

Revisado contra `knowledge/stack-compatibility.md` — **ninguna de las filas de la tabla de
combinaciones malas aplica**. Tres merecen mención explícita porque están cerca:

- *"Conexiones serverless por request + Postgres sin pooler"* — no aplica: el repo ya separa
  `DATABASE_URL` (pooler) de `DIRECT_URL` (directa). Finanzas no introduce una tercera conexión.
- *"Dos sistemas de migración sobre una base de datos"* — no aplica: el repo usa `prisma db push` y
  nada más. Este cambio no agrega un segundo sistema (ver §20.3 decisión 2).
- *"Dos proveedores de identidad"* — no aplica: NextAuth sigue siendo el único dueño de la sesión. La
  recuperación de contraseña del paso 9 escribe en la tabla `User` del propio repo, no crea una
  segunda fuente de verdad.

La fila *"linter que parsea CSS + motor de estilos con at-rules propias"* tampoco aplica: el repo usa
ESLint + Prettier, no un linter con parser CSS propio, y Tailwind 3 con `postcss.config.js` clásico.

---

## 3. Directory Structure

Sólo lo que este cambio agrega o toca. Todo lo demás del repo queda igual.

```
track-residuos/
  prisma/
    schema.prisma                  # EDITADO paso 1 — 7 enums nuevos, 10 modelos nuevos,
                                   #   relaciones inversas en User. Ninguna columna existente cambia
  middleware.ts                    # EDITADO paso 3 — ramas /admin/finanzas y /api/finanzas
  tsconfig.json                    # EDITADO paso 1 — "blueprints" agregado a "exclude" (ver §19.6)
  package.json                     # EDITADO paso 6 — zod, única dependencia nueva
  VARIABLES_ENTORNO.md             # EDITADO paso 5 — variables nuevas de cifrado y notificación
  CLAUDE.md                        # EDITADO paso 20 — se le AGREGA la sección de Finanzas
  .gitignore                       # EDITADO en Bootstrap (§10) — backups/
  .prettierignore                  # NUEVO — copiado desde workspace/ en Bootstrap. Excluye
                                   #   blueprints/ para que lint-staged no reescriba el bundle
  .claude/
    settings.json                  # NUEVO — copiado desde workspace/ en Bootstrap
    rules/finanzas.md              # NUEVO — copiado desde workspace/ en Bootstrap
    skills/verificar-porteros/
      SKILL.md                     # NUEVO — copiado desde workspace/ en Bootstrap
  AGENTS.md                        # NUEVO — copiado desde workspace/ en Bootstrap

  lib/
    access.ts                      # EDITADO paso 2 — hasFinanceAccess(), canWriteFinance().
                                   #   hasModuleAccess() NO se toca
    access.test.ts                 # EDITADO paso 2 — se AMPLÍA, no se reemplaza
    auth.ts                        # EDITADO paso 8 — rate limit de login dentro de authorize()
    finanzas/                      # NUEVO — toda la lógica verificable del módulo
      audit.ts       audit.test.ts        # paso 4  — withAudit() transaccional
      crypto.ts      crypto.test.ts       # paso 5  — AES-256-GCM, formato v1:iv:tag:ct
      rut.ts         rut.test.ts          # paso 6  — RUT chileno con dígito verificador
      schemas.ts     schemas.test.ts      # paso 6  — esquemas zod de entrada
      serialize.ts   serialize.test.ts    # paso 7  — punto único de salida, enmascarado por rol
      rate-limit.ts  rate-limit.test.ts   # paso 8  — ventana fija sobre RateLimitCounter
      reset.ts       reset.test.ts        # paso 9  — token de recuperación (hash, expiración)
      routes.ts      routes.test.ts       # paso 10 — el guardia: ninguna ruta sin portero
      paginacion.ts  paginacion.test.ts   # paso 13 — take/skip, tope duro de page size
      payroll.ts     payroll.test.ts      # paso 15 — cálculo de líquido
      reportes.ts    reportes.test.ts     # paso 17 — agregación de ingresos/egresos/saldo
      csv.ts         csv.test.ts          # paso 19 — escapado CSV

  app/
    api/
      auth/recuperar/route.ts              # paso 9 — dispara el enlace
      auth/recuperar/confirmar/route.ts    # paso 9 — consume el token
      usuarios/route.ts                    # EDITADO paso 9 — módulos y roles nuevos,
                                           #   bloqueo del reset por ADMIN, notificación por correo
      finanzas/
        empleados/route.ts                 # paso 11  GET, POST
        empleados/[id]/route.ts            # paso 11  GET, PATCH
        empleados/[id]/desvincular/route.ts# paso 20  POST — purga datos bancarios y de contacto
        proveedores/route.ts               # paso 12  GET, POST
        proveedores/[id]/route.ts          # paso 12  GET, PATCH
        categorias/route.ts                # paso 12  GET, POST
        transacciones/route.ts             # paso 13  GET (paginado en BD), POST
        transacciones/[id]/route.ts        # paso 13  PATCH
        anticipos/route.ts                 # paso 14  GET, POST
        anticipos/[id]/route.ts            # paso 14  PATCH
        nominas/route.ts                   # paso 15  GET, POST
        nominas/[id]/route.ts              # paso 15  GET, PATCH (aprobar / marcar pagada)
        nominas/[id]/pago/route.ts         # paso 16  GET — descifra cuentas, sólo canWriteFinance
        reportes/route.ts                  # paso 17  GET — agregados
        auditoria/route.ts                 # paso 18  GET — visor paginado
        export/route.ts                    # paso 19  GET — CSV, con rate limit y auditado
    (admin)/admin/finanzas/                # el grupo (admin) no aparece en la URL:
      layout.tsx                           # paso 11 — shell del módulo
      page.tsx                             # paso 17 — resumen del mes → /admin/finanzas
      trabajadores/page.tsx                # paso 11
      trabajadores/[id]/page.tsx           # paso 11
      proveedores/page.tsx                 # paso 12
      movimientos/page.tsx                 # paso 13
      anticipos/page.tsx                   # paso 14
      nominas/page.tsx                     # paso 15
      nominas/[id]/page.tsx                # paso 16
      auditoria/page.tsx                   # paso 18

  components/ui/AdminSidebar.tsx           # EDITADO paso 20 — módulo Finanzas, sin bypass de isAdmin

  blueprints/modulo-finanzas/              # ESTE bundle. Vive dentro del repo — ver §19.6
```

**Reglas de frontera**

- **Toda decisión de seguridad vive en `lib/`, nunca en un route handler.** Un handler llama a
  `hasFinanceAccess()`, `canWriteFinance()`, `serializeEmployee()`, `checkRateLimit()` y
  `withAudit()`; no reimplementa ninguna. La razón es dura: Vitest sólo recoge `lib/**/*.test.ts`, así
  que la lógica que no está en `lib/` es lógica que nadie puede probar en este repo.
- **`lib/finanzas/*` no importa `@/lib/db` ni `@prisma/client` en tiempo de ejecución.** Los módulos
  que necesitan base de datos reciben el cliente o la transacción **como parámetro**. Los tipos de
  Prisma se importan con `import type`, que TypeScript borra al compilar. Esto es lo que permite que
  los tests corran en `environment: 'node'` sin base de datos y sin cambiar `vitest.config.ts`.
- **`lib/finanzas/*` usa rutas relativas (`./crypto`, `../utils`), nunca el alias `@/`.** Es una
  convención de resolución, no un gusto: ver la matriz de §19.6. Vitest no lee `paths` de
  `tsconfig.json` y no hay plugin que se lo enseñe, así que un `@/` dentro de `lib/finanzas/` rompe
  el test con `Cannot find module`. Los route handlers y las páginas **sí** usan `@/` porque los
  resuelve Next.
- **Ningún módulo de Finanzas lee `process.env` al importarse.** Las variables se leen dentro de la
  función que las necesita, y ahí se lanza el error si faltan. Importar `crypto.ts` sin
  `FINANZAS_ENCRYPTION_KEY` debe funcionar; cifrar sin ella debe fallar con un error nombrado.
- **Ninguna ruta de Finanzas devuelve una entidad sin pasar por `lib/finanzas/serialize.ts`.**
- **Ninguna página pagina en el navegador.** `take`/`skip` en la consulta, siempre.

---

## 4. Data Model

### Delta sobre el schema existente

Este cambio es **puramente aditivo**. Sobre lo que ya existe:

- `enum ModuleAccess` **gana** dos valores: `FINANZAS` y `FINANZAS_LECTURA`. Ninguno se renombra ni
  se elimina.
- `enum UserRole` **gana** un valor: `FINANZAS`. Ninguno se renombra ni se elimina.
- El modelo `User` **sólo gana relaciones inversas** — `employee Employee?`,
  `passwordResetTokens PasswordResetToken[]`, y las inversas de los `createdById` de Finanzas.
  Ningún campo existente cambia de tipo, de nombre ni de nulabilidad, y ninguno se borra.
- Los otros 19 modelos existentes (`Company`, `MaterialType`, `PickupOrder`, `OrderItem`,
  `Evidence`, `Discrepancy`, `OrderCounter`, `Tracker`, `Position`, `InventoryItem`,
  `InventoryMovement`, `Contact`, `PipelineStage`, `Deal`, `Activity`, `CrmWebhookConfig`,
  `OutreachCampaign`, `OutreachSend`) **no se tocan**.

Por eso `prisma db push` es seguro aquí: agregar modelos y valores de enum no destruye datos. Aun
así, el paso 1 exige respaldo verificado antes de ejecutarlo — un `db push` sin respaldo sobre la
base de producción es la peor línea de todo el build.

### Entidades nuevas

**`Employee`** — un trabajador de Coopera Pro para efectos de remuneración. Vive desde su
contratación hasta su desvinculación; nunca se borra.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK, `@default(cuid())` | Igual que el resto del repo |
| `fullName` | String | not null | Nombre completo como aparece en el contrato |
| `rut` | String | `@unique` | RUT chileno normalizado sin puntos, con guion y dígito verificador. Validado por `lib/finanzas/rut.ts` |
| `email` | String? | | Se purga al desvincular |
| `phone` | String? | | Se purga al desvincular |
| `status` | EmployeeStatus | `@default(ACTIVO)` | `ACTIVO` o `DESVINCULADO` |
| `hiredAt` | DateTime | not null | Fecha de contratación |
| `terminatedAt` | DateTime? | | Timestamp del **servidor** al desvincular |
| `baseSalary` | Int | not null | Sueldo **bruto** mensual en pesos chilenos enteros |
| `afp` | String? | | Nombre de la AFP. Texto libre: la lista cambia y no vale una tabla |
| `health` | String? | | Fonasa o la isapre |
| `bankName` | String? | | Se purga al desvincular |
| `bankAccountType` | BankAccountType? | | `CORRIENTE`, `VISTA`, `AHORRO`, `RUT` |
| `bankAccountEnc` | String? | | **Cifrado** AES-256-GCM, formato `v1:iv:tag:ct`. Se purga al desvincular |
| `bankAccountLast4` | String? | | Últimos 4 dígitos en claro, para que la UI pueda confirmar sin descifrar |
| `userId` | String? | `@unique`, FK → `User.id` | Vínculo **opcional** al login. Un chofer con cuenta puede tener ficha; un trabajador sin cuenta también |
| `purgedAt` | DateTime? | | Marca que los datos bancarios y de contacto ya fueron purgados |
| `createdAt` / `updatedAt` | DateTime | `@default(now())` / `@updatedAt` | |

**Por qué `Employee` es tabla aparte y no campos en `User`:** separa credenciales de datos de
recursos humanos. Se le puede pagar a alguien que nunca entra a la app, y se puede desactivar o
borrar un login sin perder el historial de pagos de esa persona. Meter `baseSalary` en `User`
significaría que cada consulta de sesión trae el sueldo de todos.

**`Supplier`** — un proveedor al que Coopera Pro le paga.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK, `@default(cuid())` | |
| `name` | String | not null | Razón social o nombre de fantasía |
| `rut` | String? | | Sin `@unique`: hay proveedores informales sin RUT registrado |
| `email` / `phone` | String? | | Contacto de pago |
| `bankName` | String? | | |
| `bankAccountEnc` | String? | | **Cifrado**, mismo formato que `Employee` |
| `bankAccountLast4` | String? | | En claro |
| `isActive` | Boolean | `@default(true)` | Baja lógica; nunca borrado duro |
| `createdAt` / `updatedAt` | DateTime | | |

**Por qué NO se reusa `Company`:** `Company` es la tabla de **clientes** del CRM. Meter proveedores
ahí ensucia todas las listas del CRM, rompe los conteos del pipeline y choca de frente con la
deduplicación pendiente del módulo Outreach, que asume que cada fila de `Company` es un prospecto.

**`FinanceCategory`** — categoría de ingreso o egreso.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `name` | String | not null | "Venta de cartón", "Combustible", "Arriendo" |
| `kind` | TransactionKind | not null | `INGRESO` o `EGRESO`. Una categoría es de un lado solo |
| `isActive` | Boolean | `@default(true)` | |
| — | — | `@@unique([name, kind])` | El mismo nombre puede existir de los dos lados si algún día hace falta |

**`FinanceTransaction`** — un ingreso o un egreso. La unidad del cuadre mensual.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `kind` | TransactionKind | not null | |
| `amount` | Int | not null, > 0 | Pesos chilenos enteros. **Nunca `Float`** — ver §16 |
| `date` | DateTime | not null | Fecha contable del movimiento, la elige quien carga |
| `description` | String | not null | |
| `categoryId` | String? | FK → `FinanceCategory.id` | Opcional: se puede cargar rápido y categorizar después |
| `supplierId` | String? | FK → `Supplier.id` | Sólo tiene sentido en egresos |
| `method` | PaymentMethod | not null | `TRANSFERENCIA`, `EFECTIVO`, `CHEQUE`, `TARJETA`, `OTRO` |
| `status` | TransactionStatus | `@default(CONFIRMADO)` | `BORRADOR`, `CONFIRMADO`, `ANULADO`. Anular nunca borra |
| `reference` | String? | | N° de factura, boleta o comprobante |
| `createdById` | String | FK → `User.id` | Quién la cargó |
| `createdAt` / `updatedAt` | DateTime | | `createdAt` es timestamp del servidor |

**`Advance`** — anticipo a un trabajador, que después se descuenta de una liquidación.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `employeeId` | String | FK → `Employee.id` | |
| `amount` | Int | not null, > 0 | CLP entero |
| `requestedAt` | DateTime | not null | |
| `paidAt` | DateTime? | | Timestamp del servidor al marcar pagado |
| `status` | AdvanceStatus | `@default(PENDIENTE)` | `PENDIENTE`, `PAGADO`, `DESCONTADO`, `ANULADO` |
| `payrollItemId` | String? | FK → `PayrollItem.id` | En qué liquidación se descontó. Null hasta que se descuenta |
| `notes` | String? | | |
| `createdById` | String | FK → `User.id` | |
| `createdAt` | DateTime | `@default(now())` | |

**`PayrollRun`** — cabecera de la nómina de un mes.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `period` | String | `@unique` | Formato `"2026-08"`. Un solo run por mes, garantizado por la base |
| `status` | PayrollStatus | `@default(BORRADOR)` | `BORRADOR` → `APROBADA` → `PAGADA`. Sin vuelta atrás |
| `totalGross` | Int | not null | Suma de `grossAmount` de sus líneas |
| `totalNet` | Int | not null | Suma de `netAmount` de sus líneas |
| `approvedById` | String? | FK → `User.id` | |
| `approvedAt` | DateTime? | | Timestamp del servidor |
| `paidAt` | DateTime? | | Timestamp del servidor |
| `createdById` | String | FK → `User.id` | |
| `createdAt` / `updatedAt` | DateTime | | |

**`PayrollItem`** — una línea por trabajador dentro de una nómina.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `payrollRunId` | String | FK → `PayrollRun.id` | |
| `employeeId` | String | FK → `Employee.id` | |
| `grossAmount` | Int | not null | Bruto del mes, arranca desde `Employee.baseSalary` |
| `afpAmount` | Int | `@default(0)` | Descuento previsional |
| `healthAmount` | Int | `@default(0)` | Descuento de salud |
| `otherDeductions` | Int | `@default(0)` | |
| `advancesApplied` | Int | `@default(0)` | Suma de los anticipos descontados en esta línea |
| `netAmount` | Int | not null | Calculado por `lib/finanzas/payroll.ts`, nunca por el cliente |
| — | — | `@@unique([payrollRunId, employeeId])` | Un trabajador no puede aparecer dos veces en la misma nómina |

**`FinanceAuditLog`** — el libro contable técnico del módulo. **Append-only por contrato.**

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `actorId` | String? | | **Sin FK con cascade** — se guarda desnormalizado a propósito |
| `actorEmail` | String | not null | Desnormalizado: sobrevive al borrado del usuario |
| `actorRole` | String | not null | Desnormalizado: el rol **en el momento del hecho**, no el actual |
| `action` | String | not null | `CREAR`, `EDITAR`, `ANULAR`, `APROBAR`, `PAGAR`, `DESCIFRAR`, `EXPORTAR`, `DESVINCULAR`, `CAMBIAR_PERMISOS` |
| `entityType` | String | not null | `Employee`, `PayrollRun`, `User`, … |
| `entityId` | String? | | |
| `before` | Json? | | Estado anterior. Nunca contiene `bankAccountEnc` en claro ni `password` |
| `after` | Json? | | Estado posterior, misma regla |
| `ip` | String? | | De la cabecera `x-forwarded-for` |
| `userAgent` | String? | | |
| `createdAt` | DateTime | `@default(now())` | Timestamp del servidor |

**`RateLimitCounter`** — ventana fija de conteo.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `key` | String | `@unique` | `login:correo@ejemplo.cl`, `finanzas:api:<userId>`, `export:<userId>`, `reset:<userId>` |
| `count` | Int | `@default(0)` | |
| `windowStart` | DateTime | not null | Al expirar la ventana el contador se reinicia |

**`PasswordResetToken`** — recuperación de acceso por enlace.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | String | PK | |
| `userId` | String | FK → `User.id` | |
| `tokenHash` | String | `@unique` | SHA-256 del token. **El token en claro sólo viaja en el correo** — nunca se guarda |
| `expiresAt` | DateTime | not null | 30 minutos desde la emisión |
| `usedAt` | DateTime? | | Un solo uso: si no es null, el token está quemado |
| `requestedById` | String? | | Quién disparó el enlace, si lo disparó un ADMIN en vez del titular |
| `createdAt` | DateTime | `@default(now())` | |

### Relaciones

```
User            —(0..1)→  Employee            onDelete: SetNull   (el historial de pagos sobrevive al login)
User            —(1..n)→  PasswordResetToken  onDelete: Cascade   (tokens de un usuario borrado no sirven)
User            —(1..n)→  FinanceTransaction  onDelete: Restrict  (no se borra a quien cargó movimientos)
User            —(1..n)→  Advance             onDelete: Restrict
User            —(1..n)→  PayrollRun          onDelete: Restrict
Employee        —(1..n)→  Advance             onDelete: Restrict  (nunca hay borrado duro de Employee)
Employee        —(1..n)→  PayrollItem         onDelete: Restrict
Supplier        —(0..n)→  FinanceTransaction  onDelete: SetNull   (el movimiento sobrevive al proveedor)
FinanceCategory —(0..n)→  FinanceTransaction  onDelete: SetNull
PayrollRun      —(1..n)→  PayrollItem         onDelete: Cascade   (borrar un BORRADOR se lleva sus líneas)
PayrollItem     —(0..n)→  Advance             onDelete: SetNull   (el anticipo vuelve a quedar sin liquidación)
```

`FinanceAuditLog` **no tiene relación con `User`**. Es deliberado: una fila de auditoría no puede
desaparecer ni cambiar porque alguien borró un usuario. Por eso guarda `actorEmail` y `actorRole`
desnormalizados.

### Índices

| Tabla | Índice | Para qué consulta |
|---|---|---|
| `Employee` | `status` | La lista de trabajadores filtra por activos por defecto |
| `Employee` | `rut` (único) | Búsqueda por RUT y bloqueo de duplicados al crear |
| `FinanceTransaction` | `[kind, date]` | El resumen del mes: ingresos y egresos de un rango |
| `FinanceTransaction` | `date` | La lista de movimientos ordena por fecha descendente |
| `FinanceTransaction` | `supplierId` | "Todo lo que le pagamos a este proveedor" |
| `Advance` | `[employeeId, status]` | Anticipos pendientes de un trabajador al armar la nómina |
| `PayrollRun` | `period` (único) | Un run por mes, y la búsqueda del mes actual |
| `PayrollItem` | `[payrollRunId, employeeId]` (único) | Evita duplicar a un trabajador en la nómina |
| `FinanceAuditLog` | `createdAt` | El visor ordena por fecha descendente y pagina |
| `FinanceAuditLog` | `[entityType, entityId]` | "Todo lo que le pasó a este trabajador" |
| `FinanceAuditLog` | `actorId` | "Todo lo que hizo esta persona" |
| `RateLimitCounter` | `key` (único) | Lectura y upsert por clave |
| `RateLimitCounter` | `windowStart` | Limpieza de ventanas viejas |
| `PasswordResetToken` | `tokenHash` (único) | Canje del token |

### Schema

Se agrega al final de `prisma/schema.prisma`, más las relaciones inversas dentro del modelo `User`
existente.

```prisma
// ─── Finanzas ────────────────────────────────────────────────────────────────
// Todos los montos son Int en pesos chilenos. El CLP no tiene centavos y
// formatCurrency() de lib/utils.ts ya usa maximumFractionDigits: 0.
// Prohibido Float o Decimal para dinero en este módulo (ver blueprint §20.3).

enum EmployeeStatus {
  ACTIVO
  DESVINCULADO
}

enum TransactionKind {
  INGRESO
  EGRESO
}

enum TransactionStatus {
  BORRADOR
  CONFIRMADO
  ANULADO
}

enum PaymentMethod {
  TRANSFERENCIA
  EFECTIVO
  CHEQUE
  TARJETA
  OTRO
}

enum PayrollStatus {
  BORRADOR
  APROBADA
  PAGADA
}

enum AdvanceStatus {
  PENDIENTE
  PAGADO
  DESCONTADO
  ANULADO
}

enum BankAccountType {
  CORRIENTE
  VISTA
  AHORRO
  RUT
}

model Employee {
  id               String           @id @default(cuid())
  fullName         String
  rut              String           @unique
  email            String?
  phone            String?
  status           EmployeeStatus   @default(ACTIVO)
  hiredAt          DateTime
  terminatedAt     DateTime?
  baseSalary       Int
  afp              String?
  health           String?
  bankName         String?
  bankAccountType  BankAccountType?
  bankAccountEnc   String?
  bankAccountLast4 String?
  userId           String?          @unique
  purgedAt         DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user         User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  advances     Advance[]
  payrollItems PayrollItem[]

  @@index([status])
  @@index([rut])
}

model Supplier {
  id               String   @id @default(cuid())
  name             String
  rut              String?
  email            String?
  phone            String?
  bankName         String?
  bankAccountEnc   String?
  bankAccountLast4 String?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  transactions FinanceTransaction[]
}

model FinanceCategory {
  id       String          @id @default(cuid())
  name     String
  kind     TransactionKind
  isActive Boolean         @default(true)

  transactions FinanceTransaction[]

  @@unique([name, kind])
}

model FinanceTransaction {
  id          String            @id @default(cuid())
  kind        TransactionKind
  amount      Int
  date        DateTime
  description String
  categoryId  String?
  supplierId  String?
  method      PaymentMethod
  status      TransactionStatus @default(CONFIRMADO)
  reference   String?
  createdById String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  category  FinanceCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  supplier  Supplier?        @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  createdBy User             @relation("FinanceTransactionCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  @@index([kind, date])
  @@index([date])
  @@index([supplierId])
}

model Advance {
  id            String        @id @default(cuid())
  employeeId    String
  amount        Int
  requestedAt   DateTime
  paidAt        DateTime?
  status        AdvanceStatus @default(PENDIENTE)
  payrollItemId String?
  notes         String?
  createdById   String
  createdAt     DateTime      @default(now())

  employee    Employee     @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  payrollItem PayrollItem? @relation(fields: [payrollItemId], references: [id], onDelete: SetNull)
  createdBy   User         @relation("AdvanceCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)

  @@index([employeeId, status])
}

model PayrollRun {
  id           String        @id @default(cuid())
  period       String        @unique
  status       PayrollStatus @default(BORRADOR)
  totalGross   Int
  totalNet     Int
  approvedById String?
  approvedAt   DateTime?
  paidAt       DateTime?
  createdById  String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  items      PayrollItem[]
  approvedBy User?         @relation("PayrollRunApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)
  createdBy  User          @relation("PayrollRunCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
}

model PayrollItem {
  id              String @id @default(cuid())
  payrollRunId    String
  employeeId      String
  grossAmount     Int
  afpAmount       Int    @default(0)
  healthAmount    Int    @default(0)
  otherDeductions Int    @default(0)
  advancesApplied Int    @default(0)
  netAmount       Int

  payrollRun PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  employee   Employee   @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  advances   Advance[]

  @@unique([payrollRunId, employeeId])
}

// Append-only por contrato: no existe ni existirá una ruta que actualice o
// borre filas de esta tabla (ver blueprint §5 y §1 Non-Goals).
// Sin relación con User a propósito: una fila de auditoría no puede
// desaparecer porque alguien borró un usuario.
model FinanceAuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actorEmail String
  actorRole  String
  action     String
  entityType String
  entityId   String?
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([entityType, entityId])
  @@index([actorId])
}

model RateLimitCounter {
  id          String   @id @default(cuid())
  key         String   @unique
  count       Int      @default(0)
  windowStart DateTime

  @@index([windowStart])
}

model PasswordResetToken {
  id            String    @id @default(cuid())
  userId        String
  tokenHash     String    @unique
  expiresAt     DateTime
  usedAt        DateTime?
  requestedById String?
  createdAt     DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Y dentro del modelo `User` existente, **sólo estas líneas nuevas** (ningún campo existente cambia):

```prisma
  // ─── Finanzas (relaciones inversas) ───
  employee            Employee?
  passwordResetTokens PasswordResetToken[]
  financeTransactions FinanceTransaction[] @relation("FinanceTransactionCreatedBy")
  advancesCreated     Advance[]            @relation("AdvanceCreatedBy")
  payrollRunsCreated  PayrollRun[]         @relation("PayrollRunCreatedBy")
  payrollRunsApproved PayrollRun[]         @relation("PayrollRunApprovedBy")
```

Y en los enums existentes:

```prisma
enum UserRole {
  CHOFER
  RECEPCION
  ADMIN
  VENTAS
  BODEGA
  FINANZAS
}

enum ModuleAccess {
  OPERACIONES
  CRM
  INVENTARIO
  FINANZAS
  FINANZAS_LECTURA
}
```

### Migraciones

**El repo no tiene `prisma/migrations/`.** El flujo vigente es `npm run db:push`
(`prisma db push`), y este cambio lo respeta — ver §20.3 decisión 2. Reglas duras:

- `DIRECT_URL` es **obligatoria** para cualquier operación de schema. `DATABASE_URL` va por el
  pooler. Si un `db push` se cuelga, es casi seguro que estás apuntando al pooler (trampa conocida y
  documentada del repo).
- **Respaldo verificado antes de cada `db push` contra una base con datos reales.** El paso 1 lo
  exige y lo verifica; no es una recomendación.
- No se escribe nunca el nombre de un archivo de migración: este repo no genera ninguno.

### Seed data

`prisma/seed.ts` existe y siembra los datos base del repo. **Este cambio no lo modifica.** Finanzas
arranca vacío a propósito: los trabajadores, proveedores y categorías reales los carga Marcela desde
la UI, y sembrar datos falsos de sueldos en una base compartida es exactamente el tipo de cosa que
después nadie sabe si es real.

Lo único que hay que hacer a mano una vez, después del paso 2, es otorgar los permisos:

- A la cuenta de Marcela: `role = FINANZAS`, `moduleAccess` incluye `FINANZAS`.
- A la cuenta de Elizabeth: conserva su rol actual, `moduleAccess` **suma** `FINANZAS_LECTURA`.

Se hace desde `/admin/usuarios`, que ya existe, o desde `npm run db:studio`. Queda anotado en la
lista de verificación previa al lanzamiento de §20.1 porque es una acción humana sobre datos reales,
no un paso de build.

---

## 5. API Design

### Convenciones

- **Base path:** `/api/finanzas` para todo el módulo. Las dos rutas de recuperación de contraseña
  viven fuera, en `/api/auth/recuperar`, porque el matcher del middleware excluye `/api/auth` y esa
  exclusión no se toca.
- **Envelope de éxito:** el recurso o la lista directamente — `NextResponse.json(datos)`. Es la
  convención que ya usan Operaciones, Inventario y CRM; introducir un envoltorio nuevo sólo en
  Finanzas partiría el frontend en dos estilos.
- **Envelope de error:** **siempre** `apiError(mensaje, status)` de `lib/utils.ts`, que produce
  `{ error: string }`. Nunca un string suelto, nunca un objeto ad hoc. Es una interfaz congelada (§1).
- **Códigos de error:**

  | Status | Cuándo | Mensaje |
  |---|---|---|
  | `400` | Validación zod fallida, RUT inválido, monto ≤ 0 | El mensaje concreto del campo, en español |
  | `401` | Sin sesión | `"No autorizado"` |
  | `403` | Sesión válida sin `FINANZAS` ni `FINANZAS_LECTURA`; o `FINANZAS_LECTURA` intentando mutar; o ADMIN intentando fijar la contraseña de una cuenta de Finanzas | `"Acceso denegado"` |
  | `404` | Recurso inexistente | `"No encontrado"` |
  | `409` | Violación de unicidad: RUT repetido, período de nómina repetido | El mensaje concreto |
  | `429` | Rate limit excedido | `"Demasiados intentos, intenta más tarde"` + cabecera `Retry-After` |

- **Validación:** zod, esquemas en `lib/finanzas/schemas.ts`. Todo handler parsea su entrada
  **antes** de tocar la base. La validación de cliente es UX, no seguridad (regla 1 del repo).
- **Paginación:** **siempre en la base de datos**, con `take`/`skip`. Parámetros `page` (1-based) y
  `pageSize`. `pageSize` por defecto 25, **tope duro 100** aplicado en `lib/finanzas/paginacion.ts`.
  Ninguna respuesta devuelve la tabla entera. Nunca se pagina en el navegador.
- **Idempotencia:** ninguna ruta de Finanzas la necesita — no hay webhooks ni reintentos externos.
  `PayrollRun.period @unique` cubre el único caso real (crear dos veces la nómina del mismo mes).
- **Timestamps:** siempre del servidor. Ningún handler acepta `createdAt`, `paidAt`, `approvedAt` ni
  `terminatedAt` desde el cliente. La única fecha que el cliente elige es `FinanceTransaction.date`,
  que es la fecha **contable** del movimiento, no un timestamp de sistema.
- **Transacciones:** toda mutación que toca más de una tabla va dentro de `prisma.$transaction`, y la
  fila de auditoría se escribe **dentro de esa misma transacción** (regla 8 del repo).

### Rate limits

| Superficie | Límite | Clave | Dónde se aplica |
|---|---|---|---|
| Login fallido | 5 por email / 15 min | `login:<email>` | **Dentro de `authorize()` en `lib/auth.ts`** — el matcher del middleware excluye `/api/auth`, así que no hay otro lugar donde interceptarlo |
| `GET`/`POST`/`PATCH` en `/api/finanzas/*` | 120 req / min por usuario | `finanzas:api:<userId>` | Helper compartido llamado al inicio de cada handler |
| Exportación CSV | 5 por hora por usuario | `export:<userId>` | `app/api/finanzas/export/route.ts` — es el límite que evita que alguien se lleve la base entera |
| Recuperación de contraseña | 3 por hora por cuenta | `reset:<userId>` | `app/api/auth/recuperar/route.ts` |

Al exceder: `apiError("Demasiados intentos, intenta más tarde", 429)` con cabecera `Retry-After` en
segundos. El backend es Postgres (`RateLimitCounter`), no memoria — ver §14 y §20.3.

### Rutas

`E` = requiere `canWriteFinance` (escritura). `L` = requiere `hasFinanceAccess` (lectura o
escritura). Ninguna de estas rutas acepta a un ADMIN sin grant.

| Método | Ruta | Qué hace | Auth | Rate limit |
|---|---|---|---|---|
| GET | `/api/finanzas/empleados` | Lista paginada de trabajadores, filtro por `status` | L | 120/min |
| POST | `/api/finanzas/empleados` | Crea trabajador; cifra la cuenta bancaria; audita | E | 120/min |
| GET | `/api/finanzas/empleados/[id]` | Ficha del trabajador, serializada según rol | L | 120/min |
| PATCH | `/api/finanzas/empleados/[id]` | Edita trabajador; audita con `before`/`after` | E | 120/min |
| POST | `/api/finanzas/empleados/[id]/desvincular` | Marca `DESVINCULADO`, purga datos bancarios y de contacto, audita | E | 120/min |
| GET | `/api/finanzas/proveedores` | Lista paginada | L | 120/min |
| POST | `/api/finanzas/proveedores` | Crea proveedor; cifra la cuenta; audita | E | 120/min |
| GET | `/api/finanzas/proveedores/[id]` | Ficha | L | 120/min |
| PATCH | `/api/finanzas/proveedores/[id]` | Edita; audita | E | 120/min |
| GET | `/api/finanzas/categorias` | Lista de categorías activas | L | 120/min |
| POST | `/api/finanzas/categorias` | Crea categoría; audita | E | 120/min |
| GET | `/api/finanzas/transacciones` | Lista paginada en BD, filtros `kind`, `desde`, `hasta`, `categoryId`, `supplierId` | L | 120/min |
| POST | `/api/finanzas/transacciones` | Crea ingreso o egreso; audita | E | 120/min |
| PATCH | `/api/finanzas/transacciones/[id]` | Edita o anula (`status = ANULADO`); nunca borra; audita | E | 120/min |
| GET | `/api/finanzas/anticipos` | Lista paginada, filtro por `employeeId` y `status` | L | 120/min |
| POST | `/api/finanzas/anticipos` | Crea anticipo; audita | E | 120/min |
| PATCH | `/api/finanzas/anticipos/[id]` | Marca pagado o anulado; audita | E | 120/min |
| GET | `/api/finanzas/nominas` | Lista de nóminas por período | L | 120/min |
| POST | `/api/finanzas/nominas` | Crea la nómina del período con una línea por trabajador `ACTIVO`, calculada por `lib/finanzas/payroll.ts`; audita | E | 120/min |
| GET | `/api/finanzas/nominas/[id]` | Cabecera + líneas, serializadas según rol | L | 120/min |
| PATCH | `/api/finanzas/nominas/[id]` | Aprueba o marca pagada; audita | E | 120/min |
| GET | `/api/finanzas/nominas/[id]/pago` | **Descifra** las cuentas bancarias para armar la nómina de pago. Escribe fila de auditoría `DESCIFRAR` antes de devolver | **E únicamente** | 120/min |
| GET | `/api/finanzas/reportes` | Agregados del período: ingresos, egresos, saldo, por categoría | L | 120/min |
| GET | `/api/finanzas/auditoria` | Visor paginado del log, filtros por `entityType`, `actorId`, rango de fechas | L | 120/min |
| GET | `/api/finanzas/export` | CSV de movimientos del rango. Audita `EXPORTAR` con el rango y el conteo de filas | L | **5/hora** |
| POST | `/api/auth/recuperar` | Dispara el enlace al correo de la cuenta | Pública | 3/hora por cuenta |
| POST | `/api/auth/recuperar/confirmar` | Canjea el token y fija la contraseña nueva | Pública (el token es la credencial) | 3/hora por cuenta |

**No existe ninguna ruta que actualice o borre `FinanceAuditLog`.** No es un descuido: es el
contrato. Si alguna vez aparece una, el módulo dejó de servir para lo que se construyó.

### Interfaces held constant

Estas firmas y formas **no cambian** en este trabajo. Cada una es también una fila de la valla de
alcance de §1.

| Interfaz | Se congela en | Por qué |
|---|---|---|
| `hasModuleAccess(user, module): boolean`, con bypass de ADMIN | `lib/access.ts` | La usan `middleware.ts`, `AdminSidebar.tsx` y las rutas de tres módulos productivos |
| `apiError(message, status = 400)` → `NextResponse.json({ error: message }, { status })` | `lib/utils.ts:19` | Todo el frontend existente parsea `{ error }` |
| `session.user.{id, role, moduleAccess}` | `lib/auth.ts` (callbacks `jwt` y `session`) | Lo lee cada handler del repo |
| Endpoints de Operaciones, CRM e Inventario | `app/api/**` | No se tocan |
| Valores existentes de `ModuleAccess` y `UserRole` | `prisma/schema.prisma` | Renombrar un valor de enum en Postgres es destructivo |
| Tipos de columnas existentes | `prisma/schema.prisma` | `db push` sin `--accept-data-loss` falla, y con razón |
| `sendMail(input)` de `lib/outreach/smtp.ts` | `lib/outreach/smtp.ts` | El cron de Outreach depende de ella; Finanzas la consume, no la modifica |

### Endpoints críticos — detalle completo

#### `GET /api/finanzas/nominas/[id]/pago` — el único que descifra

Es la ruta más sensible del módulo. Todo lo demás protege esto.

**Autorización:** `canWriteFinance(session.user)`. **`FINANZAS_LECTURA` recibe 403**, aunque pueda
ver la nómina completa en `GET /api/finanzas/nominas/[id]`. Elizabeth ve cuánto se le paga a cada
quien; no ve los números de cuenta.

**Precondición:** `PayrollRun.status` debe ser `APROBADA` o `PAGADA`. Un `BORRADOR` devuelve `409`
con `"La nómina debe estar aprobada antes de generar el pago"`.

**Efecto secundario obligatorio:** antes de devolver, escribe **una** fila en `FinanceAuditLog` con
`action: "DESCIFRAR"`, `entityType: "PayrollRun"`, `entityId` igual al id de la nómina, y en `after`
el **conteo** de cuentas descifradas — nunca las cuentas. La escritura de auditoría y la lectura van
en el mismo `prisma.$transaction`: si la auditoría falla, no se devuelve nada.

**Respuesta:**

```json
{
  "period": "2026-08",
  "lineas": [
    {
      "employeeId": "clxxxxxxxxxxxxxxxxxxxxxxx",
      "fullName": "Nombre Apellido",
      "rut": "12345678-9",
      "bankName": "Banco Estado",
      "bankAccountType": "VISTA",
      "bankAccount": "000123456789",
      "netAmount": 620000
    }
  ]
}
```

`bankAccount` es el único lugar de toda la aplicación donde una cuenta bancaria viaja en claro.

**Errores:** `401` sin sesión · `403` sin `canWriteFinance` · `404` nómina inexistente · `409`
nómina en `BORRADOR` · `429` rate limit · `500` si `FINANZAS_ENCRYPTION_KEY` no está configurada,
con mensaje nombrado (`"Falta la variable de entorno FINANZAS_ENCRYPTION_KEY"`), nunca genérico.

#### `POST /api/finanzas/nominas` — genera la nómina del período

**Entrada:** `{ "period": "2026-08" }`, validado por zod contra el patrón de año-mes.

**Comportamiento:** dentro de un `prisma.$transaction`, para cada `Employee` con `status = ACTIVO`
crea un `PayrollItem` calculado por `calcularLiquido()` de `lib/finanzas/payroll.ts`, aplica los
`Advance` en estado `PAGADO` de ese trabajador (los pasa a `DESCONTADO` y los enlaza al
`payrollItemId`), suma `totalGross` y `totalNet` en la cabecera, y escribe una fila de auditoría
`CREAR` sobre `PayrollRun`.

**Errores:** `409` si ya existe un `PayrollRun` con ese `period` — lo garantiza el índice único, no
un chequeo previo que podría correr en carrera · `400` si el formato del período no valida · `403`
sin `canWriteFinance`.

#### `PATCH /api/usuarios` — el bloqueo que sostiene el escenario (A)

Es una ruta **existente** que este cambio endurece (hallazgo #4).

**Regla nueva 1 — el ADMIN no elige la contraseña de una cuenta de Finanzas.** Si el cuerpo trae
`password` y la cuenta destino tiene `FINANZAS` o `FINANZAS_LECTURA` en su `moduleAccess`, responde
`403` con `"No puedes fijar la contraseña de una cuenta de Finanzas. Usa el enlace de recuperación."`
El ADMIN sí puede **disparar** el enlace; no puede elegir la clave.

**Regla nueva 2 — cambiar permisos de Finanzas deja rastro y avisa.** Si el `moduleAccess` entrante
agrega o quita `FINANZAS` o `FINANZAS_LECTURA` respecto del actual, dentro de la misma transacción
se escribe una fila `FinanceAuditLog` con `action: "CAMBIAR_PERMISOS"`, `entityType: "User"`,
`before` y `after` con los arreglos de módulos; y **después de que la transacción confirma** se
dispara un correo vía `sendMail()` a las direcciones de `FINANZAS_NOTIFY_EMAILS`.

**Esto no lo hace imposible; lo hace imposible de ocultar.** Es exactamente el modelo de amenaza
acordado (§14).

**Regla nueva 3:** `VALID_MODULES` (hoy en `app/api/usuarios/route.ts:35`) incluye `FINANZAS` y
`FINANZAS_LECTURA`; las dos listas de roles válidos (hoy en las líneas 61 y 145) incluyen
`FINANZAS`. Sin esto, otorgar el permiso devuelve `"Módulos inválidos"` y el módulo es inalcanzable.

#### `POST /api/auth/recuperar` — enlace de recuperación

**Entrada:** `{ "email": "..." }`.

**Respuesta:** **siempre `200`** con `{ "ok": true }` y el mismo mensaje, exista o no la cuenta. No
se filtra qué correos están registrados. La diferencia entre "existe" y "no existe" no debe ser
observable ni por el cuerpo, ni por el status, ni por una diferencia de tiempo groseramente distinta.

**Si la cuenta existe y está activa:** genera 32 bytes aleatorios, guarda el SHA-256 del token en
`PasswordResetToken.tokenHash` con `expiresAt` a 30 minutos, y envía por correo el enlace
`<NEXTAUTH_URL>/recuperar/confirmar?token=<token en claro>`.

**Rate limit:** 3 por hora por cuenta. Al exceder devuelve igualmente `200` para no filtrar
existencia, pero **no** emite token ni correo, y escribe una fila de auditoría.

#### `POST /api/auth/recuperar/confirmar`

**Entrada:** `{ "token": "...", "password": "..." }`. La contraseña se valida con las mismas reglas
que ya usa el repo: mínimo 8 caracteres, hash bcrypt con costo 12.

**Comportamiento:** busca por el SHA-256 del token. Rechaza con `400` si no existe, si `usedAt` no es
null, o si `expiresAt` ya pasó — con el **mismo** mensaje en los tres casos:
`"Enlace inválido o expirado"`. Dentro de un `prisma.$transaction`: fija `usedAt`, actualiza
`User.password`, y escribe la fila de auditoría.

---

## 6. Frontend Architecture

Finanzas es **escritorio**. Densidad sobre animación: tablas compactas, formularios de una columna
con etiquetas visibles, cero carruseles. La regla mobile-first del repo aplica a lo que usa un chofer
en terreno, no a esto.

### Rutas

Todas bajo el grupo `(admin)`, que **no aparece en la URL**: `app/(admin)/admin/finanzas/page.tsx`
sirve `/admin/finanzas`.

| Ruta | Página | Fuente de datos | Auth |
|---|---|---|---|
| `/admin/finanzas` | Resumen del mes: ingresos, egresos, saldo, gráfico por categoría | Server component → `prisma` directo | `hasFinanceAccess` |
| `/admin/finanzas/movimientos` | Ingresos y egresos, tabla filtrable y paginada en servidor | Server component con `searchParams` → `prisma` con `take`/`skip` | `hasFinanceAccess` |
| `/admin/finanzas/proveedores` | Lista y alta de proveedores | Server component + acciones vía `fetch` a la API | `hasFinanceAccess` |
| `/admin/finanzas/trabajadores` | Lista de trabajadores | Server component | `hasFinanceAccess` |
| `/admin/finanzas/trabajadores/[id]` | Ficha, edición, anticipos del trabajador | Server component | `hasFinanceAccess` |
| `/admin/finanzas/anticipos` | Anticipos pendientes y pagados | Server component | `hasFinanceAccess` |
| `/admin/finanzas/nominas` | Nóminas por período | Server component | `hasFinanceAccess` |
| `/admin/finanzas/nominas/[id]` | Detalle de la nómina, líneas, aprobación, nómina de pago | Server component + cliente para la tabla de pago | `hasFinanceAccess`; el panel de pago sólo con `canWriteFinance` |
| `/admin/finanzas/auditoria` | Visor del log, paginado y filtrable | Server component | `hasFinanceAccess` |

### El contrato de sólo lectura

**Elizabeth (`FINANZAS_LECTURA`) ve todas las pantallas, sin un solo botón de crear, editar, aprobar,
anular ni exportar.** Y aunque la UI se saltara —extensión del navegador, `fetch` a mano, un bug de
render— **el servidor rechaza cualquier mutación con `403`**, porque cada handler de mutación llama a
`canWriteFinance()` antes de tocar nada.

Es la regla 5 del repo dicha en concreto: esconder el botón es presentación, no permiso. Las dos
capas existen y ninguna reemplaza a la otra. En cada página, el patrón es una sola línea:

```tsx
const puedeEscribir = canWriteFinance(session.user);
// ...
{puedeEscribir && <BotonNuevoMovimiento />}
```

### Estrategia de renderizado

- **Todo server component por defecto.** Las páginas leen la sesión con `getServerSession` y
  consultan Prisma directamente. No hay una capa de API intermedia para las lecturas.
- **`"use client"` sólo en las hojas**: filtros de la tabla, formularios, diálogos de confirmación.
  Nunca en la página completa.
- **Sin caché.** Toda página de Finanzas depende de la sesión, así que Next la trata como dinámica.
  Es lo correcto: nadie quiere ver el saldo del mes cacheado.
- **Las mutaciones van por `fetch` a `/api/finanzas/*`**, que es donde vive el portero, el rate limit
  y la auditoría. No hay server actions en este módulo: un solo camino de escritura es más fácil de
  auditar que dos.

### Jerarquía de componentes

```
app/(admin)/admin/finanzas/layout.tsx            (server)
  nav de Finanzas                                 (server) — links según canWriteFinance
    children

app/(admin)/admin/finanzas/movimientos/page.tsx  (server)
  FiltrosMovimientos                              (client) — escribe searchParams, no estado global
  TablaMovimientos                                (server) — recibe filas ya serializadas
    FilaMovimiento                                (server)
  Paginador                                       (server) — links, no botones con estado
  DialogoNuevoMovimiento                          (client) — sólo si canWriteFinance

app/(admin)/admin/finanzas/nominas/[id]/page.tsx (server)
  CabeceraNomina                                  (server)
  TablaLineas                                     (server)
  PanelPago                                       (client) — sólo si canWriteFinance;
                                                   pide GET /nominas/[id]/pago bajo demanda
```

### Manejo de estado

- **Estado de servidor:** los datos vienen del server component. No hay librería de caché de
  consultas, y no se agrega una: las pantallas son listas paginadas que se re-renderizan al navegar.
- **Estado de cliente:** `useState` local en las hojas. Los filtros viven en la URL
  (`searchParams`), no en memoria — así un filtro se puede compartir por link y sobrevive al refresh.
- **Formularios:** estado local controlado, validación de cliente sólo como UX. La verdad la dice el
  `400` del servidor con el mensaje del campo.
- **Deliberadamente NO en estado global:** los datos financieros. Nada de un store con la lista de
  trabajadores; cada pantalla consulta lo suyo.
- **Feedback:** `sonner` para los toasts, que ya está en el repo.

### Estados de carga, vacío y error

Cada lista del módulo especifica los tres. Es la falta más común en UI generada por agentes.

| Superficie | Carga | Vacío | Error |
|---|---|---|---|
| Movimientos | Skeleton de 5 filas con la misma altura que una fila real | "No hay movimientos en este período." + botón "Nuevo movimiento" si `canWriteFinance` | "No se pudieron cargar los movimientos." + botón Reintentar |
| Trabajadores | Skeleton de 5 filas | "Aún no hay trabajadores cargados." + botón "Nuevo trabajador" si `canWriteFinance` | Igual |
| Anticipos | Skeleton de 3 filas | "Sin anticipos registrados." | Igual |
| Nóminas | Skeleton de 3 filas | "Todavía no se ha generado ninguna nómina." | Igual |
| Auditoría | Skeleton de 10 filas | "No hay registros para estos filtros." | Igual |
| Resumen | Skeletons en las 3 tarjetas de KPI y en el gráfico | "Sin movimientos este mes." con las tarjetas en cero | "No se pudo calcular el resumen." |
| Nómina de pago | Spinner en el panel | No aplica: si la nómina existe, tiene líneas | `403` → "No tienes permiso para ver las cuentas bancarias." `409` → "La nómina debe estar aprobada." |

---

## 7. Design System

Finanzas **no introduce un sistema visual nuevo**: adopta el del admin existente (Tailwind 3, fuente
Geist, Phosphor Icons, `@base-ui/react`, `cn()` de `lib/utils.ts`). Lo que esta sección fija son los
tokens semánticos del módulo, con valores literales, para que "positivo", "negativo" y "peligroso"
signifiquen lo mismo en las nueve pantallas.

### Colores

Los hex son los de la paleta por defecto de Tailwind 3, que es la que ya está en uso; se nombran
literalmente aquí para que no dependan de recordar el número de tono.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--fin-primary` | `#1D4ED8` | `#3B82F6` | Botones primarios, links, anillo de foco |
| `--fin-primary-fg` | `#FFFFFF` | `#0F172A` | Texto sobre primario |
| `--fin-background` | `#F8FAFC` | `#0F172A` | Fondo de página |
| `--fin-surface` | `#FFFFFF` | `#1E293B` | Tarjetas, paneles, diálogos, filas de tabla |
| `--fin-border` | `#E2E8F0` | `#334155` | Divisores, bordes de input, líneas de tabla |
| `--fin-fg` | `#0F172A` | `#F1F5F9` | Texto de cuerpo y montos |
| `--fin-fg-muted` | `#475569` | `#94A3B8` | Etiquetas, encabezados de tabla, texto secundario |
| `--fin-destructive` | `#B91C1C` | `#F87171` | **Egresos**, anulación, errores, saldo negativo |
| `--fin-success` | `#15803D` | `#4ADE80` | **Ingresos**, confirmaciones, saldo positivo |
| `--fin-warning` | `#B45309` | `#FBBF24` | Estado `BORRADOR`, anticipos `PENDIENTE` |

La columna oscura queda escrita para el día que el admin adopte tema oscuro; hoy el shell existente
es claro y Finanzas lo sigue. No se agrega un conmutador de tema en este cambio.

**Convención de signo, no negociable:** ingreso = `--fin-success`, egreso = `--fin-destructive`,
siempre, en tabla, gráfico y tarjeta de KPI. **El color nunca es el único portador del dato**: cada
monto lleva además su signo (`+` / `−`) y cada estado lleva su etiqueta en texto. Un daltónico y un
lector de pantalla tienen que poder distinguir un ingreso de un egreso.

**Contraste** — calculado con la fórmula WCAG 2.2 de luminancia relativa sobre los hex de arriba,
modo claro:

| Par | Ratio | Requisito | Resultado |
|---|---|---|---|
| `--fin-fg` `#0F172A` sobre `--fin-surface` `#FFFFFF` | **17.9:1** | 4.5:1 | Pasa |
| `--fin-fg-muted` `#475569` sobre `#FFFFFF` | **7.5:1** | 4.5:1 | Pasa |
| `--fin-primary-fg` `#FFFFFF` sobre `--fin-primary` `#1D4ED8` | **6.7:1** | 4.5:1 | Pasa |
| `--fin-destructive` `#B91C1C` sobre `#FFFFFF` | **6.5:1** | 4.5:1 | Pasa |
| `--fin-success` `#15803D` sobre `#FFFFFF` | **5.1:1** | 4.5:1 | Pasa |

Ninguno de estos pares se puede cambiar sin recalcular el ratio.

### Tipografía

| Rol | Familia | Tamaño / interlineado | Peso | Tracking |
|---|---|---|---|---|
| Título de página | Geist Sans | 24px / 32px | 600 | −0.01em |
| Encabezado de sección | Geist Sans | 18px / 26px | 600 | 0 |
| Cuerpo | Geist Sans | 14px / 20px | 400 | 0 |
| Encabezado de tabla | Geist Sans | 12px / 16px | 600, versalitas | 0.04em |
| **Montos** | **Geist Mono**, `font-variant-numeric: tabular-nums` | 14px / 20px | 500 | 0 |
| Monto de KPI | Geist Mono, tabular | 30px / 36px | 600 | −0.01em |

**Los montos van en mono con cifras tabulares, siempre.** Una columna de pesos en fuente
proporcional no alinea las unidades y hace imposible comparar de un vistazo — que es literalmente
para lo que sirve la tabla.

**Carga de fuentes:** Geist ya está cargada por el layout raíz del repo vía `next/font`, self-hosted,
con `font-display: swap`. Finanzas no agrega ninguna fuente. Fallback:
`ui-sans-serif, system-ui, sans-serif` y `ui-monospace, SFMono-Regular, Menlo, monospace`.

### Espaciado, radio, elevación

- **Escala de espaciado:** base 4px — 4, 8, 12, 16, 24, 32, 48, 64. Sin valores arbitrarios.
- **Densidad de tabla:** alto de fila 40px, padding horizontal de celda 12px. Es una herramienta de
  escritorio; caben unas 18 filas sin scroll en un portátil de 1080p.
- **Radio:** 6px en inputs y botones, 8px en tarjetas y diálogos, `full` en badges de estado.
- **Elevación:** plano. Sólo bordes (`--fin-border`). Un único nivel de sombra, reservado a diálogos
  y popovers: `0 10px 30px -10px rgb(15 23 42 / 0.25)`.
- **Ancho máximo de contenido:** 1280px. **Breakpoints:** Tailwind por defecto — `sm` 640, `md` 768,
  `lg` 1024, `xl` 1280. El módulo se diseña para `lg` y arriba; bajo `md` degrada a tarjetas
  apiladas y sigue siendo legible, pero no es el caso de uso.

### Movimiento

| Clase de interacción | Duración | Easing |
|---|---|---|
| Hover y foco | 120ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Apertura de diálogo / popover | 180ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Toast entrando / saliendo | 200ms | el de `sonner`, sin tocar |
| Ordenar o filtrar una tabla | **0ms** | Sin animación: la tabla se re-renderiza. Animar 200 filas es peor que no animar |

Sólo se anima `transform` y `opacity`. Todo respeta `prefers-reduced-motion: reduce`, que en este
módulo significa duración 0 en todo lo de arriba.

### Estilo de componentes

Panel administrativo denso y sobrio: superficies blancas con bordes de 1px, cero sombras salvo en
capas flotantes, tipografía pequeña y jerarquía dada por peso y color, no por tamaño. Un componente
nuevo pertenece si se puede describir como "una tabla, un formulario o una tarjeta de número" y si
funciona igual de bien a 1280px que a 1440px. Si tiene una ilustración, un degradado o una animación
de entrada, no pertenece. La referencia es el propio módulo de Inventario del repo, que ya tiene el
tono correcto.

---

## 8. Authentication & Authorization

### Proveedor y justificación

**NextAuth v4 con `CredentialsProvider` y bcrypt.** Ya está en producción, ya revalida rol,
`isActive` y `moduleAccess` contra la base de datos en cada renovación del JWT — lo que significa que
desactivar un usuario mata su sesión — y ya tiene la cookie configurada como corresponde. Cambiar de
proveedor de identidad para un módulo interno de dos personas sería un proyecto entero para no ganar
nada.

Lo único que cambia aquí es que la recuperación de contraseña deja de ser "el ADMIN te la fija" y
pasa a ser "te llega un enlace" (paso 9).

### Flujos

**Ingreso.** `/login` → `authorize()` en `lib/auth.ts` → bcrypt `compare` → JWT de 8 horas. **Nuevo:**
antes del `compare`, se consulta el rate limit de login. Al sexto intento fallido dentro de la
ventana de 15 minutos, `authorize()` devuelve `null` sin siquiera consultar el hash, y el usuario ve
el mismo mensaje de credenciales inválidas — no se le dice que está bloqueado, porque eso confirma
que el correo existe.

**Alta de cuenta.** No existe auto-registro. Un ADMIN crea la cuenta en `/admin/usuarios` y le asigna
`moduleAccess`. **Ese momento es el que se audita y se notifica por correo** (§5).

**Recuperación de contraseña — el flujo nuevo.**

1. El titular (o un ADMIN en su nombre) hace `POST /api/auth/recuperar` con el correo.
2. Respuesta `200` idéntica exista o no la cuenta.
3. Si existe y está activa: token de 32 bytes, su SHA-256 guardado, enlace enviado por `sendMail()`,
   válido 30 minutos, un solo uso.
4. El titular abre el enlace y hace `POST /api/auth/recuperar/confirmar` con el token y su contraseña
   nueva (mínimo 8 caracteres, bcrypt costo 12).
5. Se marca `usedAt`, se actualiza la contraseña y se audita — todo en una transacción.

**Fallo del flujo:** token inexistente, ya usado o expirado → `400` con **el mismo** mensaje
`"Enlace inválido o expirado"` en los tres casos. Distinguirlos le regala al atacante el saber si un
token existió.

**Expiración de sesión.** 8 horas, sin refresh silencioso. Al vencer, el middleware redirige a
`/login`. Para un módulo de finanzas eso es correcto, no molesto.

**Cierre de sesión.** El del repo, sin cambios.

**Baja de cuenta.** `isActive = false` desde `/admin/usuarios`. El callback `jwt` lo detecta en la
siguiente renovación y la sesión muere. No hay borrado duro de `User` mientras tenga historial
financiero: las FK de `FinanceTransaction`, `Advance` y `PayrollRun` son `Restrict` justamente para
que la base lo impida.

### Protección de rutas — dos capas, ninguna reemplaza a la otra

**Capa 1 — `middleware.ts`.** Ramas nuevas para `/admin/finanzas` y `/api/finanzas`, colocadas
**antes** del fallback genérico de `/admin` y **antes** del retorno temprano de `/api/`. El comentario
"El orden importa" que ya está en el archivo es literal: la rama actual de `/api/` hace
`return NextResponse.next()` en la línea 20, así que una rama de `/api/finanzas` escrita después de
ella **nunca se evalúa**.

La forma correcta, en orden:

```ts
if (pathname.startsWith("/api/finanzas")) {
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasFinanceAccess(user))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  return NextResponse.next();
}
if (pathname.startsWith("/api/")) {
  // ... rama existente, sin cambios
}
```

Y del lado de las páginas, **antes** de la rama genérica de `/admin`:

```ts
if (pathname.startsWith("/admin/finanzas")) {
  if (!hasFinanceAccess(user)) return NextResponse.redirect(new URL("/login", req.url));
} else if (pathname.startsWith("/admin/crm")) {
  // ... ramas existentes, sin cambios
}
```

**Una ruta de API devuelve JSON con `403`, nunca un redirect.** Un `fetch` que recibe un redirect a
`/login` obtiene HTML con status 200 y el frontend lo intenta parsear como JSON — el bug se
manifiesta como "error de parseo", que es lo más lejos posible de la causa real.

**Capa 2 — cada handler.** Todo route handler de `/api/finanzas/*` vuelve a llamar
`hasFinanceAccess()` (lectura) o `canWriteFinance()` (mutación). No es redundancia paranoica: el
matcher del middleware es una expresión regular que alguien puede cambiar, y el hallazgo #3 dice que
hoy las rutas de API no se gatean por módulo. La segunda capa es la que sigue en pie si la primera se
rompe.

**Capa 3 — el guardia mecánico.** `lib/finanzas/routes.test.ts` recorre con `node:fs` todos los
archivos bajo `app/api/finanzas/` y falla **nombrando el archivo** si alguno no contiene
`hasFinanceAccess` ni `canWriteFinance`. Corre en cada `npm run test` con el Vitest existente, sin
tocar `vitest.config.ts`. Es el paso 10, y es uno de los entregables más importantes de este
blueprint: convierte "acordarse de poner el portero" en un error de build.

| Superficie | Regla | Se aplica en |
|---|---|---|
| `/admin/finanzas/**` | `hasFinanceAccess`, si no redirect a `/login` | `middleware.ts` |
| `/api/finanzas/**` (lectura) | `hasFinanceAccess`, si no `403` JSON | `middleware.ts` + cada `route.ts` |
| `/api/finanzas/**` (mutación) | `canWriteFinance`, si no `403` JSON | cada `route.ts` |
| `/api/finanzas/nominas/[id]/pago` | `canWriteFinance` **únicamente** | `app/api/finanzas/nominas/[id]/pago/route.ts` |
| `PATCH /api/usuarios` con `password` sobre cuenta de Finanzas | `403` siempre | `app/api/usuarios/route.ts` |
| Link de Finanzas en el sidebar | `moduleAccess`, **sin** bypass de `isAdmin` | `components/ui/AdminSidebar.tsx` |
| `/api/auth/recuperar*` | Pública, con rate limit | las propias rutas |

**Regla de aplicación:** la autorización se verifica en el servidor en cada request, antes del
trabajo, no después. Un botón escondido no es un permiso.

### Los porteros — `lib/access.ts`

Se agregan dos funciones. **`hasModuleAccess()` no se modifica**: el bypass de ADMIN sigue vigente
para OPERACIONES, CRM e INVENTARIO. No se toca lo que funciona.

```ts
export type FinanceModuleKey = "FINANZAS" | "FINANZAS_LECTURA";

/** Acceso a Finanzas. A diferencia de hasModuleAccess(), ADMIN NO tiene bypass:
 *  el acceso a datos de remuneración se concede explícitamente o no existe. */
export function hasFinanceAccess(user: AuthorizedUser): boolean {
  return (
    user.moduleAccess.includes("FINANZAS") ||
    user.moduleAccess.includes("FINANZAS_LECTURA")
  );
}

/** Escritura en Finanzas. Tampoco hay bypass de ADMIN.
 *  FINANZAS_LECTURA nunca puede mutar, ni siquiera si además es ADMIN. */
export function canWriteFinance(user: AuthorizedUser): boolean {
  return user.moduleAccess.includes("FINANZAS");
}
```

**El test que define el módulo** vive en `lib/access.test.ts` (archivo que ya existe y se amplía, no
se reemplaza):

```ts
it("ADMIN sin grant NO entra a Finanzas", () => {
  expect(hasFinanceAccess({ role: "ADMIN", moduleAccess: [] })).toBe(false);
  expect(canWriteFinance({ role: "ADMIN", moduleAccess: [] })).toBe(false);
});
```

Si ese test se pone en verde borrando la aserción, el módulo perdió su razón de existir.

### Roles y permisos

| Rol / grant | Puede | No puede |
|---|---|---|
| `FINANZAS` en `moduleAccess` (Marcela) | Ver y crear/editar/anular trabajadores, proveedores, categorías, movimientos, anticipos y nóminas; aprobar y marcar pagada una nómina; generar la nómina de pago con cuentas descifradas; exportar CSV; ver el visor de auditoría | Modificar o borrar filas de auditoría (no existe la ruta); cambiar permisos de otros usuarios (eso es de ADMIN); ver la contraseña de nadie |
| `FINANZAS_LECTURA` en `moduleAccess` (Elizabeth) | Ver **todas** las pantallas, incluidos sueldos individuales con nombre y el visor de auditoría | Crear, editar, anular, aprobar, marcar pagada, exportar CSV ni ver cuentas bancarias descifradas. **Todo `403` del servidor**, no sólo botón escondido |
| `ADMIN` sin grant de Finanzas | Administrar usuarios, y todo lo de los otros tres módulos por el bypass existente | Entrar a `/admin/finanzas` o `/api/finanzas/*`; ver el link en el sidebar; fijar la contraseña de una cuenta de Finanzas. Puede **darse** el permiso a sí mismo, y eso deja auditoría y dispara correo |
| `CHOFER`, `RECEPCION`, `VENTAS`, `BODEGA` sin grant | Lo suyo | Nada de Finanzas |

### Sesiones

Sin cambios respecto de lo que ya está en producción: JWT de NextAuth, 8 horas, cookie
`__Secure-next-auth.session-token` en producción y `next-auth.session-token` en desarrollo,
`httpOnly`, `sameSite: lax`, `secure` en producción. La protección CSRF es la de NextAuth para sus
propias rutas; para las rutas de Finanzas la defensa efectiva es `sameSite: lax` más el hecho de que
toda mutación es `POST`/`PATCH` con `Content-Type: application/json`, que un formulario cross-site no
puede emitir sin preflight CORS.

### Aislamiento por fila / multi-tenancy

**NOT APPLICABLE — hay una sola organización.** Coopera Pro es la única empresa en esta base de
datos; no existe una columna de tenant que cruzar. El aislamiento que sí importa aquí es por
**módulo**, y lo resuelven los porteros de `lib/access.ts` más el guardia de
`lib/finanzas/routes.test.ts`.

---

## 9. BUILD ORDER

**Esta es la sección para la que existe el blueprint.** Todo lo de arriba es contexto; esto es el
instructivo. Un builder que sigue §9 al pie de la letra y se detiene cuando cada portón queda en
verde entrega el módulo.

### Las reglas de un paso, en este repo

1. **Un paso, una sentada.** Máximo ~5 archivos y ~6 criterios de aceptación.
2. **Los cuatro campos son obligatorios:** `Do`, `Done when`, `Verify`, `Checkpoint`.
3. **`Done when` en forma EARS:** **CUANDO** `<disparador>` **EL SISTEMA DEBERÁ** `<respuesta observable>`.
4. **Prohibido "funciona", "está implementado", "se ve bien".** Qué número, qué fila, qué status, qué
   código de salida.
5. **`Verify` es shell literal con el resultado esperado en comentario, y sale 0 cuando el paso está
   correcto.**
6. **Un paso no está listo hasta que sus `Verify` pasan Y los de todos los pasos anteriores siguen
   pasando.**
7. **`Checkpoint` en cada paso:** `git tag step-NN-<slug>`. Es el objetivo de rollback del paso
   siguiente.
8. **Nunca saltarse pasos.** Si el 7 está bloqueado, detente y reporta.

**Restricción dura de este repo, y la que moldea todo lo demás:** `vitest.config.ts` recoge
**únicamente** `lib/**/*.test.ts`. No hay tests de rutas, ni E2E, ni Playwright, ni React Testing
Library, y **este cambio no instala ninguno** ni modifica `vitest.config.ts`. Por eso toda la lógica
de seguridad vive en `lib/finanzas/` como funciones puras: es lo único verificable con el arnés que
el repo ya tiene.

**Todo comando `Verify` de esta sección es uno de estos, y ninguno más:**

`npm run typecheck` · `npm run test` · `npx vitest run lib/finanzas/<archivo>.test.ts` ·
`npx vitest run lib/access.test.ts` · `npm run build` · `npm run db:push` ·
`npx prisma validate` · `npx prisma generate` · `test -f <ruta>` · `test -s <ruta>` · un `grep`
sobre un archivo · un `node -e` que lee un JSON del repo · el chequeo de formato de §13.

**`npm run lint` no aparece en ningún `Verify`, y no es un descuido.** Este repo **no tiene
configuración de ESLint** — no hay `.eslintrc*` en ninguna forma, ni clave `eslintConfig` en
`package.json`. `next lint` detecta esa ausencia y **abre un prompt interactivo** preguntando cómo
configurar ESLint. Un builder desatendido se queda ahí colgado para siempre. Se comprobó ejecutándolo
el 2026-08-07: el comando no retorna. La compuerta de estilo real de este repo es Prettier vía
`lint-staged`, y es la que usa §13.

No existen `npm run e2e`, `npm run db:migrate` ni Playwright en este repo. Inventarlos es un defecto.

**Carga de variables de entorno — esto no es ambiental.** El repo tiene `.env.local` y **no tiene**
`.env`, y **no tiene** la dependencia `dotenv`. Next.js lee `.env.local` al arrancar la aplicación,
pero el **CLI de Prisma no lee `.env.local`**: lee `.env` y `prisma/.env`. Por eso todo bloque que
invoque `prisma` trae, en el mismo bloque, sus dos líneas de export. Están escritas en §10 Bootstrap
y repetidas literalmente en el paso 1, que son los únicos dos lugares donde eso ocurre:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

Los tests de `lib/finanzas/` **no** necesitan esto: fijan ellos mismos las variables que usan
(`FINANZAS_ENCRYPTION_KEY` en `crypto.test.ts`) y no abren conexión a la base.

### Una unidad por paso — la regla de conteo

> **Un paso de §9 = una tarea en `tasks.json` = un bloque de tarea en un archivo de epic.**

Este build tiene **20 pasos**, por lo tanto 20 tareas y 20 bloques de tarea repartidos en 5 epics.

**Desviación declarada de la plantilla:** la regla derivada de la plantilla
(`ceil(20÷9)=3` a `floor(20÷5)=4` epics) permitiría 3 o 4 epics. Este bundle usa **5**, con el corte
por frontera funcional que pidió el dueño del proyecto: seguridad (1–10), datos maestros (11–12),
movimientos (13–14), nóminas (15–16), reportes y cierre (17–20). El corte de seguridad es
deliberadamente grande porque es una unidad indivisible: ninguna pantalla puede existir antes que su
portero, y partir esos diez pasos en dos epics invitaría a empezar la segunda mitad sin la primera.

### Step map

| # | Paso | Depende de | Toca | Portón |
|---|---|---|---|---|
| 1 | Esquema Prisma y `db push` con respaldo verificado | — | `prisma/schema.prisma`, `tsconfig.json` | `npm run db:push` sale 0 y los 10 modelos están en el schema |
| 2 | Porteros sin bypass de ADMIN | 1 | `lib/access.ts`, `lib/access.test.ts` | `npx vitest run lib/access.test.ts` |
| 3 | Ramas de middleware, en el orden correcto | 2 | `middleware.ts` | grep de orden + `npm run typecheck` |
| 4 | Auditoría transaccional | 1, 2 | `lib/finanzas/audit.ts` + test | `npx vitest run lib/finanzas/audit.test.ts` |
| 5 | Cifrado AES-256-GCM con rotación | 1 | `lib/finanzas/crypto.ts` + test, `VARIABLES_ENTORNO.md` | `npx vitest run lib/finanzas/crypto.test.ts` |
| 6 | RUT chileno y esquemas zod | 1 | `package.json`, `lib/finanzas/rut.ts` + test, `lib/finanzas/schemas.ts` + test | `npx vitest run` de los dos tests |
| 7 | Serialización y enmascarado por rol | 2, 5, 6 | `lib/finanzas/serialize.ts` + test | `npx vitest run lib/finanzas/serialize.test.ts` |
| 8 | Rate limiting y bloqueo de login | 1 | `lib/finanzas/rate-limit.ts` + test, `lib/auth.ts` | `npx vitest run lib/finanzas/rate-limit.test.ts` |
| 9 | Recuperación por enlace y cierre del hallazgo #4 | 4, 8 | `lib/finanzas/reset.ts` + test, 2 rutas nuevas, `app/api/usuarios/route.ts` | `npx vitest run lib/finanzas/reset.test.ts` + grep |
| 10 | El guardia: ninguna ruta sin portero | 2 | `lib/finanzas/routes.ts` + test | `npx vitest run lib/finanzas/routes.test.ts` |
| 11 | CRUD de trabajadores | 4, 7, 10 | 2 rutas, 2 páginas, `layout.tsx` | `npm run build` + el guardia |
| 12 | Proveedores y categorías | 11 | 3 rutas, 1 página | `npm run build` + el guardia |
| 13 | Movimientos con paginación en servidor | 12 | `lib/finanzas/paginacion.ts` + test, 2 rutas, 1 página | `npx vitest run lib/finanzas/paginacion.test.ts` |
| 14 | Anticipos | 11, 13 | 2 rutas, 1 página | `npm run build` + el guardia |
| 15 | Nóminas y cálculo de líquido | 14 | `lib/finanzas/payroll.ts` + test, 2 rutas, 1 página | `npx vitest run lib/finanzas/payroll.test.ts` |
| 16 | Nómina de pago con descifrado auditado | 5, 15 | 1 ruta, 1 página | `npm run build` + el guardia |
| 17 | Reportes y resumen del mes | 13 | `lib/finanzas/reportes.ts` + test, 1 ruta, 1 página | `npx vitest run lib/finanzas/reportes.test.ts` |
| 18 | Visor de auditoría | 4, 13 | 1 ruta, 1 página | `npm run build` + el guardia |
| 19 | Exportación CSV limitada y auditada | 8, 13 | `lib/finanzas/csv.ts` + test, 1 ruta | `npx vitest run lib/finanzas/csv.test.ts` |
| 20 | Cierre: sidebar, specs, desvinculación, barrido | todos | `AdminSidebar.tsx`, 1 ruta, los `*.spec.md`, `CLAUDE.md` | `npm run typecheck && npm run test && npm run build` |

**Orden de razonamiento:** fundaciones de seguridad primero, y ninguna pantalla antes que su portero.
Los pasos 1 a 10 no entregan una sola interfaz de usuario a propósito — entregan el esquema, los dos
porteros, la auditoría, el cifrado, la validación, la serialización, el rate limit, la recuperación
de acceso y el guardia mecánico. Recién en el paso 11 aparece la primera pantalla, y para entonces
todo lo que la protege ya está probado.

---

#### Step 1 — Esquema de Finanzas y `db push` con respaldo verificado

**Do**

Antes de tocar la base, **respaldar y comprobar el respaldo**. Después, agregar al schema los 7 enums
nuevos y los 10 modelos nuevos exactamente como están escritos en §4, más las 6 relaciones inversas
dentro del modelo `User` y los valores nuevos en `UserRole` y `ModuleAccess`.

Archivos:

- `prisma/schema.prisma` — editar. Nada existente cambia de tipo ni se borra (ver §4 *Delta*).
- `tsconfig.json` — editar: agregar `"blueprints"` al arreglo `exclude`, para que este bundle no
  entre al `tsc --noEmit` del repo (razón completa en §19.6).

Secuencia literal, en este orden:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
mkdir -p backups
pg_dump "$DIRECT_URL" > backups/pre-finanzas.sql
cp backups/pre-finanzas.sql "backups/pre-finanzas-$(date +%Y%m%d-%H%M).sql"   # copia con fecha para el archivo
```

`backups/` ya quedó ignorado por git en el Bootstrap de §10 — el respaldo **nunca** se commitea.

**Si `pg_dump` no está instalado**, detente y repórtalo. No sigas sin respaldo: un `db push` sobre la
base real sin respaldo es la línea de mayor riesgo de todo el build (§20.2).

Recién con el respaldo verificado: editar el schema, `npm run db:push`, `npx prisma generate`.

**Done when**

- [ ] CUANDO `test -s backups/pre-finanzas.sql` corre EL SISTEMA DEBERÁ salir 0, probando que el respaldo existe y no está vacío antes de tocar la base.
- [ ] CUANDO `npx prisma validate` corre sobre `prisma/schema.prisma` EL SISTEMA DEBERÁ salir 0.
- [ ] CUANDO se busca cada modelo nuevo en `prisma/schema.prisma` EL SISTEMA DEBERÁ encontrar `Employee`, `Supplier`, `FinanceCategory`, `FinanceTransaction`, `Advance`, `PayrollRun`, `PayrollItem`, `FinanceAuditLog`, `RateLimitCounter` y `PasswordResetToken`.
- [ ] CUANDO `npm run db:push` corre EL SISTEMA DEBERÁ salir 0 sin pedir `--accept-data-loss`.
- [ ] CUANDO se lee `tsconfig.json` EL SISTEMA DEBERÁ tener `"blueprints"` dentro del arreglo `exclude`.
- [ ] CUANDO `npm run typecheck` corre después de `npx prisma generate` EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
test -s backups/pre-finanzas.sql          # expect: exit 0 — respaldo existe y no está vacío
npx prisma validate                        # expect: exit 0
for m in Employee Supplier FinanceCategory FinanceTransaction Advance PayrollRun PayrollItem FinanceAuditLog RateLimitCounter PasswordResetToken; do grep -q "^model $m " prisma/schema.prisma || { echo "FALTA model $m"; exit 1; }; done
                                           # expect: exit 0 — cada modelo de §4 existe
grep -q "^  FINANZAS_LECTURA$" prisma/schema.prisma   # expect: exit 0 — enum ModuleAccess ampliado
node -e "const t=require('./tsconfig.json'); process.exit(t.exclude.includes('blueprints')?0:1)"
                                           # expect: exit 0
npm run db:push                            # expect: exit 0
npx prisma generate                        # expect: exit 0
npm run typecheck                          # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 1: esquema de Finanzas (7 enums, 10 modelos) y db push"
git tag step-01-schema-finanzas
git check-ignore -q backups/pre-finanzas.sql; test $? -eq 0   # expect: exit 0 — 0 = SÍ está ignorado, el respaldo no se commiteó
git ls-files --error-unmatch prisma/schema.prisma             # expect: exit 0 — ya commiteado arriba
# rollback si el paso 2 sale mal: git reset --hard step-01-schema-finanzas
```

---

#### Step 2 — Porteros de Finanzas sin bypass de ADMIN

**Do**

Cierra el **hallazgo #1**. En `lib/access.ts`, agregar `FinanceModuleKey`, `hasFinanceAccess()` y
`canWriteFinance()` exactamente como están escritas en §8. **`hasModuleAccess()` no se toca**: su
bypass de ADMIN sigue vigente para OPERACIONES, CRM e INVENTARIO.

`lib/access.test.ts` **ya existe** — se **amplía**, no se reemplaza. Los cuatro tests actuales de
`hasModuleAccess` quedan tal cual; se agregan los de Finanzas.

Archivos: `lib/access.ts` (editar), `lib/access.test.ts` (editar).

Los tests nuevos, como mínimo: ADMIN sin grant recibe `false` en ambas funciones · alguien con
`FINANZAS` recibe `true` en ambas · alguien con `FINANZAS_LECTURA` recibe `true` en
`hasFinanceAccess` y `false` en `canWriteFinance` · un CHOFER sin grant recibe `false` en ambas · un
ADMIN que **además** tiene `FINANZAS_LECTURA` recibe `false` en `canWriteFinance`.

**Done when**

- [ ] CUANDO se evalúa `hasFinanceAccess({ role: "ADMIN", moduleAccess: [] })` EL SISTEMA DEBERÁ devolver `false`.
- [ ] CUANDO se evalúa `canWriteFinance({ role: "ADMIN", moduleAccess: [] })` EL SISTEMA DEBERÁ devolver `false`.
- [ ] CUANDO se evalúa `canWriteFinance` sobre un usuario con `moduleAccess: ["FINANZAS_LECTURA"]` EL SISTEMA DEBERÁ devolver `false` mientras `hasFinanceAccess` devuelve `true`.
- [ ] CUANDO se evalúa `hasModuleAccess({ role: "ADMIN", moduleAccess: [] }, "CRM")` EL SISTEMA DEBERÁ seguir devolviendo `true`, porque el bypass de los otros tres módulos no se toca.
- [ ] CUANDO `npx vitest run lib/access.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/access.test.ts     # expect: exit 0, 0 failed, 0 skipped
grep -q "user.role === \"ADMIN\"" lib/access.ts   # expect: exit 0 — hasModuleAccess conserva su bypass
npm run typecheck                      # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 2: hasFinanceAccess y canWriteFinance sin bypass de ADMIN"
git tag step-02-porteros-acceso
```

---

#### Step 3 — Ramas de middleware para Finanzas, en el orden correcto

**Do**

Cierra la primera mitad del **hallazgo #3**. En `middleware.ts`, agregar las dos ramas de §8:

1. La de `/api/finanzas`, **antes** del `if (pathname.startsWith("/api/"))` existente, porque esa
   rama hace `return NextResponse.next()` y todo lo escrito después de ella nunca se evalúa. Devuelve
   `401` sin token y `403` JSON sin `hasFinanceAccess`. **Nunca un redirect.**
2. La de `/admin/finanzas`, **antes** de la rama genérica `pathname.startsWith("/admin")`, que hoy
   exige `OPERACIONES` y por lo tanto rebotaría a Marcela.

Importar `hasFinanceAccess` desde `@/lib/access` junto al `hasModuleAccess` que ya se importa. El
`matcher` de `config` **no cambia**: `/admin/:path*` y `/api/((?!auth|posiciones|webhooks).*)` ya
cubren las dos superficies nuevas.

Archivos: `middleware.ts` (editar).

**Done when**

- [ ] CUANDO se lee `middleware.ts` EL SISTEMA DEBERÁ contener una rama que evalúa `pathname.startsWith("/api/finanzas")`.
- [ ] CUANDO se comparan las posiciones de las ramas en `middleware.ts` EL SISTEMA DEBERÁ tener la rama de `/api/finanzas` en una línea anterior a la rama genérica de `/api/`.
- [ ] CUANDO se comparan las posiciones de las ramas en `middleware.ts` EL SISTEMA DEBERÁ tener la rama de `/admin/finanzas` en una línea anterior a la rama genérica de `/admin`.
- [ ] CUANDO se lee la rama de `/api/finanzas` EL SISTEMA DEBERÁ responder con `NextResponse.json` y status `403`, y no con `NextResponse.redirect`.
- [ ] CUANDO `npm run typecheck` y `npm run test` corren EL SISTEMA DEBERÁ salir 0 en ambos.

**Verify**

```bash
grep -q 'pathname.startsWith("/api/finanzas")' middleware.ts     # expect: exit 0
grep -q 'pathname.startsWith("/admin/finanzas")' middleware.ts   # expect: exit 0
test "$(grep -n '"/api/finanzas"' middleware.ts | head -1 | cut -d: -f1)" -lt "$(grep -n 'startsWith("/api/")' middleware.ts | head -1 | cut -d: -f1)"
                                                                  # expect: exit 0 — Finanzas antes del retorno genérico de /api/
test "$(grep -n '"/admin/finanzas"' middleware.ts | head -1 | cut -d: -f1)" -lt "$(grep -n 'startsWith("/admin")' middleware.ts | head -1 | cut -d: -f1)"
                                                                  # expect: exit 0 — Finanzas antes del fallback de /admin
grep -A4 'pathname.startsWith("/api/finanzas")' middleware.ts | grep -q "NextResponse.json"   # expect: exit 0
npm run typecheck                                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 3: ramas de middleware para /admin/finanzas y /api/finanzas"
git tag step-03-middleware-finanzas
```

---

#### Step 4 — Auditoría transaccional

**Do**

Cierra el **hallazgo #2**. Crear `lib/finanzas/audit.ts` con:

- `interface EntradaAuditoria` — `actorId`, `actorEmail`, `actorRole`, `action`, `entityType`,
  `entityId`, `before`, `after`, `ip`, `userAgent`, con los tipos de §4.
- `interface ClienteAuditoria` — la **forma mínima** que necesita, no el tipo de Prisma:
  `{ financeAuditLog: { create(args: { data: EntradaAuditoria }): Promise<unknown> } }`. Así el test
  pasa un doble y el módulo **no importa `@prisma/client` en tiempo de ejecución**, que es lo que
  permite correrlo en `environment: 'node'` sin base de datos.
- `withAudit(tx, entrada)` — escribe la fila. Lanza si `actorEmail`, `action` o `entityType` vienen
  vacíos, y **redacta**: si `before` o `after` traen `bankAccountEnc` o `password`, los reemplaza por
  `"[redactado]"` antes de escribir.
- `mutarConAuditoria(tx, mutacion, entrada)` — corre la mutación y luego `withAudit` dentro del
  mismo `tx`. Si `withAudit` lanza, la promesa se rechaza, que es lo que aborta el
  `prisma.$transaction` que la envuelve.

Crear `lib/finanzas/audit.test.ts` con doble de `tx` en memoria.

Archivos: `lib/finanzas/audit.ts`, `lib/finanzas/audit.test.ts`.

**Done when**

- [ ] CUANDO `withAudit` recibe una entrada válida EL SISTEMA DEBERÁ llamar exactamente una vez a `tx.financeAuditLog.create` con `actorEmail`, `actorRole`, `action` y `entityType` presentes.
- [ ] CUANDO `before` o `after` contienen las claves `bankAccountEnc` o `password` EL SISTEMA DEBERÁ escribir el literal `"[redactado]"` en su lugar y nunca el valor original.
- [ ] CUANDO `mutarConAuditoria` corre una mutación cuya escritura de auditoría lanza EL SISTEMA DEBERÁ rechazar la promesa, para que el `prisma.$transaction` que la envuelve aborte.
- [ ] CUANDO `withAudit` recibe una entrada con `actorEmail` vacío EL SISTEMA DEBERÁ lanzar y no llamar a `create`.
- [ ] CUANDO `npx vitest run lib/finanzas/audit.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/audit.test.ts   # expect: exit 0, 0 failed, 0 skipped
! grep -q "from \"@prisma/client\"" lib/finanzas/audit.ts
                                             # expect: exit 0 — sin import de runtime de Prisma
! grep -q "@/lib" lib/finanzas/audit.ts     # expect: exit 0 — sin alias @/ dentro de lib/finanzas
npm run typecheck                            # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 4: auditoria transaccional withAudit()"
git tag step-04-auditoria
```

---

#### Step 5 — Cifrado AES-256-GCM con rotación de clave

**Do**

Crear `lib/finanzas/crypto.ts` usando **sólo `node:crypto`**, sin dependencias:

- `cifrar(textoPlano: string): string` — genera IV de 12 bytes, cifra con `aes-256-gcm` usando
  `FINANZAS_ENCRYPTION_KEY` (32 bytes en base64) y devuelve **exactamente**
  `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>`. El prefijo de versión es lo que permite
  rotar el algoritmo más adelante sin adivinar el formato de lo ya guardado.
- `descifrar(valor: string): string` — prueba con `FINANZAS_ENCRYPTION_KEY`; si el descifrado falla y
  existe `FINANZAS_ENCRYPTION_KEY_PREVIOUS`, reintenta con ella. Si ninguna sirve, lanza
  `"No se pudo descifrar el valor"`. Rechaza cualquier valor que no empiece con `v1:`.
- `ultimos4(cuenta: string): string` — los últimos 4 caracteres, para `bankAccountLast4`.

**Las variables se leen dentro de las funciones, nunca al importar el módulo.** Importar
`crypto.ts` sin `FINANZAS_ENCRYPTION_KEY` debe funcionar; cifrar sin ella debe lanzar
`"Falta la variable de entorno FINANZAS_ENCRYPTION_KEY"`. Esto es lo que evita que el paso 5 rompa
los portones de los pasos 1 a 4 (§9 regla 6).

Documentar las dos variables nuevas en `VARIABLES_ENTORNO.md`, que ya existe, con el comando de
generación de §10 y la advertencia de §14.

Archivos: `lib/finanzas/crypto.ts`, `lib/finanzas/crypto.test.ts`, `VARIABLES_ENTORNO.md`.

El test fija sus propias variables con `process.env.FINANZAS_ENCRYPTION_KEY = ...` dentro de
`beforeEach`; no depende de `.env.local` ni de ningún cargador.

**Done when**

- [ ] CUANDO se cifra un texto y se descifra el resultado EL SISTEMA DEBERÁ devolver el texto original idéntico.
- [ ] CUANDO se cifra el mismo texto dos veces EL SISTEMA DEBERÁ producir dos cadenas distintas, porque el IV es aleatorio por llamada.
- [ ] CUANDO se inspecciona el valor cifrado EL SISTEMA DEBERÁ empezar con `v1:` y tener exactamente cuatro segmentos separados por `:`.
- [ ] CUANDO un valor cifrado con la clave anterior se descifra con `FINANZAS_ENCRYPTION_KEY` nueva y `FINANZAS_ENCRYPTION_KEY_PREVIOUS` vieja EL SISTEMA DEBERÁ devolver el texto original.
- [ ] CUANDO se altera un solo carácter del ciphertext EL SISTEMA DEBERÁ lanzar y nunca devolver texto parcial, porque GCM autentica.
- [ ] CUANDO se importa `lib/finanzas/crypto.ts` sin `FINANZAS_ENCRYPTION_KEY` definida EL SISTEMA DEBERÁ importar sin error y lanzar sólo al llamar a `cifrar`.

**Verify**

```bash
npx vitest run lib/finanzas/crypto.test.ts   # expect: exit 0, 0 failed, 0 skipped
grep -q "FINANZAS_ENCRYPTION_KEY" VARIABLES_ENTORNO.md            # expect: exit 0
grep -q "FINANZAS_ENCRYPTION_KEY_PREVIOUS" VARIABLES_ENTORNO.md   # expect: exit 0
! grep -q "@/lib" lib/finanzas/crypto.ts     # expect: exit 0 — sin alias @/ dentro de lib/finanzas
npm run typecheck                             # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 5: cifrado AES-256-GCM con rotacion de clave"
git tag step-05-cifrado
```

---

#### Step 6 — RUT chileno y esquemas zod

**Do**

Instalar la **única dependencia nueva** del proyecto y escribir la capa de validación.

```bash
npm install --save-exact zod@4.4.3
```

`--save-exact` a propósito: la tabla de §11 pina `4.4.3`, y un `^4.4.3` en `package.json` haría que
esa tabla mienta en la siguiente instalación limpia.

- `lib/finanzas/rut.ts` — `normalizarRut(entrada)` (quita puntos y espacios, mayúsculas la K, deja
  `12345678-9`), `digitoVerificador(cuerpo)` (módulo 11 con serie 2-3-4-5-6-7), `esRutValido(rut)`,
  `formatearRut(rut)` (con puntos, para mostrar) y `enmascararRut(rut)` que devuelve la forma
  `12.345.***-*`.
- `lib/finanzas/schemas.ts` — esquemas zod de entrada de cada ruta de §5: empleado, proveedor,
  categoría, transacción, anticipo, nómina, filtros de listado. Montos: `z.number().int().positive()`
  — **entero, positivo, sin decimales**. Fechas: `z.coerce.date()`. Enums: `z.enum([...])` con los
  valores de §4.

Archivos: `package.json`, `lib/finanzas/rut.ts`, `lib/finanzas/rut.test.ts`,
`lib/finanzas/schemas.ts`, `lib/finanzas/schemas.test.ts`.

**Done when**

- [ ] CUANDO `esRutValido` recibe un RUT con dígito verificador correcto EL SISTEMA DEBERÁ devolver `true`, y `false` si el dígito no corresponde.
- [ ] CUANDO `normalizarRut` recibe `"12.345.678-9"` o `"123456789"` EL SISTEMA DEBERÁ devolver `"12345678-9"` en ambos casos.
- [ ] CUANDO `enmascararRut` recibe `"12345678-9"` EL SISTEMA DEBERÁ devolver exactamente `"12.345.***-*"`.
- [ ] CUANDO un esquema de monto recibe `1500.5` o `-100` o `0` EL SISTEMA DEBERÁ rechazarlo, porque todo monto es entero positivo en pesos.
- [ ] CUANDO se lee `package.json` EL SISTEMA DEBERÁ tener `zod` en `dependencies` con el valor exacto `4.4.3`, sin rango.
- [ ] CUANDO `npx vitest run lib/finanzas/rut.test.ts` y `npx vitest run lib/finanzas/schemas.test.ts` corren EL SISTEMA DEBERÁ salir 0 en ambos.

**Verify**

```bash
node -e "process.exit(require('./package.json').dependencies.zod === '4.4.3' ? 0 : 1)"
                                                # expect: exit 0 — pin exacto, no un rango
npx vitest run lib/finanzas/rut.test.ts         # expect: exit 0, 0 failed, 0 skipped
npx vitest run lib/finanzas/schemas.test.ts     # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                                # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 6: validacion de RUT chileno y esquemas zod"
git tag step-06-validacion-zod-rut
```

---

#### Step 7 — Punto único de salida: serialización y enmascarado por rol

**Do**

Crear `lib/finanzas/serialize.ts`. **Ninguna ruta de Finanzas devuelve una entidad sin pasar por
aquí.**

- `serializeEmployee(employee, viewer)` — si `canWriteFinance(viewer)` es `false`: el RUT sale
  enmascarado con `enmascararRut()` y **no** salen `bankAccountEnc`, `bankName` ni
  `bankAccountType`; `bankAccountLast4` sí sale, porque cuatro dígitos no identifican una cuenta.
  Si es `true`: RUT completo, `bankAccountLast4`, `bankName` y `bankAccountType`. **En ningún caso
  sale `bankAccountEnc`** — el valor cifrado no tiene por qué viajar al navegador de nadie.
- `serializeSupplier(supplier, viewer)` — misma lógica.
- Los tipos de entrada se declaran como interfaces estructurales locales, con `import type` si hace
  falta tocar tipos de Prisma. Sin import de runtime.

Crear `lib/finanzas/serialize.test.ts` con **un caso por rol**: `FINANZAS`, `FINANZAS_LECTURA`,
`ADMIN` sin grant, y un usuario sin ningún módulo.

Archivos: `lib/finanzas/serialize.ts`, `lib/finanzas/serialize.test.ts`.

**Done when**

- [ ] CUANDO `serializeEmployee` recibe un viewer con `moduleAccess: ["FINANZAS_LECTURA"]` EL SISTEMA DEBERÁ devolver el RUT enmascarado como `"12.345.***-*"` y omitir `bankName` y `bankAccountType`.
- [ ] CUANDO `serializeEmployee` recibe un viewer con `moduleAccess: ["FINANZAS"]` EL SISTEMA DEBERÁ devolver el RUT completo y `bankAccountLast4`.
- [ ] CUANDO `serializeEmployee` corre con cualquier viewer EL SISTEMA DEBERÁ omitir siempre la propiedad `bankAccountEnc` del objeto devuelto.
- [ ] CUANDO `serializeSupplier` recibe un viewer con `moduleAccess: ["FINANZAS_LECTURA"]` EL SISTEMA DEBERÁ omitir `bankName` y devolver sólo `bankAccountLast4`.
- [ ] CUANDO `npx vitest run lib/finanzas/serialize.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/serialize.test.ts   # expect: exit 0, 0 failed, 0 skipped
! grep -q "@/lib" lib/finanzas/serialize.ts     # expect: exit 0 — sin alias @/ dentro de lib/finanzas
npm run typecheck                                # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 7: serializacion con enmascarado por rol"
git tag step-07-serializacion
```

---

#### Step 8 — Rate limiting sobre Postgres y bloqueo de login

**Do**

Crear `lib/finanzas/rate-limit.ts`:

```ts
export async function checkRateLimit(
  contador: ClienteContador,
  key: string,
  limit: number,
  windowMs: number,
  ahora?: Date
): Promise<{ ok: boolean; retryAfterSec: number }>
```

`ClienteContador` es la forma mínima sobre `RateLimitCounter` (`findUnique`, `upsert`, `update`), no
el tipo de Prisma — mismo motivo que en el paso 4. Ventana **fija**: si `ahora - windowStart >=
windowMs`, se reinicia `count = 1` y `windowStart = ahora`; si no, incrementa. Devuelve
`ok: false` cuando el contador supera `limit`, con `retryAfterSec` = segundos que faltan para que la
ventana expire. `ahora` es un parámetro opcional exactamente para poder testear el cruce de ventana
sin esperar 15 minutos.

Luego, en `lib/auth.ts`, dentro de `authorize()` y **antes** del `compare` de bcrypt: consultar
`checkRateLimit(prisma, "login:" + email, 5, 15 * 60 * 1000)`. Si `ok` es `false`, devolver `null`
sin consultar el hash. En un login fallido, incrementar; en uno exitoso, reiniciar el contador de
esa clave.

Archivos: `lib/finanzas/rate-limit.ts`, `lib/finanzas/rate-limit.test.ts`, `lib/auth.ts`.

**Done when**

- [ ] CUANDO se llama `checkRateLimit` con `limit: 5` cinco veces dentro de la ventana EL SISTEMA DEBERÁ devolver `ok: true` en las cinco.
- [ ] CUANDO se llama una sexta vez dentro de la misma ventana EL SISTEMA DEBERÁ devolver `ok: false` con `retryAfterSec` mayor que 0.
- [ ] CUANDO se llama después de que la ventana expiró EL SISTEMA DEBERÁ devolver `ok: true` y reiniciar el contador a 1.
- [ ] CUANDO `authorize()` recibe un intento con una clave de login ya bloqueada EL SISTEMA DEBERÁ devolver `null` sin invocar `compare` de bcrypt.
- [ ] CUANDO `npx vitest run lib/finanzas/rate-limit.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/rate-limit.test.ts   # expect: exit 0, 0 failed, 0 skipped
grep -q "checkRateLimit" lib/auth.ts             # expect: exit 0 — el bloqueo de login está en authorize()
npm run typecheck                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 8: rate limiting sobre Postgres y bloqueo de login"
git tag step-08-rate-limit
```

---

#### Step 9 — Recuperación por enlace y cierre del hallazgo #4

**Do**

Cierra el **hallazgo #4**, que es la puerta trasera que invalidaría todo el modelo de amenaza.

- `lib/finanzas/reset.ts` — puro y testeable: `generarToken()` (32 bytes aleatorios en hex),
  `hashToken(token)` (SHA-256 en hex), `esTokenUtilizable(fila, ahora)` que devuelve `false` si
  `usedAt` no es null o si `expiresAt <= ahora`, y `armarEnlace(baseUrl, token)`.
- `app/api/auth/recuperar/route.ts` — `POST` según §5: respuesta `200` idéntica exista o no la
  cuenta, rate limit 3/hora, envío con `sendMail()` de `lib/outreach/smtp.ts`, fila de auditoría.
- `app/api/auth/recuperar/confirmar/route.ts` — `POST` según §5: mismo mensaje de error en los tres
  casos de fallo, bcrypt costo 12, todo dentro de `prisma.$transaction`.
- `app/api/usuarios/route.ts` — editar, tres cambios de §5: `VALID_MODULES` suma `FINANZAS` y
  `FINANZAS_LECTURA`; las dos listas de roles válidos suman `FINANZAS`; y el `PATCH` responde `403`
  si trae `password` sobre una cuenta que tiene módulos de Finanzas, además de auditar y notificar
  por correo el cambio de `moduleAccess`.

Archivos: `lib/finanzas/reset.ts`, `lib/finanzas/reset.test.ts`,
`app/api/auth/recuperar/route.ts`, `app/api/auth/recuperar/confirmar/route.ts`,
`app/api/usuarios/route.ts`.

Documentar `FINANZAS_NOTIFY_EMAILS` en `VARIABLES_ENTORNO.md` fue parte del paso 5; aquí se consume.

**Done when**

- [ ] CUANDO `esTokenUtilizable` recibe una fila con `usedAt` no nulo EL SISTEMA DEBERÁ devolver `false` aunque `expiresAt` esté en el futuro.
- [ ] CUANDO `esTokenUtilizable` recibe una fila cuyo `expiresAt` ya pasó EL SISTEMA DEBERÁ devolver `false`.
- [ ] CUANDO `hashToken` recibe el mismo token dos veces EL SISTEMA DEBERÁ devolver el mismo hash, y uno distinto para un token distinto.
- [ ] CUANDO se lee `app/api/usuarios/route.ts` EL SISTEMA DEBERÁ tener `FINANZAS` y `FINANZAS_LECTURA` en `VALID_MODULES` y `FINANZAS` en las listas de roles válidos.
- [ ] CUANDO un `PATCH /api/usuarios` trae `password` sobre una cuenta con módulos de Finanzas EL SISTEMA DEBERÁ responder `403` y no escribir ningún hash nuevo.
- [ ] CUANDO `npx vitest run lib/finanzas/reset.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/reset.test.ts                          # expect: exit 0, 0 failed, 0 skipped
grep -q "FINANZAS_LECTURA" app/api/usuarios/route.ts               # expect: exit 0
grep -q '"FINANZAS"' app/api/usuarios/route.ts                     # expect: exit 0
grep -q "Usa el enlace de recuperación" app/api/usuarios/route.ts  # expect: exit 0 — el 403 del hallazgo #4
test -f app/api/auth/recuperar/route.ts                            # expect: exit 0
test -f app/api/auth/recuperar/confirmar/route.ts                  # expect: exit 0
npm run typecheck                                                   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 9: recuperacion por enlace y bloqueo del reset por ADMIN"
git tag step-09-recuperacion-clave
```

---

#### Step 10 — El guardia: ninguna ruta de Finanzas sin portero

**Do**

Cierra la segunda mitad del **hallazgo #3**, y es uno de los dos o tres entregables más importantes
de este blueprint: convierte "acordarse de poner el portero" en un error de build.

- `lib/finanzas/routes.ts` — exporta `rutasSinPortero(dir: string): string[]`. Recorre `dir`
  recursivamente con `node:fs`, junta todos los archivos llamados `route.ts`, lee cada uno y
  devuelve la ruta de los que **no** contienen ni `hasFinanceAccess` ni `canWriteFinance`. Si `dir`
  no existe, devuelve `[]`.
- `lib/finanzas/routes.test.ts` — dos bloques:
  1. **El test del guardia mismo**, con un directorio temporal creado con `node:fs` y
     `node:os.tmpdir()`: dos archivos `route.ts` falsos, uno con el portero y otro sin él. Se
     asegura de que `rutasSinPortero` nombre **sólo** el malo. Esto es lo que prueba que el guardia
     detecta de verdad, sin esperar a que exista una ruta rota en el repo.
  2. **El test del repo:** `expect(rutasSinPortero("app/api/finanzas")).toEqual([])`. Hoy el
     directorio no existe y el arreglo es vacío; desde el paso 11 en adelante, cada ruta nueva sin
     portero rompe este test **nombrando el archivo**.

Vitest corre con `cwd` en la raíz del proyecto, así que la ruta relativa `app/api/finanzas` resuelve
sin configuración adicional.

Archivos: `lib/finanzas/routes.ts`, `lib/finanzas/routes.test.ts`.

**Done when**

- [ ] CUANDO `rutasSinPortero` recorre un directorio temporal con un `route.ts` que contiene `hasFinanceAccess` y otro que no contiene ningún portero EL SISTEMA DEBERÁ devolver un arreglo con exactamente la ruta del segundo archivo.
- [ ] CUANDO `rutasSinPortero` recibe una ruta de directorio que no existe EL SISTEMA DEBERÁ devolver un arreglo vacío y no lanzar.
- [ ] CUANDO `rutasSinPortero` recorre un `route.ts` que contiene sólo `canWriteFinance` EL SISTEMA DEBERÁ considerarlo protegido y no incluirlo en el resultado.
- [ ] CUANDO se ejecuta `rutasSinPortero("app/api/finanzas")` sobre el repo EL SISTEMA DEBERÁ devolver un arreglo vacío.
- [ ] CUANDO `npm run test` corre la suite completa EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos, incluidos los tests preexistentes de `lib/tracking.test.ts` y `lib/outreach/smtp.test.ts`.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0, 0 failed, 0 skipped
npm run test                                  # expect: exit 0, 0 failed, 0 skipped — toda la suite del repo
npm run typecheck                             # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 10: guardia mecanico de porteros en rutas de Finanzas"
git tag step-10-guardia-rutas
```

---

#### Step 11 — CRUD de trabajadores

**Do**

La primera pantalla del módulo, y recién ahora, con todos sus porteros probados.

- `app/api/finanzas/empleados/route.ts` — `GET` lista paginada (filtro `status`, por defecto
  `ACTIVO`), `POST` crea. El `POST` cifra la cuenta bancaria con `cifrar()` del paso 5, guarda
  `bankAccountLast4` con `ultimos4()`, valida con el esquema zod del paso 6, normaliza el RUT, y
  escribe auditoría `CREAR` dentro de `prisma.$transaction`.
- `app/api/finanzas/empleados/[id]/route.ts` — `GET` ficha, `PATCH` edita con auditoría
  `EDITAR` que lleva `before` y `after`.
- `app/(admin)/admin/finanzas/layout.tsx` — shell del módulo: navegación entre las nueve pantallas,
  con los links de escritura sólo si `canWriteFinance`.
- `app/(admin)/admin/finanzas/trabajadores/page.tsx` — tabla de trabajadores.
- `app/(admin)/admin/finanzas/trabajadores/[id]/page.tsx` — ficha y edición.

**Ambos handlers llaman `hasFinanceAccess()` en lectura y `canWriteFinance()` en mutación**, y toda
respuesta pasa por `serializeEmployee()`. El guardia del paso 10 lo verifica mecánicamente.

Los archivos bajo `app/` **sí** usan el alias `@/` (`@/lib/access`, `@/lib/db`, `@/lib/utils`),
porque los resuelve Next; `lib/finanzas/` sigue con rutas relativas. Ver la matriz de §19.6.

**Done when**

- [ ] CUANDO `GET /api/finanzas/empleados` recibe una sesión sin `FINANZAS` ni `FINANZAS_LECTURA` EL SISTEMA DEBERÁ responder `403` con el cuerpo `{ "error": "Acceso denegado" }`.
- [ ] CUANDO `POST /api/finanzas/empleados` recibe un RUT con dígito verificador incorrecto EL SISTEMA DEBERÁ responder `400` y no escribir ninguna fila.
- [ ] CUANDO `POST /api/finanzas/empleados` crea un trabajador con cuenta bancaria EL SISTEMA DEBERÁ guardar `bankAccountEnc` con el prefijo `v1:` y `bankAccountLast4` con los últimos 4 dígitos en claro.
- [ ] CUANDO `PATCH /api/finanzas/empleados/[id]` lo llama una sesión con sólo `FINANZAS_LECTURA` EL SISTEMA DEBERÁ responder `403` y no modificar la fila.
- [ ] CUANDO `rutasSinPortero("app/api/finanzas")` corre EL SISTEMA DEBERÁ devolver un arreglo vacío, es decir las dos rutas nuevas llaman a un portero.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0 — las rutas nuevas tienen portero
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                             # expect: exit 0
npm run build                                 # expect: exit 0
grep -q "serializeEmployee" app/api/finanzas/empleados/route.ts          # expect: exit 0
grep -q "serializeEmployee" app/api/finanzas/empleados/\[id\]/route.ts   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 11: CRUD de trabajadores (API y pantallas)"
git tag step-11-trabajadores
```

---

#### Step 12 — Proveedores y categorías

**Do**

- `app/api/finanzas/proveedores/route.ts` — `GET` lista paginada de activos, `POST` crea con cifrado
  de cuenta y auditoría.
- `app/api/finanzas/proveedores/[id]/route.ts` — `GET` ficha, `PATCH` edita (incluye baja lógica con
  `isActive: false`; **nunca** borrado duro) con auditoría.
- `app/api/finanzas/categorias/route.ts` — `GET` lista activas, `POST` crea. El `POST` maneja la
  violación de `@@unique([name, kind])` devolviendo `409`, no `500`.
- `app/(admin)/admin/finanzas/proveedores/page.tsx` — lista y alta.

Las categorías no tienen pantalla propia: se administran desde un diálogo dentro de la pantalla de
movimientos (paso 13). Una pantalla completa para una tabla de tres columnas sería ruido.

**Done when**

- [ ] CUANDO `POST /api/finanzas/categorias` recibe un nombre y un `kind` que ya existen EL SISTEMA DEBERÁ responder `409` y no crear una segunda fila.
- [ ] CUANDO `PATCH /api/finanzas/proveedores/[id]` fija `isActive: false` EL SISTEMA DEBERÁ conservar la fila y todas sus transacciones asociadas.
- [ ] CUANDO cualquiera de las tres rutas nuevas recibe una sesión con sólo `FINANZAS_LECTURA` y un método de mutación EL SISTEMA DEBERÁ responder `403`.
- [ ] CUANDO `POST /api/finanzas/proveedores` crea un proveedor con cuenta bancaria EL SISTEMA DEBERÁ guardar `bankAccountEnc` con el prefijo `v1:` y escribir una fila de auditoría `CREAR`.
- [ ] CUANDO `rutasSinPortero("app/api/finanzas")` corre EL SISTEMA DEBERÁ devolver un arreglo vacío.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                             # expect: exit 0
npm run build                                 # expect: exit 0
grep -q "serializeSupplier" app/api/finanzas/proveedores/route.ts   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 12: proveedores y categorias"
git tag step-12-proveedores-categorias
```

---

#### Step 13 — Movimientos con paginación en servidor

**Do**

- `lib/finanzas/paginacion.ts` — `resolverPaginacion(params)` devuelve `{ page, pageSize, take,
  skip }` a partir de `page` y `pageSize` de la query. `pageSize` por defecto 25, **tope duro 100**,
  mínimo 1; `page` mínimo 1. Cualquier valor no numérico cae al defecto en vez de romper.
  `construirMeta(total, page, pageSize)` devuelve `{ total, page, pageSize, totalPages }`.
- `app/api/finanzas/transacciones/route.ts` — `GET` con filtros `kind`, `desde`, `hasta`,
  `categoryId`, `supplierId`, **paginado con `take`/`skip` en la consulta de Prisma**, y `POST` que
  crea con auditoría.
- `app/api/finanzas/transacciones/[id]/route.ts` — `PATCH` que edita o anula
  (`status: "ANULADO"`), con auditoría `EDITAR` o `ANULAR`. **No existe `DELETE`.**
- `app/(admin)/admin/finanzas/movimientos/page.tsx` — tabla filtrable, paginador por links,
  diálogo de alta si `canWriteFinance`, diálogo de administración de categorías.

**Done when**

- [ ] CUANDO `resolverPaginacion` recibe `pageSize: "500"` EL SISTEMA DEBERÁ devolver `take: 100`, aplicando el tope duro.
- [ ] CUANDO `resolverPaginacion` recibe `page: "0"` o `page: "abc"` EL SISTEMA DEBERÁ devolver `page: 1` y `skip: 0`.
- [ ] CUANDO `resolverPaginacion` recibe `page: 3` y `pageSize: 25` EL SISTEMA DEBERÁ devolver `skip: 50` y `take: 25`.
- [ ] CUANDO `GET /api/finanzas/transacciones` responde EL SISTEMA DEBERÁ incluir `take` y `skip` en la consulta de Prisma y nunca devolver la tabla completa.
- [ ] CUANDO `PATCH /api/finanzas/transacciones/[id]` anula un movimiento EL SISTEMA DEBERÁ fijar `status: "ANULADO"` y conservar la fila, sin exponer ningún método `DELETE`.
- [ ] CUANDO `npx vitest run lib/finanzas/paginacion.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/paginacion.test.ts   # expect: exit 0, 0 failed, 0 skipped
npx vitest run lib/finanzas/routes.test.ts       # expect: exit 0
npm run test                                      # expect: exit 0, 0 failed, 0 skipped
! grep -q "export async function DELETE" app/api/finanzas/transacciones/\[id\]/route.ts
                                                  # expect: exit 0 — no existe borrado duro
grep -q "skip" app/api/finanzas/transacciones/route.ts   # expect: exit 0 — paginacion en la base
npm run typecheck                                 # expect: exit 0
npm run build                                     # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 13: movimientos con paginacion en servidor"
git tag step-13-transacciones
```

---

#### Step 14 — Anticipos

**Do**

- `app/api/finanzas/anticipos/route.ts` — `GET` paginado con filtros `employeeId` y `status`;
  `POST` crea un anticipo en estado `PENDIENTE` con auditoría.
- `app/api/finanzas/anticipos/[id]/route.ts` — `PATCH` que mueve el estado a `PAGADO` (fijando
  `paidAt` con timestamp del **servidor**) o a `ANULADO`, con auditoría. **`DESCONTADO` no se fija
  desde aquí**: lo fija la generación de nómina del paso 15, y sólo ella.
- `app/(admin)/admin/finanzas/anticipos/page.tsx` — lista con filtro por estado y alta.

Regla de negocio: un anticipo `ANULADO` o `DESCONTADO` no vuelve a `PENDIENTE`. El `PATCH` rechaza
esas transiciones con `409`.

**Done when**

- [ ] CUANDO `PATCH /api/finanzas/anticipos/[id]` marca un anticipo como `PAGADO` EL SISTEMA DEBERÁ fijar `paidAt` con la hora del servidor y nunca con una fecha enviada por el cliente.
- [ ] CUANDO `PATCH /api/finanzas/anticipos/[id]` intenta llevar un anticipo `DESCONTADO` de vuelta a `PENDIENTE` EL SISTEMA DEBERÁ responder `409` y no modificar la fila.
- [ ] CUANDO `POST /api/finanzas/anticipos` recibe un monto que no es entero positivo EL SISTEMA DEBERÁ responder `400` y no escribir ninguna fila.
- [ ] CUANDO una sesión con sólo `FINANZAS_LECTURA` llama a `POST` o `PATCH` de anticipos EL SISTEMA DEBERÁ responder `403`.
- [ ] CUANDO `rutasSinPortero("app/api/finanzas")` corre EL SISTEMA DEBERÁ devolver un arreglo vacío.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                             # expect: exit 0
npm run build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 14: anticipos a trabajadores"
git tag step-14-anticipos
```

---

#### Step 15 — Nóminas y cálculo de líquido

**Do**

- `lib/finanzas/payroll.ts` — el corazón aritmético, puro y testeable:

  ```ts
  export interface EntradaLiquido {
    grossAmount: number;
    afpAmount: number;
    healthAmount: number;
    otherDeductions: number;
    advancesApplied: number;
  }
  export function calcularLiquido(e: EntradaLiquido): number;
  export function totalizarNomina(items: EntradaLiquido[]): { totalGross: number; totalNet: number };
  ```

  `calcularLiquido` resta las cuatro deducciones al bruto y **nunca devuelve un número negativo**:
  si las deducciones superan al bruto, devuelve 0 y el llamador decide qué hacer. Todo entero; el
  módulo no usa punto flotante en ninguna línea.

- `app/api/finanzas/nominas/route.ts` — `GET` lista por período; `POST` genera el run del período
  según §5, dentro de un `prisma.$transaction`.
- `app/api/finanzas/nominas/[id]/route.ts` — `GET` cabecera y líneas serializadas; `PATCH` aprueba
  (`APROBADA`, `approvedAt` y `approvedById` del servidor) o marca pagada (`PAGADA`, `paidAt` del
  servidor), con auditoría `APROBAR` o `PAGAR`.
- `app/(admin)/admin/finanzas/nominas/page.tsx` — lista de nóminas por período con su estado.

**Done when**

- [ ] CUANDO `calcularLiquido` recibe bruto 800000 con AFP 80000, salud 56000, otras deducciones 0 y anticipos 100000 EL SISTEMA DEBERÁ devolver 564000.
- [ ] CUANDO `calcularLiquido` recibe deducciones que superan al bruto EL SISTEMA DEBERÁ devolver 0 y nunca un número negativo.
- [ ] CUANDO `totalizarNomina` recibe un arreglo vacío EL SISTEMA DEBERÁ devolver `totalGross: 0` y `totalNet: 0`.
- [ ] CUANDO `POST /api/finanzas/nominas` recibe un período que ya tiene un `PayrollRun` EL SISTEMA DEBERÁ responder `409` y no crear una segunda cabecera.
- [ ] CUANDO `POST /api/finanzas/nominas` genera la nómina EL SISTEMA DEBERÁ pasar a `DESCONTADO` cada anticipo en estado `PAGADO` del trabajador y enlazarlo al `payrollItemId` correspondiente.
- [ ] CUANDO `npx vitest run lib/finanzas/payroll.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/payroll.test.ts   # expect: exit 0, 0 failed, 0 skipped
npx vitest run lib/finanzas/routes.test.ts    # expect: exit 0
npm run test                                   # expect: exit 0, 0 failed, 0 skipped
! grep -qE "parseFloat|toFixed|Number\(.*\)\s*/\s*100" lib/finanzas/payroll.ts
                                               # expect: exit 0 — aritmetica entera, sin punto flotante
npm run typecheck                              # expect: exit 0
npm run build                                  # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 15: nominas mensuales y calculo de liquido"
git tag step-15-nominas
```

---

#### Step 16 — Nómina de pago con descifrado auditado

**Do**

La ruta más sensible del módulo, especificada completa en §5.

- `app/api/finanzas/nominas/[id]/pago/route.ts` — `GET`. **Sólo `canWriteFinance`**; una sesión con
  `FINANZAS_LECTURA` recibe `403` aunque pueda ver la nómina completa en la otra ruta. Exige
  `status` `APROBADA` o `PAGADA`, si no `409`. Descifra cada `bankAccountEnc` con `descifrar()` del
  paso 5 y escribe **una** fila de auditoría `DESCIFRAR` con el **conteo** de cuentas en `after` —
  jamás las cuentas — dentro del mismo `prisma.$transaction` que la lectura.
- `app/(admin)/admin/finanzas/nominas/[id]/page.tsx` — detalle de la nómina, líneas, botón de
  aprobar y marcar pagada si `canWriteFinance`, y el panel de pago que pide esta ruta bajo demanda.

Si `FINANZAS_ENCRYPTION_KEY` no está configurada, la respuesta es `500` con el mensaje nombrado
`"Falta la variable de entorno FINANZAS_ENCRYPTION_KEY"`, no un error genérico: un fallo de
configuración y un fallo de datos se diagnostican distinto.

**Done when**

- [ ] CUANDO `GET /api/finanzas/nominas/[id]/pago` lo llama una sesión con sólo `FINANZAS_LECTURA` EL SISTEMA DEBERÁ responder `403` y no descifrar ninguna cuenta.
- [ ] CUANDO la nómina está en estado `BORRADOR` EL SISTEMA DEBERÁ responder `409` con el mensaje `"La nómina debe estar aprobada antes de generar el pago"`.
- [ ] CUANDO la ruta devuelve las cuentas descifradas EL SISTEMA DEBERÁ haber escrito exactamente una fila de `FinanceAuditLog` con `action: "DESCIFRAR"` y el conteo de cuentas en `after`.
- [ ] CUANDO se inspecciona la fila de auditoría escrita EL SISTEMA DEBERÁ no contener ningún número de cuenta, ni cifrado ni en claro.
- [ ] CUANDO `rutasSinPortero("app/api/finanzas")` corre EL SISTEMA DEBERÁ devolver un arreglo vacío.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0
grep -q "canWriteFinance" app/api/finanzas/nominas/\[id\]/pago/route.ts   # expect: exit 0
! grep -q "hasFinanceAccess" app/api/finanzas/nominas/\[id\]/pago/route.ts
                                              # expect: exit 0 — esta ruta exige escritura, no lectura
grep -q "DESCIFRAR" app/api/finanzas/nominas/\[id\]/pago/route.ts          # expect: exit 0
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                             # expect: exit 0
npm run build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 16: nomina de pago con descifrado auditado"
git tag step-16-pago-nomina
```

---

#### Step 17 — Reportes y resumen del mes

**Do**

- `lib/finanzas/reportes.ts` — agregación pura sobre filas ya leídas:
  `resumirPeriodo(transacciones)` devuelve `{ ingresos, egresos, saldo }` con `saldo = ingresos -
  egresos`, ignorando las filas en estado `ANULADO`; `agruparPorCategoria(transacciones)` devuelve
  un arreglo ordenado de mayor a menor por monto. Todo entero.
- `app/api/finanzas/reportes/route.ts` — `GET` con `desde` y `hasta`, devuelve los agregados.
- `app/(admin)/admin/finanzas/page.tsx` — el resumen: tres tarjetas de KPI (ingresos, egresos,
  saldo) y un gráfico de barras por categoría con Recharts, que ya está en el repo.

**Los montos se muestran con `formatCurrency()` de `lib/utils.ts`, que ya usa `es-CL` y `CLP` con
`maximumFractionDigits: 0`.** Ningún test compara la salida literal de `formatCurrency()`: es
`Intl.NumberFormat`, y su salida exacta (el espacio después del `$`, el separador de miles) depende
de la versión de ICU del runtime. Un test que afirme `"$ 1.234"` pasa en una máquina y falla en la
siguiente. Los tests de `reportes.ts` comparan **números**, no cadenas formateadas.

**Done when**

- [ ] CUANDO `resumirPeriodo` recibe transacciones que incluyen una en estado `ANULADO` EL SISTEMA DEBERÁ excluirla de los tres totales.
- [ ] CUANDO `resumirPeriodo` recibe sólo egresos EL SISTEMA DEBERÁ devolver `ingresos: 0` y un `saldo` negativo igual al total de egresos con signo invertido.
- [ ] CUANDO `agruparPorCategoria` recibe transacciones sin `categoryId` EL SISTEMA DEBERÁ agruparlas bajo la etiqueta `"Sin categoría"` en vez de descartarlas.
- [ ] CUANDO `agruparPorCategoria` devuelve el arreglo EL SISTEMA DEBERÁ entregarlo ordenado de mayor a menor por monto.
- [ ] CUANDO `npx vitest run lib/finanzas/reportes.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/reportes.test.ts   # expect: exit 0, 0 failed, 0 skipped
npx vitest run lib/finanzas/routes.test.ts     # expect: exit 0
! grep -q "formatCurrency" lib/finanzas/reportes.test.ts
                                                # expect: exit 0 — ningun test compara salida de Intl
npm run test                                    # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                               # expect: exit 0
npm run build                                   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 17: reportes y resumen del mes"
git tag step-17-reportes
```

---

#### Step 18 — Visor de auditoría

**Do**

- `app/api/finanzas/auditoria/route.ts` — `GET` paginado con `resolverPaginacion()` del paso 13,
  filtros por `entityType`, `actorId` y rango de fechas, orden por `createdAt` descendente.
  **Sólo `GET`.** No hay `POST`, `PATCH` ni `DELETE`: el log es append-only por contrato (§5).
- `app/(admin)/admin/finanzas/auditoria/page.tsx` — tabla del log con los filtros, visible para
  `FINANZAS` y para `FINANZAS_LECTURA`. Cada fila muestra fecha, actor (correo y rol tal como
  estaban en el momento del hecho), acción, entidad y un desplegable con `before`/`after`.

Que Elizabeth pueda leer este visor es la mitad del modelo de amenaza (A): la defensa no es impedir,
es que quede a la vista.

**Done when**

- [ ] CUANDO se inspecciona `app/api/finanzas/auditoria/route.ts` EL SISTEMA DEBERÁ exportar únicamente `GET`, sin `POST`, `PATCH`, `PUT` ni `DELETE`.
- [ ] CUANDO `GET /api/finanzas/auditoria` lo llama una sesión con `FINANZAS_LECTURA` EL SISTEMA DEBERÁ responder `200` con las filas paginadas.
- [ ] CUANDO `GET /api/finanzas/auditoria` lo llama una sesión sin ningún módulo de Finanzas EL SISTEMA DEBERÁ responder `403`.
- [ ] CUANDO `GET /api/finanzas/auditoria` se llama sin parámetros EL SISTEMA DEBERÁ devolver como máximo 25 filas, aplicando el `pageSize` por defecto.
- [ ] CUANDO `rutasSinPortero("app/api/finanzas")` corre EL SISTEMA DEBERÁ devolver un arreglo vacío.
- [ ] CUANDO `npm run build` corre EL SISTEMA DEBERÁ salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0
! grep -qE "export async function (POST|PATCH|PUT|DELETE)" app/api/finanzas/auditoria/route.ts
                                              # expect: exit 0 — el log es append-only
grep -q "resolverPaginacion" app/api/finanzas/auditoria/route.ts   # expect: exit 0
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                             # expect: exit 0
npm run build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 18: visor de auditoria"
git tag step-18-visor-auditoria
```

---

#### Step 19 — Exportación CSV limitada y auditada

**Do**

- `lib/finanzas/csv.ts` — `escaparCampoCsv(valor)` que envuelve en comillas dobles y duplica las
  comillas internas cuando el valor contiene `,`, `"`, `\n` o `\r`; `filasACsv(encabezados, filas)`
  que arma el documento con separador `,` y salto `\r\n`. **Prefija con comilla simple cualquier
  campo que empiece con `=`, `+`, `-` o `@`**, que es la mitigación estándar de inyección de fórmulas
  en Excel — este CSV lo va a abrir Marcela en Excel, no un parser.
- `app/api/finanzas/export/route.ts` — `GET` con rango de fechas. **Rate limit 5 por hora por
  usuario** con `checkRateLimit(prisma, "export:" + userId, 5, 60 * 60 * 1000)`: es el límite que
  evita que alguien se lleve la base entera. Escribe auditoría `EXPORTAR` con el rango y el conteo de
  filas antes de devolver. Responde con `Content-Type: text/csv; charset=utf-8` y
  `Content-Disposition: attachment`.

Sólo `FINANZAS` puede exportar. `FINANZAS_LECTURA` recibe `403`: exportar es sacar el dato del
sistema, y ese es exactamente el movimiento que el escenario (A) quiere que quede acotado.

**Done when**

- [ ] CUANDO `escaparCampoCsv` recibe un valor que contiene una coma EL SISTEMA DEBERÁ devolverlo envuelto en comillas dobles.
- [ ] CUANDO `escaparCampoCsv` recibe un valor que contiene una comilla doble EL SISTEMA DEBERÁ duplicarla dentro del campo entrecomillado.
- [ ] CUANDO `escaparCampoCsv` recibe un valor que empieza con `=` EL SISTEMA DEBERÁ anteponerle una comilla simple para neutralizar la inyección de fórmulas.
- [ ] CUANDO `GET /api/finanzas/export` se llama por sexta vez dentro de una hora por el mismo usuario EL SISTEMA DEBERÁ responder `429` con la cabecera `Retry-After`.
- [ ] CUANDO `GET /api/finanzas/export` devuelve un CSV EL SISTEMA DEBERÁ haber escrito una fila de auditoría `EXPORTAR` con el rango y el conteo de filas.
- [ ] CUANDO `npx vitest run lib/finanzas/csv.test.ts` corre EL SISTEMA DEBERÁ salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/csv.test.ts       # expect: exit 0, 0 failed, 0 skipped
npx vitest run lib/finanzas/routes.test.ts    # expect: exit 0
grep -q "checkRateLimit" app/api/finanzas/export/route.ts   # expect: exit 0
grep -q "EXPORTAR" app/api/finanzas/export/route.ts         # expect: exit 0
npm run test                                   # expect: exit 0, 0 failed, 0 skipped
npm run typecheck                              # expect: exit 0
npm run build                                  # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 19: exportacion CSV limitada y auditada"
git tag step-19-export-csv
```

---

#### Step 20 — Cierre: sidebar, desvinculación, specs y barrido final

**Do**

Cierra el **hallazgo #5** y deja el módulo entregable.

1. `components/ui/AdminSidebar.tsx` — agregar el módulo Finanzas con su `tag`, y cambiar
   `visibleModules` para que **Finanzas se filtre siempre por `moduleAccess`, aunque el usuario sea
   ADMIN**, mientras los otros tres módulos conservan exactamente el comportamiento actual. La forma
   concreta: partir la lista en dos, los módulos con bypass y los módulos sin bypass, y concatenar.
   Un ADMIN sin grant no debe ver ni el link, aunque el middleware igual lo rebotaría.
2. `app/api/finanzas/empleados/[id]/desvincular/route.ts` — `POST`. Dentro de un
   `prisma.$transaction`: `status: "DESVINCULADO"`, `terminatedAt` con hora del **servidor**, y
   **purga** de `bankAccountEnc`, `bankAccountLast4`, `bankName`, `bankAccountType`, `email` y
   `phone` poniéndolos en `null`, más `purgedAt` con la hora del servidor. Escribe auditoría
   `DESVINCULAR`. **El historial de `PayrollItem`, `FinanceTransaction` y `Advance` se conserva
   íntegro** — obligación tributaria de 6 años (§14). Nunca hay borrado duro de `Employee`.
3. Los `*.spec.md` de cada ruta y pantalla nueva, al lado del archivo que describen, como manda la
   convención 2 del repo. Cada uno dice qué debe hacer la ruta, quién puede llamarla y qué audita.
4. `CLAUDE.md` del repo — agregar la sección de Finanzas, que viene en `workspace/CLAUDE.md`. **Se
   fusiona, no se sobrescribe**; el Bootstrap de §10 ya la anexó si no estaba, aquí sólo se revisa
   que quedó y se ajusta si algo cambió durante el build.
5. Barrido final.

Archivos: `components/ui/AdminSidebar.tsx`, `app/api/finanzas/empleados/[id]/desvincular/route.ts`,
`app/api/finanzas/**/*.spec.md`, `app/(admin)/admin/finanzas/**/*.spec.md`, `CLAUDE.md`.

**Done when**

- [ ] CUANDO se lee `components/ui/AdminSidebar.tsx` EL SISTEMA DEBERÁ filtrar el módulo Finanzas por `moduleAccess` incluso cuando `isAdmin` es `true`, y conservar el bypass para los otros tres módulos.
- [ ] CUANDO `POST /api/finanzas/empleados/[id]/desvincular` corre EL SISTEMA DEBERÁ dejar `bankAccountEnc`, `bankAccountLast4`, `bankName`, `bankAccountType`, `email` y `phone` en `null`, y `purgedAt` con la hora del servidor.
- [ ] CUANDO se desvincula a un trabajador EL SISTEMA DEBERÁ conservar todas sus filas de `PayrollItem` y `Advance` sin modificarlas.
- [ ] CUANDO se listan los archivos de ruta y de página creados por este cambio EL SISTEMA DEBERÁ tener un `*.spec.md` al lado de cada uno.
- [ ] CUANDO se lee el `CLAUDE.md` del repo EL SISTEMA DEBERÁ contener el marcador `<!-- FINANZAS:INICIO -->` una sola vez.
- [ ] CUANDO `npm run typecheck && npm run test && npm run build` corre EL SISTEMA DEBERÁ salir 0 en los cuatro comandos.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0 — incluida la ruta de desvincular
test "$(grep -c '<!-- FINANZAS:INICIO -->' CLAUDE.md)" -eq 1        # expect: exit 0 — fusionado una sola vez
grep -q "FINANZAS" components/ui/AdminSidebar.tsx           # expect: exit 0
test -f app/api/finanzas/empleados/\[id\]/desvincular/route.ts        # expect: exit 0
test -f app/api/finanzas/empleados/\[id\]/desvincular/route.spec.md   # expect: exit 0
for f in $(find app/api/finanzas app/\(admin\)/admin/finanzas -name "route.ts" -o -name "page.tsx"); do test -f "${f%.*}.spec.md" || { echo "FALTA spec de $f"; exit 1; }; done
                                              # expect: exit 0 — cada ruta y pagina nueva tiene su spec
npm run typecheck                             # expect: exit 0
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
npm run build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 20: sidebar, desvinculacion con purga, specs y barrido final"
git tag step-20-cierre-finanzas
git ls-files --error-unmatch CLAUDE.md                      # expect: exit 0
git ls-files --error-unmatch .claude/settings.json          # expect: exit 0
git ls-files --error-unmatch .claude/rules/finanzas.md      # expect: exit 0
test -z "$(git status --porcelain)"                         # expect: exit 0 — el commit de arriba tomó todo
```

---

### 9.1 Parity and cutover

Este cambio **agrega** un módulo; no reemplaza un sistema en ejecución dentro de la aplicación. Pero
sí reemplaza un proceso humano — las planillas Excel de Marcela — y esa transición tiene una forma
que conviene escribir, porque el modo de fallar es exactamente el de una migración: el sistema nuevo
funciona, la planilla vieja hacía algo que nadie anotó, y la diferencia la descubre la dueña.

#### Parity set

Ninguna de estas filas es un portón de build: se prueban después del paso 20, en el período de
marcha blanca, contra datos reales. Están aquí porque son la definición de "quedó bien", y omitirlas
sería fingir que un cambio de sistema de registro contable no tiene riesgo de paridad.

| # | Comportamiento que debe reproducirse | Cómo se prueba | Tolerancia |
|---|---|---|---|
| 1 | El total de ingresos y egresos de un mes cerrado | Cargar un mes ya cerrado en la planilla y comparar contra `GET /api/finanzas/reportes` de ese rango | Diferencia exacta de 0 pesos |
| 2 | El líquido de cada trabajador de ese mes | Generar la nómina del período y comparar línea por línea contra la liquidación real emitida | Diferencia exacta de 0 pesos por línea |
| 3 | Los anticipos descontados en ese mes | Contrastar `Advance` en estado `DESCONTADO` del período contra la planilla | Mismo conteo y mismo monto total |
| 4 | Las cuentas bancarias de destino | Comparar los últimos 4 dígitos de `GET /nominas/[id]/pago` contra la nómina bancaria real | Coincidencia en el 100% de las líneas |

**Marcha blanca:** un mes calendario completo con **doble registro** — la planilla se sigue llevando
y el sistema también. La paridad se declara cuando las cuatro filas de arriba cierran para ese mes
con cero diferencias. Una sola diferencia de un peso bloquea el retiro de la planilla y se
investiga, porque en contabilidad un peso de diferencia nunca es un peso de diferencia.

#### Cutover

| Fase | Qué cambia | A quién afecta | Reversible por | Verificación |
|---|---|---|---|---|
| Doble registro | El sistema recibe los mismos datos que la planilla | Sólo Marcela, que carga dos veces | Dejar de cargar en el sistema | Las cuatro filas de paridad de un mes |
| Sistema primario | La planilla pasa a ser copia de respaldo, ya no se edita | Marcela y Elizabeth | Volver a la planilla, que sigue existiendo y actualizada al último mes | El resumen del mes cuadra con el banco |
| Retiro de la planilla | La planilla se archiva de sólo lectura y no se actualiza más | Ambas | Ya no es instantáneo: recuperar el archivo y re-cargar a mano lo posterior | Tres meses consecutivos de nóminas en estado `PAGADA` |

**El interruptor de emergencia:** la planilla original, intacta, en su ubicación actual. Volver a
ella no requiere ningún despliegue ni ninguna acción técnica — es abrir el archivo. Por eso el retiro
de la planilla es la última fase y no ocurre antes de tres meses cerrados en el sistema.

#### Criterios de aborto

- [ ] CUANDO la paridad de un mes arroja cualquier diferencia distinta de 0 pesos en las filas 1 o 2 EL SISTEMA DEBERÁ permanecer en doble registro y no avanzar de fase.
- [ ] CUANDO una nómina generada difiere en el líquido de cualquier trabajador respecto de la liquidación real EL SISTEMA DEBERÁ permanecer en doble registro hasta que se explique la diferencia.
- [ ] CUANDO el visor de auditoría muestra una mutación sin fila de auditoría asociada EL SISTEMA DEBERÁ detener el avance de fase, porque el registro dejó de ser confiable.

#### Data migration

**NOT APPLICABLE — no se migra ningún dato en este cambio.** Las tablas nuevas nacen vacías; el
histórico de la planilla no se importa. Es deliberado: importar años de Excel sin una fuente de
verdad conciliada sería sembrar datos que nadie puede auditar, en un módulo cuyo propósito es
precisamente la auditabilidad. Si en algún momento se decide cargar histórico, es un proyecto aparte
con su propia conciliación.

#### Decommission

Lo que se retira es la planilla, no un componente de software. Condiciones para archivarla: tres
meses consecutivos con nómina en estado `PAGADA` en el sistema, las cuatro filas de paridad cerradas
en cada uno de esos meses, y un respaldo del archivo Excel guardado fuera del computador de Marcela.
El archivo se conserva **6 años**, igual que el resto del historial tributario, y no se borra.

**El retiro de la planilla no es un paso de §9.** Ocurre meses después del build; está en la lista
de verificación previa al lanzamiento de §20.1.

---

## 10. Environment Setup

**Esto es brownfield: el proyecto ya está clonado, instalado y corriendo.** Este Bootstrap no crea un
proyecto; prepara el que existe para los 20 pasos de §9.

### Prerequisitos

| Herramienta | Versión | Comprobación |
|---|---|---|
| Node.js | 18.17 o superior (lo exige Next.js 14) | `node --version` |
| npm | El que trae Node | `npm --version` |
| PostgreSQL client (`pg_dump`) | 14 o superior | `pg_dump --version` |
| Git | cualquiera reciente | `git --version` |

`pg_dump` es **obligatorio**: sin él no hay respaldo, y sin respaldo el paso 1 se detiene. En Windows
viene con la instalación de PostgreSQL; hay que tener su `bin` en el `PATH`.

### Cuentas a crear primero

**Ninguna.** Este cambio no agrega ningún servicio de terceros. Usa la base de datos, el SMTP de
Hostinger y el despliegue en Vercel que el proyecto ya tiene. Es una de las razones por las que el
alcance de la v1 es el que es.

### Variables de entorno

| Variable | Para qué | Dónde se obtiene | Requerida desde el paso | ¿Secreta? |
|---|---|---|---|---|
| `DATABASE_URL` | Conexión por pooler, la que usa la aplicación | Ya existe en `.env.local` | 1 (ya existía) | sí |
| `DIRECT_URL` | Conexión directa, **obligatoria** para `db push` y `pg_dump` | Ya existe en `.env.local` | 1 (ya existía) | sí |
| `NEXTAUTH_SECRET` | Firma del JWT de sesión | Ya existe | 1 (ya existía) | sí |
| `NEXTAUTH_URL` | Base para armar el enlace de recuperación | Ya existe | 9 | no |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Envío del enlace de recuperación y del aviso de cambio de permisos, vía `lib/outreach/smtp.ts` | Ya existen, dashboard de correo de Hostinger | 9 | sí (`SMTP_PASSWORD`) |
| **`FINANZAS_ENCRYPTION_KEY`** | Clave AES-256-GCM de las cuentas bancarias. **32 bytes en base64** | Se genera con el comando de abajo | **5** | **sí** |
| **`FINANZAS_ENCRYPTION_KEY_PREVIOUS`** | Clave anterior, para descifrar lo guardado durante una rotación. Opcional | La clave que se está reemplazando | 5 (opcional, sólo al rotar) | **sí** |
| **`FINANZAS_NOTIFY_EMAILS`** | Destinatarios del aviso de cambio de permisos de Finanzas, separados por coma | Los correos de Marcela y de Elizabeth. No van al repo | **9** | no |

Generar la clave de cifrado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**"Requerida desde el paso" es un contrato con §9, no una nota.** Ningún módulo de este cambio valida
variables al importarse: `crypto.ts` lee `FINANZAS_ENCRYPTION_KEY` **dentro** de `cifrar()` y
`descifrar()`, y las rutas de correo leen las de SMTP dentro del handler. Por eso el paso 5 no rompe
los portones de los pasos 1 a 4, y el paso 9 no rompe los de los pasos 1 a 8 (§9 regla 6).

Las tres variables nuevas se documentan en `VARIABLES_ENTORNO.md`, que ya existe — es el mecanismo
del repo (regla 10 de su CLAUDE.md). **Este repo no tiene ni usa `.env.example`**: no se crea uno,
porque introducir un segundo lugar donde se documentan variables garantiza que uno de los dos quede
desactualizado.

### Archivos que deben quedar commiteados

El `.gitignore` del repo, revisado línea por línea el 2026-08-07, **no** contiene `.claude/`,
`*.md`, `*.json` sueltos ni ningún patrón que capture lo que este cambio agrega. La única línea nueva
que el Bootstrap escribe es `backups/`, y ninguno de los archivos de abajo cae dentro de ella.

| Archivo | Por qué se commitea | Línea de excepción en el ignore |
|---|---|---|
| `prisma/schema.prisma` | Es el schema | — no lo captura ningún patrón |
| `lib/finanzas/**` | Es el código y sus tests | — no lo captura ningún patrón |
| `VARIABLES_ENTORNO.md` | Es la documentación de variables del repo | — no lo captura ningún patrón |
| `CLAUDE.md` | Memoria del proyecto, ya commiteada | — no lo captura ningún patrón |
| `AGENTS.md` | Instrucciones para agentes no-Claude | — no lo captura ningún patrón |
| `.prettierignore` | Excluye `blueprints/` para que `lint-staged` no reescriba este bundle (§19.7) | — no lo captura ningún patrón. **Tiene que quedar commiteado antes del primer `Checkpoint`**, o el bundle se reformatea en ese commit |
| `.claude/settings.json` | Allowlist de comandos de verificación | — `.gitignore` ignora `.vscode/` e `.idea/`, **no** `.claude/` |
| `.claude/rules/finanzas.md` | Reglas de área | — idem |
| `.claude/skills/verificar-porteros/SKILL.md` | Flujo repetible de verificación | — idem |
| `blueprints/modulo-finanzas/**` | Este bundle; su `tasks.json` es el estado de avance del build | — no lo captura ningún patrón |
| `backups/**` | **NO se commitea** — contiene un volcado completo de la base | `backups/` (línea nueva del Bootstrap) |

### Bootstrap

```bash
# El orden importa: ignore + excepciones → repo → primer commit → install → copia de workspace →
# fusión de CLAUDE.md → claves → prisma generate. Cada línea es idempotente y sale 0 al re-ejecutarse.

# 1. El archivo de ignore, ANTES de cualquier commit. Una vez que git rastrea una ruta,
#    ninguna regla de ignore posterior la excluye jamás.
grep -qxF "backups/" .gitignore || printf '\n# Respaldos de base de datos (nunca se commitean)\nbackups/\n' >> .gitignore

# 2. Repositorio. El repo ya existe; la línea es idempotente y no hace nada si ya está.
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main
git add -A && git commit -m "chore: preparar modulo de Finanzas" --allow-empty

# 3. Dependencias existentes. npm ci si el lockfile está sano, npm install si no.
npm ci || npm install

# 4. Copiar el workspace del bundle a la raíz del proyecto — NO CLOBBER.
#    -n: nunca sobrescribe un archivo que el build ya modificó. En BSD/macOS `cp -Rn` sale 1
#    cuando omite un archivo existente, que es justo el resultado deseado, por eso el `|| true`.
#    Archivos que NUNCA se sobrescriben: CLAUDE.md (se fusiona abajo), package.json,
#    package-lock.json, tsconfig.json, vitest.config.ts, .prettierrc.
cp -Rn blueprints/modulo-finanzas/workspace/. ./ || true

# 5. Fusionar la sección de Finanzas en el CLAUDE.md existente. NO lo sobrescribe.
#    El marcador hace que re-ejecutar el bloque no anexe la sección dos veces.
grep -q '<!-- FINANZAS:INICIO -->' CLAUDE.md || cat blueprints/modulo-finanzas/workspace/CLAUDE.md >> CLAUDE.md

# 6. Clave de cifrado. Sólo se genera si no existe: re-ejecutar NUNCA debe rotar la clave,
#    porque eso dejaría ilegible todo lo ya cifrado.
grep -q "^FINANZAS_ENCRYPTION_KEY=" .env.local || \
  printf '\n# Finanzas — clave AES-256-GCM de cuentas bancarias. PERDERLA HACE IRRECUPERABLES LOS DATOS BANCARIOS.\nFINANZAS_ENCRYPTION_KEY="%s"\nFINANZAS_ENCRYPTION_KEY_PREVIOUS=""\nFINANZAS_NOTIFY_EMAILS=""\n' \
  "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" >> .env.local

# 7. Cliente de Prisma. El CLI de Prisma NO lee .env.local — hay que exportar a mano.
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
npx prisma generate

# 8. El árbol arranca verde antes del paso 1.
npm run typecheck
npm run test
```

**Trampa conocida del repo:** si una operación de schema se queda colgada, casi siempre es porque
está apuntando al pooler. `DATABASE_URL` va por el pooler; `DIRECT_URL` es la conexión directa y es
la obligatoria para `db push` y `pg_dump`.

**Todo este bloque es no interactivo y seguro de re-ejecutar.** Ninguna línea abre un prompt de
terminal, ninguna sobrescribe un archivo que un paso ya editó, y la línea 6 no rota la clave en la
segunda corrida — que sería la forma más cara de fallar de todo el bundle. §20.1 tiene un portón
manual que exige haber re-ejecutado este bloque una vez sobre un árbol ya preparado, con salida 0.

**Después del paso 2, una vez y a mano:** otorgar `FINANZAS` a la cuenta de Marcela y
`FINANZAS_LECTURA` a la de Elizabeth, desde `/admin/usuarios` o `npm run db:studio`. No es un paso de
build porque toca datos reales de producción; está en la lista de §20.1.

---

## 11. Dependencies

**Esta es la tabla de procedencia de versiones, y es el único lugar de la prosa del blueprint donde
aparece un número de versión.**

Todos los pines de abajo, salvo zod, salieron del **lockfile del repo destino**
(`package-lock.json`), leído el 2026-08-07. Un lockfile es la autoridad más fuerte que existe para un
proyecto brownfield: no es lo que alguien recomendó, es lo que está instalado. zod es la única
dependencia nueva y se verificó contra el registro npm ese mismo día.

### Runtime — ya instaladas, este cambio las consume

| Paquete | Versión | Fuente | Verificado | Instalado por | Para qué en Finanzas |
|---|---|---|---|---|---|
| `next` | 14.2.35 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | App Router, route handlers, `middleware.ts` |
| `react` | 18 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Server y client components de las nueve pantallas |
| `@prisma/client` | 5.16.1 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Acceso a datos y `prisma.$transaction`, que es lo que hace posible la auditoría transaccional |
| `next-auth` | 4.24.7 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Sesión, `getServerSession`, y `authorize()` donde entra el rate limit de login (paso 8) |
| `bcryptjs` | 2.4.3 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Hash de la contraseña nueva en la confirmación de recuperación (paso 9), costo 12 |
| `nodemailer` | 7.0.13 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Ya instalada. La consume `lib/outreach/smtp.ts`, que Finanzas reusa para el enlace de recuperación y el aviso de permisos |
| `tailwindcss` | 3.4.4 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Estilos de las nueve pantallas |
| `recharts` | 3.10 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Gráfico por categoría del resumen (paso 17) |
| `@vercel/blob` | 2.4.0 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | **No la usa Finanzas en v1.** Se lista porque §20.2 depende de su capacidad de almacenamiento privado cuando lleguen los adjuntos |
| `node:crypto` | del runtime de Node | Módulo integrado de Node — sin registro | 2026-08-07 | — módulo integrado, no se instala | AES-256-GCM y SHA-256. Cero superficie de suministro nueva para la parte más sensible del módulo |

### Runtime — nueva

| Paquete | Versión | Fuente | Verificado | Instalado por | Para qué |
|---|---|---|---|---|---|
| `zod` | **4.4.3** | https://registry.npmjs.org/zod/latest | 2026-08-07 | **Paso 6** — `npm install --save-exact zod@4.4.3` | Validación de entrada de cada ruta de la tabla de §5. Exige TypeScript ≥ 5.5; el repo tiene 5.9.3, compatible |

### Desarrollo — ya instaladas

| Paquete | Versión | Fuente | Verificado | Instalado por | Para qué en Finanzas |
|---|---|---|---|---|---|
| `typescript` | 5.9.3 | `package-lock.json` del repo, línea 8340 | 2026-08-07 | §10 Bootstrap (`npm ci`) | `npm run typecheck`, portón de casi todos los pasos. Su versión es lo que hace compatible a zod 4 |
| `prisma` | 5.16.1 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | `prisma validate`, `prisma generate`, `prisma db push` del paso 1 |
| `vitest` | 4.1.9 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Los 12 archivos de test de `lib/finanzas/` más `lib/access.test.ts` |
| `eslint-config-next` | 14.2.5 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | **Nada — está instalado pero inerte.** El repo no tiene ningún `.eslintrc*` ni clave `eslintConfig`, así que este paquete nunca se carga y `npm run lint` sólo abre un prompt de configuración. Verificado el 2026-08-07. Finanzas no lo usa ni lo arregla; ver §20.2 |
| `prettier` | 3.9.6 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | Formato en el hook de pre-commit vía `lint-staged` |
| `ts-node` | 10.9.2 | `package-lock.json` del repo | 2026-08-07 | §10 Bootstrap (`npm ci`) | **No lo usa Finanzas.** Se lista porque los scripts existentes del repo dependen de él y el paso 20 corre `npm run build` sobre todo |

### Deliberadamente no usadas

| Rechazada | En su lugar | Por qué |
|---|---|---|
| `@playwright/test` y cualquier runner E2E | Nada — no hay E2E en este cambio | `vitest.config.ts` recoge sólo `lib/**/*.test.ts`. Instalar Playwright significa reescribir la configuración de tests, agregar descarga de binarios de navegador al build y un tipo de portón que ningún otro módulo del repo tiene. Fuera de alcance, dicho explícitamente en §13 |
| `dotenv` | Dos líneas de `export` en los dos bloques que invocan Prisma | Una dependencia para leer un archivo que la aplicación ya lee sola. El problema es exclusivo del CLI de Prisma y afecta a dos bloques |
| `bignumber.js`, `decimal.js` | `Int` en pesos chilenos | El CLP no tiene centavos. Una librería de decimales aquí resolvería un problema que no existe y abriría la puerta a montos con fracción (§20.3 decisión 5) |
| `ioredis` / Upstash | `RateLimitCounter` en Postgres | Sumar un proveedor y un secreto más para contar hasta 5 en una app de dos usuarios (§20.3) |
| `@tanstack/react-query` | Server components | Las pantallas son listas paginadas que se re-renderizan al navegar. Una caché de cliente aquí sería complejidad sin problema que resolver |
| Cualquier librería de UI adicional | `@base-ui/react`, Phosphor, Recharts y Tailwind que ya están | Dos sistemas visuales en una app es peor que uno imperfecto |

---

## 12. Deployment Strategy

### Hosting

**Vercel, el proyecto que ya existe.** Este cambio no crea un proyecto nuevo, no cambia de región y
no cambia el plan. El comando de build sigue siendo `npm run build` (`prisma generate && next
build`), el directorio de salida lo maneja Vercel para Next.js, y el runtime es el que ya está
configurado.

Lo único que hay que hacer en el panel de Vercel es **agregar las tres variables nuevas**:
`FINANZAS_ENCRYPTION_KEY`, `FINANZAS_ENCRYPTION_KEY_PREVIOUS` (vacía al inicio) y
`FINANZAS_NOTIFY_EMAILS`. Va en la lista de §20.1.

**`FINANZAS_ENCRYPTION_KEY` debe ser la misma en Preview y en Production sólo si comparten base de
datos.** Si Preview usa una base distinta, usa su propia clave — y entonces los datos cifrados de una
no se leen en la otra, que es exactamente lo correcto.

### Entornos

| Entorno | Rama | URL | Base de datos | Correo |
|---|---|---|---|---|
| Local | — | `http://localhost:3000` | La que apunte `.env.local` | SMTP real de Hostinger — **cuidado**: los correos de recuperación salen de verdad |
| Preview | cualquier PR | la que asigna Vercel | La que tenga configurada el proyecto | SMTP real |
| Producción | `master` | el dominio del proyecto | Postgres de producción por pooler | SMTP real |

**El repo no tiene entorno de pruebas separado para correo.** En desarrollo, probar la recuperación
de contraseña envía un correo real; usar una dirección propia. Está anotado en las trampas de
`CLAUDE.md`.

### CI/CD

El pipeline efectivo del repo hoy son el hook de pre-commit de Husky y el build de Vercel:

```bash
# Pre-commit (.husky/pre-commit, ya existe — este cambio no lo modifica)
npx lint-staged      # prettier --ignore-unknown --write sobre lo staged
npm run typecheck    # tsc --noEmit
npm run test         # vitest run

# Build de Vercel en cada push
npm run build        # prisma generate && next build
```

El hook de pre-commit ya corre dos de los cuatro comandos del portón global de §20.1 en cada commit,
lo que significa que un paso de §9 que rompa el typecheck o los tests **no se puede commitear**. Es
una propiedad valiosa que este cambio hereda sin tocar nada.

**`npm run lint` no está en el hook, y tampoco en ningún `Verify`.** El repo no tiene configuración
de ESLint, así que `next lint` abre un prompt interactivo y cuelga a un builder desatendido —
verificado el 2026-08-07. Lo que el hook **sí** corre es `lint-staged`, que aplica
`prettier --ignore-unknown --write` sobre todo archivo en el índice: el formato se corrige solo en
cada `Checkpoint`, sin necesidad de una compuerta por paso. La compuerta explícita de formato vive
una sola vez, en §20.1, acotada a los directorios del módulo.

### Release y rollback

- **Promoción:** merge a `master` y Vercel despliega. Sin pasos manuales.
- **Rollback de código:** *Instant Rollback* en el panel de Vercel, o revertir el merge. Segundos.
- **Rollback de esquema:** **no es instantáneo y hay que decirlo.** `prisma db push` no genera un
  script de reversa. Deshacer el paso 1 significa restaurar desde `backups/pre-finanzas.sql`, que es
  una restauración completa de la base y pierde todo lo escrito después. Por eso el respaldo del paso
  1 es un requisito verificado y no una recomendación.
- **Orden respecto del código:** el cambio de esquema es **puramente aditivo**, así que la base puede
  ir adelante del código sin romper nada — el código viejo simplemente ignora las tablas nuevas. Ese
  es el orden correcto: `db push` primero, despliegue después. Al revés, el código nuevo consulta
  tablas que no existen.

### Dominio, DNS, TLS

**NOT APPLICABLE — no hay dominio nuevo.** Finanzas vive en rutas del dominio existente
(`/admin/finanzas`, `/api/finanzas`). El certificado, los redirects y los registros DNS son los del
proyecto y no se tocan.

---

## 13. Testing Strategy

| Capa | Framework | Qué cubre | Dónde | Cuándo corre |
|---|---|---|---|---|
| Unidad (funciones puras) | Vitest 4 | Porteros, cifrado, RUT, esquemas, serialización, rate limit, tokens de recuperación, paginación, cálculo de líquido, agregación, CSV | `lib/**/*.test.ts` | En cada commit (hook de pre-commit) y en cada `Verify` de §9 |
| Estructural (el guardia) | Vitest 4 + `node:fs` | Que ninguna ruta de `app/api/finanzas/` quede sin portero | `lib/finanzas/routes.test.ts` | Igual |
| Integración de rutas | **Ninguno** | — | — | — |
| E2E | **Ninguno** | — | — | — |
| Formato | Prettier 3.9.6 | Estilo de los archivos del módulo | `lib/finanzas/`, `app/api/finanzas/`, `app/(admin)/admin/finanzas/` | Automático en cada commit vía `lint-staged`; comprobado explícitamente una vez en §20.1 |
| Lint | **Ninguno** | — | — | — |

### Por qué no hay linter

`npm run lint` **no es ejecutable en este repo** y ningún `Verify` lo invoca. No existe `.eslintrc*`
en ninguna forma ni clave `eslintConfig` en `package.json`, así que `next lint` detecta la ausencia y
abre un prompt interactivo preguntando cómo configurar ESLint. Un builder desatendido se cuelga ahí.
Se ejecutó el 2026-08-07 para confirmarlo: el comando no retorna. `eslint-config-next` está instalado
pero nunca se carga.

Arreglarlo está **fuera del alcance de este cambio** — agregar configuración de ESLint expone por
primera vez una superficie de lint que cubre Operaciones, CRM e Inventario, y ninguno de esos errores
tendría que ver con Finanzas ni podría bloquear sus compuertas. Queda registrado en §20.2.

La compuerta de estilo que **sí** existe es Prettier: `.husky/pre-commit` corre `lint-staged`, cuya
configuración (`.lintstagedrc`) es `{"*": "prettier --ignore-unknown --write"}`. Todo archivo en el
índice se formatea solo en cada `Checkpoint`, lo que hace innecesaria una compuerta de formato por
paso. Por eso hay una sola, en §20.1, y va acotada a los directorios del módulo: 28 archivos
preexistentes del repo no pasan `prettier --check` hoy, y este cambio no los toca.

**`vitest.config.ts` recoge únicamente `lib/**/*.test.ts`, y este cambio no lo modifica.** Es una
restricción, no un descuido, y es la que explica la arquitectura entera: si la lógica de seguridad
viviera dentro de los route handlers, no habría forma de probarla en este repo. Por eso vive en
`lib/finanzas/` como funciones puras que reciben sus dependencias por parámetro.

### Los siete tests que sostienen el diseño

Si alguno de estos se pone en verde borrando su aserción, el módulo perdió la propiedad que
justificaba construirlo.

1. **`lib/access.test.ts`** — un usuario `role: "ADMIN"` con `moduleAccess: []` recibe `false` en
   `hasFinanceAccess` y en `canWriteFinance`. Es el test que define el módulo.
2. **`lib/finanzas/crypto.test.ts`** — ida y vuelta, y descifrado con `FINANZAS_ENCRYPTION_KEY_PREVIOUS`
   después de rotar. Sin esto, una rotación de clave es una pérdida de datos silenciosa.
3. **`lib/finanzas/serialize.test.ts`** — `FINANZAS_LECTURA` nunca recibe la cuenta completa ni el RUT
   sin enmascarar, y **ningún** rol recibe `bankAccountEnc`.
4. **`lib/finanzas/audit.test.ts`** — una mutación cuya escritura de auditoría falla aborta la
   transacción. Es lo que convierte "hay que acordarse de auditar" en una invariante.
5. **`lib/finanzas/rate-limit.test.ts`** — el sexto intento dentro de la ventana devuelve bloqueo, y
   la ventana se reinicia al expirar.
6. **`lib/finanzas/routes.test.ts`** — ninguna ruta de Finanzas sin portero, probado en dos
   direcciones: contra un directorio temporal con un archivo malo a propósito, y contra el repo real.
7. **`lib/finanzas/payroll.test.ts`** — el líquido de un caso conocido, y que nunca sale negativo.

### Datos de prueba

**No hay base de datos de prueba, y no se crea una.** Todos los tests de arriba son de funciones
puras que reciben sus dependencias como parámetro: `audit.test.ts` y `rate-limit.test.ts` pasan un
doble en memoria del cliente Prisma, `crypto.test.ts` fija su propia
`process.env.FINANZAS_ENCRYPTION_KEY` en `beforeEach`, y `routes.test.ts` crea su directorio temporal
con `node:os.tmpdir()` y lo borra al terminar.

Ninguna prueba abre una conexión, ningún `Verify` de §9 necesita un servicio corriendo, y por eso
§19.6 no emite ningún `docker-compose.yml`: no habría nada que levantar.

Los tests no comparten estado mutable y no dependen del orden de ejecución.

### Lo que deliberadamente no se prueba

Cada una de estas es una decisión, no un olvido:

- **Los route handlers de `app/api/finanzas/`, extremo a extremo.** El arnés del repo no los recoge.
  La mitigación no es fingir cobertura: es que **toda la lógica que un test de ruta comprobaría vive
  en `lib/finanzas/` y sí está probada**, y que el guardia estructural verifica mecánicamente lo
  único que quedaría fuera — que el portero esté puesto.
- **Las nueve pantallas.** No hay React Testing Library en el repo. Los estados de carga, vacío y
  error de §6 se revisan a mano una vez antes del lanzamiento (§20.1).
- **La salida literal de `formatCurrency()`.** Es `Intl.NumberFormat`, y su formato exacto depende de
  la versión de ICU del runtime. Un test que afirme `"$ 1.234"` pasa en una máquina y falla en la
  siguiente. Los tests comparan números.
- **El envío real de correo.** `lib/outreach/smtp.test.ts` ya prueba la construcción del payload sin
  abrir conexión SMTP, y Finanzas reusa esa función tal cual.
- **La restauración del respaldo.** Se prueba una vez a mano antes del lanzamiento (§20.1); no hay
  forma de automatizarla sin una base desechable.

**Por qué no se agrega E2E en este cambio:** instalar Playwright significa reescribir
`vitest.config.ts` o agregar un segundo runner, descargar binarios de navegador en el build, y crear
una categoría de portón que ningún otro módulo del repo tiene. Es un proyecto propio, con su propio
riesgo, y hacerlo dentro del cambio que agrega el módulo de finanzas mezcla dos cosas que fallan por
razones distintas. Queda como recomendación para después, en §20.4.

---

## 14. Security & Secrets

### El modelo de amenaza, dicho sin exagerar

**Escenario (A), acordado explícitamente con el dueño del proyecto: esto protege contra la curiosidad
y contra el accidente, no contra un ADMIN malicioso con acceso a la base de datos.**

Quien tenga credenciales de la base puede leer los montos, los nombres y los RUT. Puede además
otorgarse `FINANZAS` a sí mismo desde `/admin/usuarios`. Nada de lo que sigue lo impide, y decir lo
contrario sería vender una garantía que el diseño no da.

**Lo que sí garantiza:** que hacerlo deje rastro. La defensa es *imposible de ocultar*, no *imposible
de hacer*. Concretamente:

- Otorgarse o quitarse `FINANZAS` o `FINANZAS_LECTURA` escribe una fila `CAMBIAR_PERMISOS` en
  `FinanceAuditLog` **y dispara un correo a Marcela y a Elizabeth**.
- Ver una cuenta bancaria descifrada escribe una fila `DESCIFRAR`.
- Exportar el CSV escribe una fila `EXPORTAR` con el rango y el conteo, y está limitado a 5 por hora.
- Un ADMIN no puede fijar la contraseña de una cuenta de Finanzas; sólo puede disparar el enlace, que
  llega al correo del titular.

Es la protección correcta para un equipo de dos personas de confianza. Sube de nivel cuando cambie
el supuesto — ver §20.3 decisión 3.

### Tratamiento de datos sensibles

| Dato | Tratamiento |
|---|---|
| Cuenta bancaria (`Employee`, `Supplier`) | **Cifrada** con AES-256-GCM en `bankAccountEnc`. `bankAccountLast4` en claro para que la UI confirme sin descifrar. Se descifra **sólo** en `GET /api/finanzas/nominas/[id]/pago`, y ese descifrado escribe fila de auditoría |
| RUT | En claro con índice único — hay que buscar por él y evitar duplicados. **Enmascarado en la respuesta** para `FINANZAS_LECTURA`: `12.345.***-*` |
| Montos, sueldos, AFP, salud | **Sin cifrar** — hay que sumarlos, agruparlos y graficarlos, y un campo cifrado no se puede agregar en SQL. Protegidos por permisos, no por criptografía |
| Contraseñas | bcrypt costo 12. Sin cambios respecto del repo. **Nunca** se devuelven en una respuesta (regla 7 del repo) |
| Archivos y PDF | **No se guardan en v1.** Ver §1 Non-Goals y §20.2 |
| `before` / `after` de auditoría | Redactados: `bankAccountEnc` y `password` se reemplazan por `"[redactado]"` antes de escribir la fila |

### El cifrado, en concreto

`lib/finanzas/crypto.ts`, sólo `node:crypto`, sin dependencias. Formato del valor almacenado:

```
v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
```

El prefijo `v1:` es lo que permite cambiar de algoritmo más adelante sin tener que adivinar el
formato de lo ya guardado: un descifrador futuro mira el prefijo y sabe qué esquema aplicar. GCM
autentica, así que alterar un byte del ciphertext hace que el descifrado lance en vez de devolver
basura.

**Procedimiento de rotación de clave, sin downtime:**

1. Generar la clave nueva: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. En Vercel: mover el valor actual de `FINANZAS_ENCRYPTION_KEY` a `FINANZAS_ENCRYPTION_KEY_PREVIOUS`
   y poner la nueva en `FINANZAS_ENCRYPTION_KEY`. **En ese orden**, en el mismo guardado.
3. Redesplegar. Desde ese momento todo lo nuevo se cifra con la clave nueva, y `descifrar()` sigue
   leyendo lo viejo porque reintenta con la anterior.
4. Re-cifrar lo existente editando y guardando cada ficha con cuenta bancaria, o con un script
   puntual que lea y vuelva a escribir. Con dos docenas de fichas, a mano es razonable.
5. Cuando ya no quede nada cifrado con la clave vieja, vaciar `FINANZAS_ENCRYPTION_KEY_PREVIOUS`.

**Respaldo de la clave, y la advertencia que corresponde:**

> **Perder `FINANZAS_ENCRYPTION_KEY` hace irrecuperables los datos bancarios cifrados.** No hay
> puerta trasera, no hay recuperación, y el respaldo de la base de datos no ayuda: contiene el
> ciphertext, no la clave. Guardar la clave en un gestor de contraseñas fuera del computador de
> quien la generó, antes de cifrar la primera cuenta. Es la única parte de este módulo cuyo error es
> irreversible.

Mitigación de daño si aun así se pierde: los datos bancarios se pueden volver a pedir a los
trabajadores y proveedores. El historial de pagos, los montos y la auditoría **no** están cifrados,
así que nada de eso se pierde. Es una molestia grande, no una catástrofe — y es una razón más para
no cifrar los montos.

### Controles

| Preocupación | Control | Implementado en |
|---|---|---|
| Almacenamiento de secretos | `.env.local` (ignorado por git) en local, variables de entorno de Vercel en producción. **Nunca en el repo** — regla 10 del repo | `.gitignore` (ya cubre `.env.local`), panel de Vercel |
| Rotación de secretos | `FINANZAS_ENCRYPTION_KEY` según el procedimiento de arriba, sin cadencia fija: se rota ante sospecha de filtración o salida de personal con acceso. `NEXTAUTH_SECRET` y `SMTP_PASSWORD` según la política actual del repo | §14, procedimiento de rotación |
| Validación de entrada | zod en **todos** los handlers, antes de tocar la base | `lib/finanzas/schemas.ts` + cada `route.ts` |
| Codificación de salida / XSS | El escapado automático de React. Ningún `dangerouslySetInnerHTML` en Finanzas | Las nueve pantallas |
| Inyección SQL | Prisma con consultas parametrizadas. **Cero `$queryRawUnsafe` en Finanzas** | Todos los handlers |
| Inyección de fórmulas en CSV | Prefijo de comilla simple a los campos que empiezan con `=`, `+`, `-` o `@` | `lib/finanzas/csv.ts` |
| AuthN / AuthZ | Ver §8 — en el servidor, en cada request, antes del trabajo | `middleware.ts`, `lib/access.ts`, cada `route.ts`, `lib/finanzas/routes.test.ts` |
| CSRF | Cookie `sameSite: lax` de NextAuth, más el hecho de que toda mutación es JSON con método no simple | `lib/auth.ts` |
| Rate limiting / abuso | Cuatro superficies, límites en §5. Al exceder: `429` con `Retry-After` | `lib/finanzas/rate-limit.ts` |
| Verificación de webhooks | **NOT APPLICABLE** — Finanzas no recibe webhooks | — |
| Auditoría de dependencias | `npm audit` antes de cada release. La superficie nueva es **un** paquete | Manual, en la lista de §20.1 |
| Cabeceras de seguridad | Las que ya sirve el proyecto en Vercel. Este cambio no las modifica | `next.config.mjs` existente |
| Manejo de datos personales | Nombre, RUT, correo, teléfono y cuenta bancaria de trabajadores y proveedores. Retención: historial de pagos **6 años**; datos bancarios y de contacto **purgados al desvincular** | `POST /api/finanzas/empleados/[id]/desvincular` (paso 20) |
| Higiene de logs | Ningún `console.log` de montos, cuentas, RUT ni tokens. Los tokens de recuperación **jamás** se registran; sólo viaja el hash a la base y el token en claro al correo | Todos los handlers de Finanzas |

### Retención y purga

Al desvincular a un trabajador (`POST /api/finanzas/empleados/[id]/desvincular`):

- `status = DESVINCULADO`, `terminatedAt` con timestamp del **servidor**.
- **Se purgan** `bankAccountEnc`, `bankAccountLast4`, `bankName`, `bankAccountType`, `email` y
  `phone` — todos a `null` — y se fija `purgedAt`.
- **Se conserva** el historial completo de `PayrollItem`, `FinanceTransaction` y `Advance`, por
  **6 años**, por obligación tributaria chilena.
- La operación escribe fila de auditoría `DESVINCULAR`.
- **Nunca hay borrado duro de `Employee`.** Las FK son `Restrict` justamente para que la base lo
  impida aunque alguien lo intente.

### Reglas duras

- Ningún secreto se commitea, se imprime en un log, se manda a un rastreador de errores ni se
  embebe en el bundle del cliente. Todo lo que llega al navegador es público — tratarlo así.
- Toda verificación de autorización corre en el servidor **antes** del trabajo, nunca después.
- El token de recuperación en claro existe en exactamente dos lugares: la memoria del handler que lo
  genera, y el correo. En la base sólo vive su SHA-256.
- El valor de `bankAccountEnc` **nunca** sale en una respuesta de API, ni siquiera cifrado.

### Régimen regulatorio

Los datos de remuneración de trabajadores en Chile están cubiertos por la **Ley 19.628 sobre
protección de la vida privada**, que rige el tratamiento de datos personales, y los registros
contables por la obligación de conservación de **6 años** del Código Tributario. Este módulo no
maneja datos de salud (más allá del nombre de la isapre o Fonasa, que es un dato de afiliación
previsional, no un diagnóstico), no maneja datos de menores y no maneja datos de residentes de la UE.
No aplica GDPR, no aplica HIPAA, no aplica PCI-DSS — el módulo **registra** pagos, no procesa
tarjetas.

Las obligaciones concretas que esto crea para el build son dos, y las dos están implementadas: la
finalidad del tratamiento está acotada por permisos (§8), y la retención está definida y ejecutada
(purga al desvincular, conservación de 6 años del historial).

---

## 15. Accessibility

**Objetivo: WCAG 2.2 Nivel AA.** Aquí no es cumplimiento por cumplimiento: Marcela va a pasar horas
seguidas en estas tablas. La operación por teclado en un panel administrativo es productividad antes
que accesibilidad — un formulario que obliga a soltar el teclado para tocar el mouse cuesta minutos
todos los días.

### Requisitos base

| Requisito | Regla en este módulo |
|---|---|
| HTML semántico | `<main>` en el layout de Finanzas, un solo `<h1>` por pantalla, encabezados en orden, `<table>` real con `<th scope="col">` — no una grilla de `<div>` |
| Teclado | Toda la carga de un movimiento se completa sin mouse: tabular entre campos, `Enter` envía, `Escape` cierra el diálogo. Sin trampas de foco. Link "saltar al contenido" en el layout |
| Foco visible | Anillo de 2px en `--fin-primary` `#1D4ED8` sobre `--fin-surface` `#FFFFFF`, contraste 6.7:1 — supera el 3:1 exigido |
| Contraste | Los cinco pares de §7 medidos y aprobados |
| Formularios | Cada input con `<label for>` real, no un `placeholder` haciendo de etiqueta. Los errores son texto junto al campo, con `aria-describedby`, nunca sólo un borde rojo |
| Imágenes | El módulo no tiene imágenes decorativas. Los íconos de Phosphor van con `aria-hidden="true"` cuando acompañan texto, y con `aria-label` cuando son el único contenido de un botón |
| Movimiento | Todo respeta `prefers-reduced-motion: reduce`, que aquí significa duración 0 |
| Zoom / reflujo | Usable al 200% y a 320 px de ancho sin scroll horizontal. Las tablas anchas hacen scroll **dentro de su propio contenedor**, nunca en el `body` |
| Regiones vivas | El resultado de guardar, aprobar o anular se anuncia con `aria-live="polite"`; los toasts de `sonner` ya lo hacen |

### Lo específico del módulo

| Situación | Regla |
|---|---|
| Ingreso vs egreso | **Nunca sólo por color.** Signo `+` o `−` en el monto y etiqueta de texto en la columna de tipo. Un daltónico y un lector de pantalla distinguen igual |
| Estado de nómina y anticipo | Badge con texto (`BORRADOR`, `APROBADA`, `PAGADA`), no un punto de color |
| Tablas de montos | `font-variant-numeric: tabular-nums` es también accesibilidad: las cifras alineadas se comparan con la vista, no contando dígitos |
| Diálogos de confirmación | El texto dice **qué** y **cuánto**: "Anular el egreso de $ 450.000 del 12-08-2026", nunca "¿Estás seguro?" |
| Tabla ordenable | `aria-sort` en el `<th>` activo, y el orden se refleja en la URL para que sea compartible |
| Paginador | Links reales (`<a href>`), no botones con estado. Navegables, compartibles y anunciables |

### Adiciones de WCAG 2.2 que aquí importan

| SC | Aplicación en Finanzas |
|---|---|
| 2.4.11 Foco no oscurecido | El encabezado pegajoso del layout no tapa el campo enfocado al tabular por un formulario largo: `scroll-margin-top` en los campos |
| 2.5.7 Movimientos de arrastre | El módulo no tiene ningún arrastre. Nada que mitigar |
| 2.5.8 Tamaño del objetivo | Los íconos de acción de cada fila miden 24×24 px mínimos, con separación entre ellos |
| 3.3.7 Entrada redundante | El formulario de nómina precarga bruto, AFP y salud desde la ficha del trabajador; no se retipean |
| 3.3.8 Autenticación accesible | El login existente permite pegar la contraseña y funciona con gestor de contraseñas. **No se agrega CAPTCHA**: el rate limit del paso 8 cumple la misma función sin pedirle una prueba cognitiva a nadie |

### Verificación

**No hay herramienta automática de accesibilidad en este repo, y este cambio no instala una** — sería
otro runner, con la misma discusión que Playwright (§13). Lo que sí hay es una revisión manual
obligatoria antes del lanzamiento, en la lista de §20.1:

1. **Recorrido sólo con teclado** de las nueve pantallas: cargar un movimiento, crear un trabajador,
   generar una nómina y aprobarla, sin tocar el mouse.
2. **Un pase con lector de pantalla** sobre el flujo de carga de movimiento.
3. **Zoom al 200%** en la pantalla de movimientos, que es la tabla más ancha: nada se corta y no
   aparece scroll horizontal en el `body`.
4. **Un pase quitando el color**: en escala de grises, ingreso y egreso siguen siendo distinguibles.

Las revisiones automáticas atrapan alrededor de un tercio de los problemas reales; estas cuatro
pasadas atrapan el resto de lo que importa en un panel de tablas.

---

## 16. Observability & Cost

### Instrumentación

| Señal | Herramienta | Qué captura | Quién la mira |
|---|---|---|---|
| Errores | Runtime Logs de Vercel | Excepciones no capturadas de los route handlers, con la ruta y el status | El desarrollador, ante un reporte |
| Logs | `console.warn` / `console.error` estructurados, como ya hace el repo en `app/api/usuarios/route.ts` | Denegaciones de acceso (`userId`, `role`, ruta), fallos de descifrado, rate limits disparados | El desarrollador |
| **Auditoría de negocio** | **`FinanceAuditLog`, en la propia base** | Quién hizo qué, cuándo, con qué valores antes y después | **Marcela y Elizabeth, desde `/admin/finanzas/auditoria`** |
| Disponibilidad | La que ya tenga el proyecto en Vercel | — | — |

**La observabilidad que importa aquí no es técnica, es de negocio.** Un módulo de dos usuarias no
tiene un problema de p99 ni de saturación; tiene un problema de "quién cambió este sueldo". Por eso
el instrumento central es el visor de auditoría del paso 18, y por eso está a la vista de las dos
usuarias en vez de escondido en un panel de administración.

**Regla de higiene de logs, no negociable:** ningún `console.*` de Finanzas imprime un monto, un RUT,
una cuenta bancaria ni un token de recuperación. Los logs registran **qué pasó y a quién**, no
**cuánto**.

### Las métricas que importan

| Métrica | Objetivo | Alerta cuando |
|---|---|---|
| Filas `CAMBIAR_PERMISOS` en `FinanceAuditLog` | 0 por mes en régimen | Cualquiera. **Ya llega por correo** — es el mecanismo del escenario (A) |
| Filas `DESCIFRAR` por mes | 1 a 2, una por nómina generada | Más de 5 en un mes: alguien está mirando cuentas bancarias fuera del ciclo de pago |
| Filas `EXPORTAR` por mes | 1 a 4 | Más de 10, o varias en un mismo día |
| Mutaciones sin fila de auditoría | **0, siempre** | Cualquiera distinta de 0 — significa que un camino de escritura se saltó `withAudit()` |
| Logins bloqueados por rate limit | 0 | Más de 3 en un día sobre la misma cuenta |
| Latencia de `/admin/finanzas/movimientos` | Bajo 1s con la paginación en servidor | Sobre 3s — casi seguro que alguien quitó el `take` |

Las cuatro primeras se responden con una consulta al visor de auditoría. No se construye ningún
tablero: un tablero que nadie mira es peor que ninguno, y estas métricas se miran una vez al mes.

### Health check

**NOT APPLICABLE como endpoint nuevo.** Finanzas no agrega una ruta de salud: comparte proceso, base
de datos y despliegue con el resto de la aplicación, así que el health check del proyecto ya cubre
"la aplicación responde" y "la base está alcanzable". Una segunda ruta de salud que verifica lo mismo
sólo agrega una superficie más que mantener.

Lo que sí es específico de Finanzas y **no** lo cubre un health check genérico es que
`FINANZAS_ENCRYPTION_KEY` esté configurada en producción. Eso no se chequea con un ping: se verifica
una vez, al desplegar, generando una nómina de pago de prueba. Está en la lista de §20.1.

### Modelo de costo

| Servicio | Plan actual | Costo incremental de Finanzas | A 10× el volumen | Dónde salta el precio |
|---|---|---|---|---|
| Vercel | El del proyecto | **$0** — mismas funciones, mismo despliegue, 9 rutas más | $0 | El plan salta por ancho de banda y horas de función, no por cantidad de rutas |
| PostgreSQL | El del proyecto | **Casi $0** — 10 tablas con volumen muy bajo: unas decenas de trabajadores, unos cientos de movimientos al mes | Casi $0 | El almacenamiento salta con `FinanceAuditLog` si crece sin límite, muy por encima de 10× |
| SMTP Hostinger | El del proyecto | **$0** — unos pocos correos al mes | $0 | Cuota diaria del buzón, lejísimos |
| Vercel Blob | — | **$0** — Finanzas no guarda archivos en v1 | — | Sube el día que lleguen los adjuntos (§20.2) |

**Costo mensual incremental estimado: $0.** Este módulo no agrega un solo servicio ni un solo
proveedor, y ese fue un criterio de diseño explícito: el rate limiting va sobre Postgres en vez de
Redis, el cifrado va sobre `node:crypto` en vez de una librería, y el correo reusa el SMTP que ya
está pagado.

**La única línea que crece sin techo natural es `FinanceAuditLog`**, porque es append-only por
diseño. Con el volumen de esta empresa son miles de filas al año, no millones, así que no hay nada
que hacer hoy. Si alguna vez importa, la salida es archivar filas de más de 6 años a almacenamiento
frío — **nunca borrarlas dentro de esos 6 años**.

### Reglas de rendimiento que evitan el problema antes de que exista

- **Paginación en la base, siempre**, con tope duro de 100 filas (`lib/finanzas/paginacion.ts`). Es
  la regla que impide que la pantalla de movimientos se caiga el día que haya 50.000 filas.
- **Los agregados del resumen se calculan en SQL**, no trayendo filas al servidor para sumarlas en
  JavaScript.
- **Los índices de §4 existen antes que las pantallas** — se crearon en el paso 1.
- **Todos los montos son `Int`.** Además de correcto, es más barato de sumar y de indexar que
  cualquier decimal.

---

## 17. Model Routing

NOT APPLICABLE — el módulo no usa modelos de lenguaje.

---

## 18. Skills to Use During Build

Ninguna de estas es obligatoria. Si una no está instalada, el builder usa la guía de este blueprint,
anota la sustitución en una línea y sigue. **Ninguna lleva `/` porque las tres se activan por
intención, no como comando.** Escribir `/ui-ux-pro-max` sería un no-op silencioso y el paso se
saltaría sin que nadie lo note.

| Skill | Pasos de §9 | Qué aporta ahí | Instalación |
|---|---|---|---|
| `ui-ux-pro-max` | 11, 13, 15, 17 | Estilo de tablas densas, formularios y diálogos; paleta de datos que sobrevive al modo oscuro. Las tablas de Finanzas son el 80% de su interfaz y son lo que más se degrada cuando se improvisa | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`<br>`/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| `frontend-design` | 11, 13, 16, 17, 18 | Disposición de las pantallas de lista y de detalle, y del panel de resumen | `/plugin marketplace add anthropics/skills`<br>`/plugin install example-skills@anthropic-agent-skills` |
| `emil-design-eng` | 13, 16 | Los pocos lugares con transición real: apertura de diálogos y el panel de pago. Hay que darle una pregunta concreta; con una consigna vaga devuelve genérico | `npx skills@latest add emilkowalski/skills` |

**`playwright-cli` no está en esta tabla a propósito.** El registro lo recomienda cuando hay E2E en
alcance, y aquí no lo hay (§13). Nombrarlo invitaría a instalarlo y a reescribir la configuración de
tests, que es exactamente lo que este cambio decidió no hacer.

---

## 19. Agent Workspace

Este bundle emite, como **archivos reales** bajo `blueprints/modulo-finanzas/workspace/`, la
configuración de agente que el proyecto necesita para construir Finanzas. El Bootstrap de §10 la
copia a la raíz del proyecto con **una** orden, en su forma no destructiva:

```bash
cp -Rn blueprints/modulo-finanzas/workspace/. ./ || true
```

**`-n` no es opcional y el `|| true` tampoco.** Bootstrap es lo primero que re-ejecuta un builder
atascado, y una copia recursiva sin guarda sobre un árbol ya preparado revertiría archivos que los
pasos posteriores editaron. Y `cp -Rn` **sale 1 en BSD/macOS cuando omite un archivo existente**, que
es precisamente el resultado deseado: bajo `set -e`, sin el `|| true`, la segunda corrida del
Bootstrap abortaría en la línea que existe para hacerla segura. En GNU `cp -n` sale 0 en la misma
situación, así que la línea pasaría en Linux y fallaría en macOS sin que nada lo delate.

**Archivos que la copia nunca sobrescribe**, porque `-n` los omite si ya existen y todos existen:
`CLAUDE.md` (se **fusiona** aparte, en el paso 5 del Bootstrap), `package.json`, `package-lock.json`,
`tsconfig.json`, `vitest.config.ts`, `.prettierrc`, `.gitignore`.

```
blueprints/modulo-finanzas/workspace/
├── CLAUDE.md                                    # §19.1 — se FUSIONA con el CLAUDE.md del repo
├── AGENTS.md                                    # §19.2 — archivo nuevo, no existe en el repo
├── .prettierignore                              # §19.7 — archivo nuevo. Excluye blueprints/
│                                                #   para que lint-staged no reescriba este bundle
└── .claude/
    ├── settings.json                            # §19.3 — archivo nuevo; el repo sólo tiene
    │                                            #   settings.local.json y launch.json
    ├── rules/finanzas.md                        # §19.5
    └── skills/verificar-porteros/SKILL.md       # §19.4
```

**No se emite `.claude/commands/`.** Un comando de barra sólo se dispara cuando un humano lo escribe,
y un builder autónomo no escribe nada: sería peso muerto que jamás se invoca. El flujo repetible del
módulo va en `.claude/skills/verificar-porteros/SKILL.md`, que se activa por intención.

**Todo lo que se emite pasa los portones del propio repo.** El hook de pre-commit corre
`prettier --ignore-unknown --write` sobre lo que se stagea, con la configuración real de
`.prettierrc` del repo (2 espacios, sin tabs, comillas dobles, `printWidth` 80, `semi: true`), y
`settings.json` está escrito exactamente así. Prettier reformatea tablas de Markdown al escribir; es
`--write`, no `--check`, así que ajusta el archivo en vez de fallar el portón.

### 19.1 `CLAUDE.md`

**Emitido como archivo real en `blueprints/modulo-finanzas/workspace/CLAUDE.md`.**

**Se FUSIONA con el `CLAUDE.md` existente del repo. No lo sobrescribe.** El repo ya tiene su
`CLAUDE.md` con ocho secciones vivas (qué es el proyecto, stack, comandos, convenciones, reglas
duras, la iniciativa de Prospección, estado y trampas). Sobrescribirlo destruiría el contexto de tres
módulos productivos.

El mecanismo de fusión está en el paso 5 del Bootstrap de §10 y es idempotente:

```bash
grep -q '<!-- FINANZAS:INICIO -->' CLAUDE.md || cat blueprints/modulo-finanzas/workspace/CLAUDE.md >> CLAUDE.md
```

El archivo abre con el marcador `<!-- FINANZAS:INICIO -->` y cierra con `<!-- FINANZAS:FIN -->`,
ambos en comentarios HTML de bloque —que no consumen tokens en tiempo de ejecución— y arriba lleva
escrito, en el propio archivo, que se anexa y nunca se pega encima. Se numera como **sección 9**
porque el `CLAUDE.md` del repo termina en la 8.

Contenido: comandos primero, las 14 reglas duras del módulo, la tabla de fuente única por asunto, las
tres variables de entorno nuevas con la advertencia sobre la pérdida de la clave, los tokens de
diseño literales, las siete trampas del módulo y los siete puntos no negociables. Bajo 200 líneas.

### 19.2 `AGENTS.md`

**Emitido como archivo real en `blueprints/modulo-finanzas/workspace/AGENTS.md`.**

El repo **no** tiene `AGENTS.md`, así que este es archivo nuevo y la copia del Bootstrap lo instala
sin conflicto. Es el puente para los agentes que no leen `CLAUDE.md` y no leerán nada más: la
descripción en una línea, la tabla de comandos, las dos líneas de `export` que el CLI de Prisma
necesita, los nueve puntos no negociables, y el puntero a `CLAUDE.md` como fuente de verdad.

Duplica los comandos y las reglas duras a propósito: son cortas, casi nunca cambian y son
exactamente lo que rompe el build si un agente no las conoce.

**No se usa `ln -s CLAUDE.md AGENTS.md`.** Este proyecto se desarrolla en Windows y el enlace
simbólico no sobrevive el checkout.

### 19.3 `.claude/settings.json`

**Emitido como archivo real en `blueprints/modulo-finanzas/workspace/.claude/settings.json`.**

El repo tiene `.claude/settings.local.json` y `.claude/launch.json`, pero **no** `settings.json`, así
que la copia del Bootstrap lo instala sin pisar nada.

`permissions.allow` cubre **todos** los comandos que aparecen en algún `Verify` de §9 y en el portón
global de §20.1 — `npm run typecheck`, `npm run test`, `npm run build`, el chequeo de formato de §13,
`npm run db:push`, `npx vitest run`, `npx prisma validate`, `npx prisma generate`, `node -e`,
`pg_dump`, `test`, `grep`, `find`, `cat`, `cp`, `mkdir`, `printf`, `export`, `npm ci`, `npm install`,
`npm audit`, y los comandos de git que usan los `Checkpoint`. Una sola línea faltante ahí es un build
desatendido detenido a las 3 de la mañana esperando una autorización que nadie va a dar.

`permissions.deny` bloquea lo que nunca debe ser automático en este repo: leer `.env.local` con la
herramienta de lectura, `git push`, `--accept-data-loss` en cualquiera de sus dos formas,
`prisma migrate reset`, `psql`, `dropdb` y `rm -rf`. Es JSON válido: cada elemento de cada arreglo es
una cadena de permiso, nunca una frase de prosa —que no sería un comentario sino una regla que jamás
calza.

### 19.4 Skills del proyecto — `.claude/skills/verificar-porteros/SKILL.md`

**Emitido como archivo real en
`blueprints/modulo-finanzas/workspace/.claude/skills/verificar-porteros/SKILL.md`.**

| Skill | Se activa cuando | Qué automatiza |
|---|---|---|
| `verificar-porteros` | Se crea o edita un `route.ts` bajo `app/api/finanzas/`, antes de commitear un paso de §9 desde el 11 en adelante, o cuando `lib/finanzas/routes.test.ts` falla nombrando un archivo | Corre el guardia, indica el portero correcto para cada método, busca usos prohibidos de `hasModuleAccess()` en Finanzas, y recuerda revisar método por método porque el guardia lee el archivo completo |

Es una sola skill a propósito. La otra candidata obvia —"agregar una ruta de Finanzas"— sería una
descripción del procedimiento que las reglas de §19.5 ya imponen; una skill que repite una regla es
peso muerto que compite por atención.

### 19.5 `.claude/rules/finanzas.md`

**Emitido como archivo real en `blueprints/modulo-finanzas/workspace/.claude/rules/finanzas.md`.**

| Archivo | Globs de `paths` | Cubre |
|---|---|---|
| `.claude/rules/finanzas.md` | `app/api/finanzas/**`, `app/(admin)/admin/finanzas/**`, `lib/finanzas/**`, `lib/access.ts` | Autorización sin bypass, auditoría transaccional, dinero entero, las reglas de `lib/finanzas/` (funciones puras, imports relativos, sin `process.env` al importar), las reglas de rutas y páginas (zod, serialización, paginación, timestamps del servidor, nada de `DELETE`, spec al lado), y las reglas de interfaz |

El cuerpo se carga sólo cuando el agente toca un archivo que calza con uno de esos cuatro globs —ese
es el mecanismo de diferimiento, y es la razón de que estas 60 líneas no vivan en `CLAUDE.md`.
`lib/access.ts` está en la lista aunque sea un archivo compartido, porque es exactamente donde un
agente distraído "simplificaría" `hasFinanceAccess()` para que use `hasModuleAccess()`.

### 19.6 Verify-critical config and local infrastructure

**NOT APPLICABLE — el repo destino ya provee toda la configuración verify-critical
(`vitest.config.ts`, `tsconfig.json`, `package.json`, `.prettierrc`, `.eslintrc`); emitirlas las
sobrescribiría.**

Es la diferencia entre greenfield y brownfield, y la consecuencia es grande: **este bundle no emite
ni un solo archivo de configuración de herramienta**. `vitest.config.ts` existe y recoge
`lib/**/*.test.ts`, que es exactamente donde viven los 12 tests nuevos. `tsconfig.json` existe con
`strict: true` y el alias `@/*`. `package.json` existe con los seis comandos que usa §9. Copiar
cualquiera de ellos desde `workspace/` los revertiría a una versión que no conoce las dependencias
instaladas — el modo de fallo más caro que describe este template, y aquí simplemente no puede
ocurrir porque los archivos no se emiten.

**Tampoco se emite `docker-compose.yml` ni ningún archivo de servicio local**, porque ningún `Verify`
de §9 necesita un servicio corriendo: los 12 tests son de funciones puras que reciben sus
dependencias por parámetro (§13). No hay base de datos de prueba que levantar.

#### Modificaciones puntuales a archivos existentes

Lo que en un proyecto nuevo sería "emitir un archivo", aquí es "editar una línea". Estas son todas,
con el paso que las aplica:

| Archivo existente | Modificación | Paso | Por qué |
|---|---|---|---|
| `prisma/schema.prisma` | Agregar 7 enums y 10 modelos; agregar 6 relaciones inversas en `User`; agregar `FINANZAS` a `UserRole` y `FINANZAS`, `FINANZAS_LECTURA` a `ModuleAccess` | 1 | Es el modelo de datos de §4. Puramente aditivo |
| `tsconfig.json` | Agregar `"blueprints"` al arreglo `exclude` | 1 | `include` es `["**/*.ts", "**/*.tsx"]`: cualquier `.ts` que llegue a vivir bajo `blueprints/` entraría al `tsc --noEmit` del repo. Hoy este bundle sólo contiene `.md` y `.json`, así que la línea es preventiva y cuesta una palabra |
| `lib/access.ts` | Agregar `FinanceModuleKey`, `hasFinanceAccess()`, `canWriteFinance()`. **`hasModuleAccess()` intacta** | 2 | §8 |
| `lib/access.test.ts` | **Ampliar**, nunca reemplazar. Los cuatro tests existentes quedan | 2 | §8 |
| `middleware.ts` | Dos ramas nuevas, en el orden de §8 | 3 | §8 |
| `VARIABLES_ENTORNO.md` | Documentar `FINANZAS_ENCRYPTION_KEY`, `FINANZAS_ENCRYPTION_KEY_PREVIOUS` y `FINANZAS_NOTIFY_EMAILS` | 5 | Regla 10 del repo. Este repo no usa `.env.example` |
| `package.json` | Una dependencia: `zod` en `4.4.3` exacto | 6 | §11 |
| `lib/auth.ts` | Rate limit dentro de `authorize()`, antes del `compare` de bcrypt | 8 | §5, §8 |
| `app/api/usuarios/route.ts` | Módulos y roles nuevos en las listas de validación; `403` al `password` sobre cuentas de Finanzas; auditoría y correo al cambiar `moduleAccess` | 9 | §5, cierre del hallazgo #4 |
| `components/ui/AdminSidebar.tsx` | Módulo Finanzas, filtrado siempre por `moduleAccess` aunque `isAdmin` sea `true`. Los otros tres módulos conservan el bypass | 20 | Cierre del hallazgo #5 |
| `CLAUDE.md` | **Anexar** la sección 9 de `workspace/CLAUDE.md`. Nunca sobrescribir | §10 Bootstrap, revisado en 20 | §19.1 |
| `.gitignore` | Una línea: `backups/` | §10 Bootstrap | El respaldo del paso 1 es un volcado completo de la base y no se commitea jamás |

**`vitest.config.ts` no aparece en esta tabla, y es deliberado.** Modificarlo para recoger tests de
rutas o para agregar un resolvedor de alias sería la decisión que este blueprint eligió no tomar
(§13, §20.3). La arquitectura entera —lógica pura en `lib/finanzas/`, dependencias por parámetro,
imports relativos— existe para no tener que tocarlo.

#### Resolution convention matrix

**La convención, dicha una sola vez:** dentro de `lib/finanzas/` los imports son **relativos**
(`./crypto`, `../access`, `../utils`); bajo `app/` y `components/` son con el **alias `@/`**
(`@/lib/access`, `@/lib/db`, `@/lib/utils`). Es la única convención de resolución que este blueprint
introduce, y no es una preferencia estética: `vitest.config.ts` no declara `resolve.alias` y Vite no
lee `paths` de `tsconfig.json` por su cuenta, así que un `@/` dentro de un módulo que un test importa
muere con `Cannot find module '@/lib/...'`.

| Contexto | Comando que lo ejercita | La convención ahí | Config y ajuste literal que la hace funcionar |
|---|---|---|---|
| **Código de aplicación** (`app/`, `components/`) | `npm run build` | `@/lib/access`, `@/lib/db`, `@/lib/utils` | `tsconfig.json` — `"paths": { "@/*": ["./*"] }`, que Next lee y aplica en su propio bundler. **Ya existe en el repo, no se modifica** |
| **Archivos de test** (`lib/**/*.test.ts`) | `npm run test` · `npx vitest run lib/finanzas/crypto.test.ts` | Relativa: `import { cifrar } from "./crypto"` | `vitest.config.ts` — **ninguna configuración de alias, y por eso la convención es relativa**. Es el resolvedor por defecto de Vite, que resuelve especificadores relativos literalmente. Los dos tests que ya existen en el repo (`lib/access.test.ts`, `lib/tracking.test.ts`) usan exactamente esta forma |
| **Módulos bajo test** (`lib/finanzas/*.ts`) | `npm run test` (los importa el test) | Relativa: `import { enmascararRut } from "./rut"` | Igual que la fila anterior: el resolvedor por defecto de Vite. **Esta es la fila que se rompe si alguien "moderniza" un import a `@/`** — el archivo compila con `tsc` y falla en Vitest, que es la combinación más confusa posible |
| **Chequeo de tipos** | `npm run typecheck` | Ambas formas son válidas | `tsconfig.json` — `"paths"` acepta `@/`, y la resolución relativa siempre funciona con `"moduleResolution": "bundler"`. **Por eso el typecheck no atrapa este error y el test sí** |
| **Build / bundle** | `npm run build` | `@/` bajo `app/`, relativa bajo `lib/finanzas/` | `tsconfig.json` + el bundler de Next. Ambas sobreviven al bundle |
| **Scripts independientes** | `npm run db:seed`, `npm run import:prospects` (`ts-node`) | No aplica a Finanzas | Este cambio **no agrega ningún script independiente**. Los scripts existentes usan `ts-node --project tsconfig.scripts.json`; ninguno importa `lib/finanzas/`. Si algún día uno lo hace, hereda esta misma convención relativa, que es la que `ts-node` resuelve sin configuración extra |
| **Formato** | el chequeo de `prettier --check` de §13 | No aplica — Prettier no resuelve imports | `.prettierrc` del repo. **No hay linter**: el repo no tiene configuración de ESLint y `next lint` es interactivo, así que ninguna compuerta lo invoca |

Las reglas de §19.5 la hacen cumplir en el área correcta, y cinco `Verify` de §9 la comprueban
mecánicamente con `! grep -q "@/lib" lib/finanzas/<archivo>.ts`.

#### Cross-artifact value reconciliation

Valores que aparecen en dos o más artefactos de este bundle. Cada uno tiene **una** fuente que lo
decide, y las demás apariciones se compararon carácter por carácter.

| Valor compartido | Fuente única — el archivo que lo decide | Valor literal | Dónde más aparece | Comparado |
|---|---|---|---|---|
| Directorio de módulos de Finanzas | `vitest.config.ts` del repo — `include: ['lib/**/*.test.ts']` | `lib/finanzas/` | §3 árbol · §9 pasos 4–10, 13, 15, 17, 19 · `workspace/CLAUDE.md` tabla de fuente única · `workspace/.claude/rules/finanzas.md` `paths` · `tasks.json` `files` · los 5 epics | sí |
| Directorio de rutas de API | §5 tabla de rutas | `app/api/finanzas` | `middleware.ts` (rama nueva) · `lib/finanzas/routes.test.ts` (directorio que recorre) · `rules/finanzas.md` `paths` · `SKILL.md` · §3 árbol · §9 pasos 10–20 | sí |
| Ruta URL del módulo | §6 tabla de rutas | `/admin/finanzas` | `middleware.ts` (rama nueva) · `AdminSidebar.tsx` (link) · §3 árbol (`app/(admin)/admin/finanzas/`, donde `(admin)` **no** aparece en la URL) · `rules/finanzas.md` `paths` | sí |
| Portero de lectura | `lib/access.ts` | `hasFinanceAccess` | §8 · `middleware.ts` · cada `route.ts` · `lib/finanzas/routes.test.ts` · `rules/finanzas.md` · `SKILL.md` · `CLAUDE.md` · `AGENTS.md` · §9 pasos 2, 3, 10–20 | sí |
| Portero de escritura | `lib/access.ts` | `canWriteFinance` | los mismos lugares que el anterior, más §6 (renderizado condicional) y §9 paso 16 | sí |
| Variable de la clave de cifrado | §10 tabla de variables | `FINANZAS_ENCRYPTION_KEY` | `lib/finanzas/crypto.ts` · `.env.local` (Bootstrap) · `VARIABLES_ENTORNO.md` · `CLAUDE.md` · §12 · §14 · §20.1 | sí |
| Prefijo del valor cifrado | `lib/finanzas/crypto.ts` | `v1:` | §4 (`Employee.bankAccountEnc`, `Supplier.bankAccountEnc`) · §14 · §9 pasos 5, 11, 12 | sí |
| Archivo de respaldo del paso 1 | §9 paso 1 | `backups/pre-finanzas.sql` | §10 Bootstrap (`.gitignore` con `backups/`) · §9 paso 1 `Verify` y `Checkpoint` · §12 · §20.1 | sí |
| Marcador de fusión de `CLAUDE.md` | `workspace/CLAUDE.md` — primera línea | `FINANZAS:INICIO` | §10 Bootstrap (`grep -q`) · §19.1 · §9 paso 20 `Verify` (`grep -c ... -eq 1`) | sí |
| Ruta del bundle dentro del proyecto | §10 Bootstrap | `blueprints/modulo-finanzas/` | `tsconfig.json` `exclude` (como `blueprints`) · §3 árbol · §9 paso 1 · §19 · §20.1 | sí |
| Pin de zod | §11 | `4.4.3` | §9 paso 6 (`npm install --save-exact zod@4.4.3` y el `node -e` que lo comprueba) · `workspace/.claude/settings.json` (`Bash(npm install --save-exact zod@4.4.3)`) · `tasks.json` `verify` de E1-T6 · epic 01 | sí |
| Etiquetas de checkpoint | §9 bloques `Checkpoint` | `step-01-schema-finanzas` … `step-20-cierre-finanzas` | `tasks.json` campo `checkpoint` de las 20 tareas · los bloques `Checkpoint` de los 5 epics · §20.1 (`git tag -l 'step-*'`) | sí |

**El único contrato entre artefactos que podría contradecirse en silencio** es el directorio que
`lib/finanzas/routes.test.ts` recorre (`app/api/finanzas`) contra el directorio donde el paso 11
crea la primera ruta. Se ejercita en el paso más temprano donde ambos lados existen —el **11**, cuya
`Verify` corre `npx vitest run lib/finanzas/routes.test.ts` sobre las dos rutas recién creadas— y no
en el paso 20. Si los dos valores no coincidieran, el guardia devolvería el arreglo vacío por
recorrer un directorio inexistente y **todos** los pasos siguientes reportarían verde sin verificar
nada. Por eso el test del paso 10 comprueba primero el guardia contra un directorio temporal con un
archivo malo a propósito: prueba que el guardia sabe fallar, antes de creerle cuando dice que todo
está bien.

#### Byte-exact artifact reconciliation

Este bundle no emite archivos golden ni fixtures: no hay ningún `Verify` que corra `diff` contra un
literal almacenado. Sí hay **dos** literales que un test compara carácter por carácter, y los dos se
reconciliaron.

| Artefacto byte-exact | Lo escribe | Se compara por primera vez en | Reglas del blueprint que lo restringen | Llamada del runtime que lo produce, sobre el pin de §11 | Ambos confirmados |
|---|---|---|---|---|---|
| El RUT enmascarado `12.345.***-*` | §9 paso 6 (`enmascararRut`) y §9 paso 7 (`serialize.test.ts`) | Paso 6 | §14 *Tratamiento de datos sensibles* dicta la forma `12.345.***-*` · §4 dice que `Employee.rut` se guarda normalizado como `12345678-9` · §7 no impone formato a este campo. La entrada del test es un literal que el propio test provee, no un valor leído de la base | **Ninguna** — es manipulación de cadenas pura escrita en este mismo cambio (`lib/finanzas/rut.ts`), sin `Intl`, sin locale, sin dependencia de la versión de Node o de ICU | sí |
| El prefijo `v1:` y los cuatro segmentos separados por `:` | §9 paso 5 (`lib/finanzas/crypto.ts`) | Paso 5 | §4 describe `bankAccountEnc` con ese formato · §14 lo repite literal · el separador `:` no colisiona con base64, cuyo alfabeto es `A–Z a–z 0–9 + / =` | **Ninguna** — el formato lo construye este mismo código concatenando; `node:crypto` sólo aporta bytes, no texto formateado | sí |

**Y la regla que impide que aparezca un tercer caso:** ningún test compara la salida de
`formatCurrency()`. Es `Intl.NumberFormat("es-CL", { currency: "CLP" })`, cuyo resultado exacto —el
espacio después del `$`, el separador de miles— depende de la versión de ICU del runtime, y §11 pina
la versión de Node en un rango, no en un número. Un test que afirmara `"$ 1.234"` pasaría en la
máquina de quien lo escribió y fallaría en Vercel. Está escrito como regla en §13, en
`workspace/.claude/rules/finanzas.md` y en `workspace/CLAUDE.md`, y comprobado con un `grep` en la
`Verify` del paso 17.

---

### 19.7 `.prettierignore`

**Emitido como archivo real en `blueprints/modulo-finanzas/workspace/.prettierignore`.**

El repo **no** tiene `.prettierignore`, así que este es archivo nuevo y la copia del Bootstrap lo
instala sin pisar nada.

Existe por un defecto que sólo aparece ejecutando el build, no leyéndolo. `.husky/pre-commit` corre
`lint-staged`, y `.lintstagedrc` es literalmente:

```json
{ "*": "prettier --ignore-unknown --write" }
```

Es decir: **todo** archivo que entre al índice se reformatea. Cada `Checkpoint` de §9 hace
`git add -A && git commit`, así que sin esta exclusión Prettier reescribiría `blueprint.md` y los
cinco archivos de `epics/` a mitad del build — reflujo a 80 columnas sobre tablas y bloques escritos
a mano. El bundle es la especificación del cambio; una herramienta del proyecto que reformatea su
propia especificación mientras la ejecuta corrompe la fuente de la que el builder está leyendo.

Se verificó el 2026-08-07 que los ocho archivos Markdown del bundle **no** pasan `prettier --check`
con la configuración del repo (`printWidth: 80`), de modo que la reescritura ocurriría con certeza,
no como posibilidad.

Contenido: `blueprints/` y `graphify-out/`. Nada más — un `.prettierignore` amplio cambiaría el
comportamiento del hook para módulos que este cambio no toca.

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Portón global de aceptación

El módulo está **terminado** cuando todos estos comandos salen 0 sobre un checkout limpio, y no
antes. Es el mismo conjunto que corre el hook de pre-commit (parcialmente) y contra el que se mide
cada paso de §9.

```bash
npm ci                                     # expect: exit 0, sin modificar package-lock.json
npm run typecheck                          # expect: exit 0, cero errores
npm run test                               # expect: exit 0, 0 failed, 0 skipped
npm run build                              # expect: exit 0

# Formato, acotado a los directorios del módulo. NO se usa `npm run lint`: el repo no tiene
# configuración de ESLint y `next lint` abre un prompt interactivo que cuelga un build desatendido.
# Se acota al módulo a propósito: 28 archivos preexistentes del repo no pasan Prettier, y este
# cambio no los toca. `xargs -r` hace que no correr nada salga 0, así que la línea es segura
# aunque un directorio todavía no exista.
git ls-files -z 'lib/finanzas' 'app/api/finanzas' 'app/(admin)/admin/finanzas' \
  | xargs -0 -r npx prettier --check       # expect: exit 0 — "All matched files use Prettier code style!"

# El guardia, por separado y de forma explícita: es la propiedad que define este módulo
npx vitest run lib/finanzas/routes.test.ts # expect: exit 0 — ninguna ruta de Finanzas sin portero
! grep -rq "hasModuleAccess" app/api/finanzas/
                                           # expect: exit 0 — ningún portero con bypass de ADMIN en Finanzas
! grep -rqE "parseFloat|toFixed" lib/finanzas/
                                           # expect: exit 0 — cero punto flotante en la capa de dinero
! grep -rq "@/lib" lib/finanzas/
                                           # expect: exit 0 — imports relativos, que es lo que Vitest resuelve
```

**Cada expectativa de arriba es una propiedad, no un recuento.** No hay un solo `grep -c` contra un
número: se comprueba que cada modelo de §4 exista, que cada ruta tenga portero, que el conjunto de
tests salga en 0 fallidos. Un portón que cuenta se rompe la próxima vez que alguien agrega una fila.

**Cada línea sale 0 cuando el build está correcto.** Las cuatro que comprueban una ausencia van con
`!` sobre un `grep`, cuyo único modo de fallo distinto de "hubo coincidencia" sería un directorio
inexistente — y los cuatro directorios existen desde el paso 10. Ninguna línea de este portón trata
"salió distinto de cero" como condición de éxito.

Más estos portones manuales, revisados una vez antes de poner el módulo en manos de las usuarias:

- [ ] Cada paso de §9 tiene su etiqueta de checkpoint en git: `git tag -l 'step-*'` lista una por
      paso, de `step-01-schema-finanzas` a `step-20-cierre-finanzas`. El repositorio donde viven esas
      etiquetas ya existía; el Bootstrap de §10 sólo lo comprueba de forma idempotente.
- [ ] Cada archivo de la tabla *Archivos que deben quedar commiteados* de §10 está presente en un
      checkout limpio y **no** lo captura ninguna regla de ignore. Una invocación por ruta, para que
      un fallo sea del archivo y no del comando:

      ```bash
      git ls-files --error-unmatch prisma/schema.prisma;                  test $? -eq 0
      git ls-files --error-unmatch VARIABLES_ENTORNO.md;                  test $? -eq 0
      git ls-files --error-unmatch CLAUDE.md;                             test $? -eq 0
      git ls-files --error-unmatch AGENTS.md;                             test $? -eq 0
      git ls-files --error-unmatch .claude/settings.json;                 test $? -eq 0
      git ls-files --error-unmatch .claude/rules/finanzas.md;             test $? -eq 0
      git ls-files --error-unmatch .claude/skills/verificar-porteros/SKILL.md; test $? -eq 0
      git check-ignore -q .claude/settings.json;                          test $? -eq 1   # 1 = NO ignorado
      git check-ignore -q AGENTS.md;                                      test $? -eq 1   # 1 = NO ignorado
      git check-ignore -q VARIABLES_ENTORNO.md;                           test $? -eq 1   # 1 = NO ignorado
      git check-ignore -q backups/pre-finanzas.sql;                       test $? -eq 0   # 0 = SÍ ignorado, como debe ser
      ```

      Cada línea afirma el **código exacto**: `1` significa "ninguna regla de ignore lo captura" y `0`
      significa "sí lo captura". Un `128` por error de uso —que es lo que devuelve `git check-ignore
      -q` si se le pasan dos rutas— hace fallar la línea en vez de satisfacerla.
- [ ] El archivo de ignore estuvo en su lugar antes del primer commit del cambio: `backups/` se
      agrega en el Bootstrap de §10, **antes** de su `git add -A`, y ningún paso de §9 crea ni edita
      `.gitignore`. Una vez que git rastrea una ruta, ninguna regla posterior la excluye.
- [ ] Cada fila de la tabla *Byte-exact artifact reconciliation* de §19.6 dice `Ambos confirmados:
      sí`. Son dos, y ninguna depende de una cadena producida por el runtime.
- [ ] El bloque Bootstrap de §10 se re-ejecutó una vez sobre un árbol ya preparado, **salió 0**, y no
      cambió nada que importara: `package.json` sigue listando `zod` en `4.4.3`, `CLAUDE.md` sigue
      teniendo un solo `FINANZAS:INICIO`, y `FINANZAS_ENCRYPTION_KEY` en `.env.local` **sigue siendo
      la misma de antes** — que es la propiedad más importante de las tres, porque rotarla en
      silencio dejaría ilegible todo lo cifrado.
- [ ] Cada fila de la tabla *Cross-artifact value reconciliation* de §19.6 dice `Comparado: sí`, y los
      portones de arriba se corrieron desde la raíz del proyecto **con el bundle presente** en
      `blueprints/modulo-finanzas/`.
- [ ] `npm audit` corrido después de instalar zod, sin vulnerabilidades altas o críticas nuevas.
- [ ] **Permisos otorgados a mano, una vez:** Marcela con `role: FINANZAS` y `FINANZAS` en
      `moduleAccess`; Elizabeth con su rol actual más `FINANZAS_LECTURA`. Desde `/admin/usuarios` o
      `npm run db:studio`. No es un paso de build porque toca datos reales de producción.
- [ ] **Las tres variables nuevas configuradas en Vercel** (`FINANZAS_ENCRYPTION_KEY`,
      `FINANZAS_ENCRYPTION_KEY_PREVIOUS` vacía, `FINANZAS_NOTIFY_EMAILS`), y comprobadas generando
      una nómina de pago de prueba en Preview: si la clave falta, la respuesta es `500` con el mensaje
      nombrado.
- [ ] **`FINANZAS_ENCRYPTION_KEY` respaldada en un gestor de contraseñas fuera del computador que la
      generó**, antes de cifrar la primera cuenta bancaria real. Es la única pérdida irreversible del
      módulo.
- [ ] **La restauración del respaldo probada una vez**, sobre una base desechable, con
      `backups/pre-finanzas.sql`. Un respaldo que nunca se restauró no es un respaldo.
- [ ] **Prueba con la cuenta de Elizabeth**: entra a las nueve pantallas, no ve ningún botón de
      escritura, y un `fetch` manual a `POST /api/finanzas/transacciones` desde su sesión devuelve
      `403`.
- [ ] **Prueba con un ADMIN sin grant**: no ve el link de Finanzas en el sidebar, `/admin/finanzas` lo
      rebota a `/login`, y `/api/finanzas/empleados` le devuelve `403` en JSON.
- [ ] **Prueba del aviso por correo**: otorgar y quitar `FINANZAS_LECTURA` a una cuenta de prueba
      genera una fila `CAMBIAR_PERMISOS` visible en el visor de auditoría **y** un correo a las
      direcciones de `FINANZAS_NOTIFY_EMAILS`.
- [ ] **Recuperación de contraseña probada extremo a extremo** con una cuenta de prueba: llega el
      correo, el enlace funciona una vez, el segundo intento con el mismo token devuelve `400`.
- [ ] Cada non-goal de §1 sigue sin construirse. En particular: sin adjuntos, sin integración
      bancaria, sin SII, sin Previred, sin borrado duro.
- [ ] **Los cuatro pases de accesibilidad de §15**: sólo teclado, lector de pantalla sobre la carga de
      movimiento, zoom al 200% en la pantalla de movimientos, y revisión en escala de grises.
- [ ] Un rollback probado una vez a propósito: `git reset --hard step-19-export-csv` y volver.
- [ ] **La marcha blanca de §9.1 iniciada**: doble registro con la planilla durante un mes calendario
      completo. El retiro de la planilla **no** es parte de este build.

**Ninguna advertencia se ignora.** Una advertencia tolerada se vuelve permanente, y la próxima
advertencia real se esconde dentro.

### 20.2 Registro de riesgos

| Riesgo | Probabilidad | Impacto | Señal temprana | Mitigación |
|---|---|---|---|---|
| **Se pierde `FINANZAS_ENCRYPTION_KEY`** y los datos bancarios quedan irrecuperables | Media — es una cadena en un `.env.local` y en un panel de Vercel | Alto, pero acotado: los montos y el historial no están cifrados, así que se pierden las cuentas, no la contabilidad | `descifrar()` lanza `"No se pudo descifrar el valor"` al generar la nómina de pago | Procedimiento de respaldo y rotación en §14, con `FINANZAS_ENCRYPTION_KEY_PREVIOUS` para rotar sin downtime. Portón manual en §20.1 que exige respaldarla **antes** de cifrar la primera cuenta. Plan B real: volver a pedir las cuentas a trabajadores y proveedores |
| **`db push` sobre la base de producción sin respaldo** | Baja si se sigue el paso 1; alta si alguien lo apura | Muy alto — no hay script de reversa | No hay señal previa: se nota cuando ya pasó | El paso 1 **exige y verifica** el respaldo con `test -s backups/pre-finanzas.sql` antes de tocar la base. `--accept-data-loss` está en el `deny` de `settings.json`. El cambio es puramente aditivo, lo que reduce el daño posible |
| **Un ADMIN se auto-asigna el módulo** y lee sueldos | Media — es literalmente un formulario que ya existe | Medio: ve datos de remuneración de la empresa | Fila `CAMBIAR_PERMISOS` en el visor **y correo a Marcela y Elizabeth en el momento** | **Riesgo aceptado explícitamente por el dueño del proyecto** (escenario A, §14). La defensa no es impedirlo, es que quede a la vista. Sube de nivel si crece el número de ADMIN — §20.3 decisión 3 |
| **Una ruta nueva de Finanzas queda sin portero** | Media a lo largo del tiempo, alta si alguien agrega una ruta meses después | Alto: cualquier usuario logueado, chofer incluido, lee o escribe datos financieros | `lib/finanzas/routes.test.ts` falla nombrando el archivo, en el pre-commit | El guardia del paso 10, que corre en cada `npm run test` y por lo tanto en cada commit vía Husky. Más la skill `verificar-porteros`. Más la regla en `rules/finanzas.md`, que se carga sola al tocar el área |
| **Llegan los adjuntos y alguien reusa el patrón `access: 'public'`** de Vercel Blob | Alta — es el patrón que el repo ya usa en `app/api/evidencias/route.ts:77` y `app/api/ordenes/[id]/route.ts:153`, y copiarlo es lo natural | Muy alto: una liquidación de sueldo con URL pública es una filtración de datos personales sin sesión de por medio | Ninguna automática. Aparece cuando alguien encuentra el link | Fila explícita en los Non-Goals de §1, nota en las trampas de `workspace/CLAUDE.md`, y esta fila. `@vercel/blob` 2.4 —ya instalado— soporta almacenamiento privado: la descarga debe ir por ruta autenticada y auditada. **El dueño del proyecto ya avisó que esto probablemente cambie**, así que no es hipotético |
| **El alcance se expande a integración bancaria o SII a mitad del build** | Media — es la pregunta obvia después de ver los primeros movimientos cargados | Alto: cada una es un proyecto propio con certificación y convenios | Alguien pregunta "¿y no puede leer la cartola solo?" | Los Non-Goals de §1 con su gatillo de revisión. Regla: si un paso parece exigir un non-goal, es un defecto del blueprint — detenerse y reportar, no ampliar |
| **La planilla y el sistema divergen durante la marcha blanca** y nadie lo nota hasta cerrar el mes | Media | Alto: es el modo de fallo clásico de un cambio de sistema de registro | Una fila de paridad de §9.1 que no cierra en cero | Doble registro obligatorio por un mes completo, con las cuatro filas de paridad de §9.1 verificadas antes de avanzar de fase. La planilla sigue existiendo y actualizada: volver a ella es abrir un archivo |
| **El repo no tiene configuración de ESLint y nadie lo nota** | Certeza — ya es el estado actual, verificado el 2026-08-07 | Bajo para Finanzas, medio para el repo: `eslint-config-next` está instalado e inerte, y nunca ha corrido un lint sobre Operaciones, CRM ni Inventario | `npm run lint` abre un prompt interactivo en vez de retornar | **Deliberadamente fuera de alcance.** Ningún `Verify` invoca `npm run lint` (§13). Arreglarlo expondría por primera vez errores de lint en tres módulos que este cambio no toca, y cualquiera de ellos bloquearía las compuertas de Finanzas por una razón ajena. Es una tarea propia, después: agregar `.eslintrc.json` con `{"extends":"next/core-web-vitals"}` y arreglar lo que aparezca, módulo por módulo |
| **`lint-staged` reformatea el propio bundle** en cada `Checkpoint` | Certeza sin mitigación — `.lintstagedrc` es `{"*": "prettier --write"}` y los 8 Markdown del bundle no pasan `prettier --check` | Medio: corrompe el documento del que el builder está leyendo, a mitad del build, sin error visible | Ninguna: el commit tiene éxito y el archivo cambia solo | `workspace/.prettierignore` con `blueprints/`, instalado por el Bootstrap antes del primer commit (§19.7). **El orden importa**: si el archivo llega después del primer `Checkpoint`, el daño ya ocurrió |
| **`npm run db:push` se cuelga** por apuntar al pooler | Media — es la trampa conocida y documentada del repo | Bajo: se resuelve cambiando una variable, pero cuesta una tarde si no se sabe | El comando queda colgado sin salida ni error | Las dos líneas de `export` en §10 y en el paso 1, la trampa escrita en `workspace/CLAUDE.md` y en `AGENTS.md`, y la nota de §4 *Migraciones* |

### 20.3 Registro de decisiones

| # | Decisión | Alternativa rechazada | Por qué | Se revierte si |
|---|---|---|---|---|
| 1 | **Se introduce zod aunque el repo valida a mano** | Seguir con validación manual, como hacen las rutas existentes de Operaciones y CRM | Finanzas tiene ~8 entidades con RUT, montos enteros positivos, cuentas bancarias, períodos con formato y siete enums. Validar eso a mano en 27 métodos de ruta es exactamente donde se cuela el error de plata, y un monto mal validado en un módulo de sueldos no es un bug de UI. Un solo paquete, sin dependencias transitivas relevantes | El equipo rechaza mantener dos estilos de validación conviviendo, o zod termina apareciendo en menos de 3 archivos —en cuyo caso no valía la dependencia |
| 2 | **Se mantiene `prisma db push`, no se adoptan migraciones versionadas** | Adoptar Prisma Migrate en este mismo cambio, creando `prisma/migrations/` | Es la convención vigente del repo y este cambio es **puramente aditivo**: enums y modelos nuevos, ninguna columna alterada. Introducir un segundo sistema de esquema mientras se agrega un módulo mezcla dos riesgos distintos, y la primera migración generada tendría que reconciliarse con un esquema que nunca tuvo historial. **Es una recomendación real para después, no para ahora** | Llega el primer cambio destructivo de esquema (renombrar una columna, cambiar un tipo), o entra un segundo desarrollador — momento en que "el estado de la base es lo que diga el último `db push` de alguien" deja de ser sostenible |
| 3 | **Modelo de amenaza (A): trazabilidad, no cifrado contra un ADMIN malicioso** | Cifrado de campo con clave separada por usuario, o segregar Finanzas en otra base con credenciales propias | El equipo son dos personas de confianza en una empresa donde la dueña es una de ellas. Defender contra un ADMIN malicioso significaría sacar el módulo de esta base y de este login, y con eso perder la sesión compartida, el sidebar único y la simplicidad operativa que hacen que la herramienta se use. La defensa proporcionada es que **nada se pueda hacer sin dejar rastro y sin avisar** | Crece el número de cuentas con rol ADMIN, entra personal externo con ese rol, o la empresa contrata un contador externo con acceso al sistema |
| 4 | **`Supplier` es tabla aparte de `Company`** | Reusar `Company` con una bandera `isSupplier` | `Company` es la tabla de **clientes** del CRM. Meter proveedores ahí ensucia todas las listas del pipeline, distorsiona los conteos de deals y choca de frente con la deduplicación pendiente del módulo Outreach, que asume que cada fila de `Company` es un prospecto. Dos conceptos que comparten cuatro campos no son el mismo concepto | Aparecen con frecuencia empresas que son cliente y proveedor a la vez y hay que mantener sus datos de contacto sincronizados a mano en dos lugares |
| 5 | **Todos los montos son `Int` en pesos chilenos** | `Decimal` de Prisma, o `Float` | El CLP no tiene centavos, y `formatCurrency()` del repo ya usa `maximumFractionDigits: 0`. `Int` hace imposible por construcción el error de redondeo en una suma de sueldos, es más barato de indexar y de agregar, y elimina toda la clase de bugs de punto flotante en dinero. `Float` para dinero es directamente un defecto | Entra la UF, moneda extranjera, o cualquier concepto con fracción de peso |
| 6 | **Rate limiting sobre Postgres, no en memoria ni en Redis** | Un `Map` en memoria del proceso; o Upstash/Redis | En Vercel las instancias se reutilizan y se reinician sin aviso: un contador en memoria de proceso no es un límite, es una sugerencia que se resetea sola. Redis sería el instrumento correcto a escala, pero suma un proveedor, un secreto y una factura para contar hasta 5 en una app de dos usuarias. Postgres ya está, ya es transaccional y el volumen es trivial | El volumen crece hasta que el `upsert` del contador aparezca en las consultas lentas, o el módulo pase a tener usuarios externos |
| 7 | **La lógica de seguridad vive en `lib/finanzas/` como funciones puras, en vez de instalar un runner que pueda testear rutas** | Instalar Playwright o Supertest y reescribir `vitest.config.ts` para recoger tests de rutas | `vitest.config.ts` recoge sólo `lib/**/*.test.ts`. Cambiar eso es un proyecto propio: otro runner, binarios de navegador en el build, un tipo de portón que ningún otro módulo del repo tiene. Hacerlo **dentro** del cambio que agrega finanzas mezcla dos cosas que fallan por razones distintas. La arquitectura resultante es además mejor: dependencias por parámetro, módulos puros, tests que corren en milisegundos sin base de datos | El repo adopta E2E para toda la aplicación, en un cambio dedicado. Ahí Finanzas es el primer candidato a cubrirse — §20.4 |
| 8 | **Se reusa `sendMail()` de `lib/outreach/smtp.ts` en vez de un proveedor transaccional** | Resend, SendGrid o similar para los correos de recuperación y de aviso | Ya existe, ya está probado (`lib/outreach/smtp.test.ts`), ya tiene sus variables documentadas y ya está pagado. Son unos pocos correos al mes, no una campaña. Sumar un proveedor para eso contradice el criterio de costo incremental cero de §16 | Los correos de recuperación empiezan a caer en spam, o el buzón de Hostinger topa su cuota — ninguna de las dos es plausible al volumen actual |

### 20.4 Qué construir después

En orden, cada uno con el gatillo que lo activa, tomado de la tabla de Non-Goals de §1.

1. **Adjuntos con almacenamiento privado** — liquidaciones, facturas y comprobantes en
   `@vercel/blob` **privado**, con descarga por ruta autenticada y auditada. *Gatillo: el dueño del
   proyecto ya avisó que esto probablemente cambie, así que es el primero de la lista.* La condición
   previa es no reusar el patrón `access: 'public'` que el repo tiene hoy en evidencias y órdenes; es
   la fila más peligrosa del registro de riesgos.
2. **Migraciones versionadas con Prisma Migrate** — para todo el repo, no sólo para Finanzas.
   *Gatillo: el primer cambio destructivo de esquema, o la entrada de un segundo desarrollador.*
   Es la recomendación que §20.3 decisión 2 deja explícitamente fuera de este cambio.
3. **E2E para toda la aplicación** — un runner, una configuración, y Finanzas como primer módulo
   cubierto. *Gatillo: que el equipo decida invertir en ello como proyecto propio.* Hoy la ausencia
   está compensada con funciones puras probadas y el guardia estructural, pero eso cubre la lógica,
   no el flujo.
4. **Conciliación bancaria** — cargar la cartola y cruzarla contra los movimientos.
   *Gatillo: tres meses seguidos de movimientos cargados a mano y el cuadre manual pasando de 2
   horas al mes.* Es el primer paso hacia la integración bancaria, y el que da valor sin convenio.
5. **Exportación en formato SII / Previred** — a partir de los datos que el módulo ya tiene.
   *Gatillo: que el contador externo pida los datos en ese formato más de una vez por trimestre, o
   que la nómina del sistema cuadre con Previred tres meses seguidos.*

---

*Fin del blueprint. El orden de construcción es §9. Detente cuando §20.1 esté en verde.*
