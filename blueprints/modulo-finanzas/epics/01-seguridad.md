# Epic 01: Seguridad y fundaciones

> Después de este epic existen el esquema de datos de Finanzas, los dos porteros sin bypass de ADMIN,
> la auditoría transaccional, el cifrado de cuentas bancarias, la validación de entrada, el punto
> único de salida, el rate limiting, la recuperación de contraseña por enlace y el guardia que
> impide que una ruta de Finanzas quede sin portero. Ni una sola pantalla — a propósito.

| | |
|---|---|
| **Epic id** | `01-seguridad` |
| **Tareas** | `E1-T1` … `E1-T10` |
| **Depende de** | nada — empieza aquí |
| **Desbloquea** | `02-datos-maestros`, `03-movimientos`, `04-nominas`, `05-reportes-cierre` |
| **Paralelo con** | ninguno |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo se repite aquí a
propósito.

---

## Stack

Next.js 14 (App Router) · TypeScript 5 · Tailwind 3 · PostgreSQL · Prisma 5 · NextAuth v4 · Vercel.
Gestor de paquetes: `npm`. **Las versiones están en `package-lock.json` — léelo, nunca las adivines.**
La única dependencia nueva de todo el proyecto es `zod` en `4.4.3` exacto, y la instala `E1-T6`.

| Tarea | Comando |
|---|---|
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Tests (todo) | `npm run test` |
| Test de un archivo | `npx vitest run lib/finanzas/crypto.test.ts` |
| Build | `npm run build` |
| Esquema a la BD | `npm run db:push` |
| Inspeccionar la BD | `npm run db:studio` |

**Portón:** `npm run typecheck && npm run test` pasa antes de marcar cualquier tarea
de este epic como hecha.

**El CLI de Prisma no lee `.env.local`.** Antes de cualquier comando `prisma`, en el mismo shell:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

**Ninguna tarea de este epic necesita un servicio corriendo.** No hay base de datos de prueba, no hay
docker-compose y no hay que levantar nada: los tests son de funciones puras que reciben sus
dependencias por parámetro. La única tarea que toca una base real es `E1-T1`, contra la base del
proyecto, y exige respaldo verificado antes.

## Subárbol de directorios

Sólo lo que este epic toca:

```
prisma/
  schema.prisma          # EDITAR — 7 enums, 10 modelos, relaciones inversas en User
tsconfig.json            # EDITAR — agregar "blueprints" a exclude
package.json             # EDITAR — zod 4.4.3 exacto (E1-T6)
middleware.ts            # EDITAR — dos ramas nuevas, en orden (E1-T3)
VARIABLES_ENTORNO.md     # EDITAR — tres variables nuevas (E1-T5)
lib/
  access.ts              # EDITAR — hasFinanceAccess(), canWriteFinance(). NO tocar hasModuleAccess()
  access.test.ts         # EDITAR — AMPLIAR, nunca reemplazar. Los 4 tests actuales quedan
  auth.ts                # EDITAR — rate limit dentro de authorize() (E1-T8)
  utils.ts               # existe, sólo lectura: apiError(), formatCurrency(), cn()
  outreach/smtp.ts       # existe, sólo lectura: sendMail() se reusa en E1-T9
  finanzas/              # NUEVO — todo lo de este epic vive aquí
    audit.ts       audit.test.ts        # E1-T4
    crypto.ts      crypto.test.ts       # E1-T5
    rut.ts         rut.test.ts          # E1-T6
    schemas.ts     schemas.test.ts      # E1-T6
    serialize.ts   serialize.test.ts    # E1-T7
    rate-limit.ts  rate-limit.test.ts   # E1-T8
    reset.ts       reset.test.ts        # E1-T9
    routes.ts      routes.test.ts       # E1-T10
app/api/
  auth/recuperar/route.ts               # NUEVO — E1-T9
  auth/recuperar/confirmar/route.ts     # NUEVO — E1-T9
  usuarios/route.ts                     # EDITAR — E1-T9
```

Todo lo que esté fuera de este subárbol está fuera de alcance. Si una tarea parece exigir editar un
archivo que no está en esta lista, detente y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic agrega o lee | Notas |
|---|---|---|
| `Employee` | todos — se crea el modelo | `rut @unique`, `baseSalary Int`, `bankAccountEnc` cifrado, `userId String? @unique` |
| `Supplier` | todos | `bankAccountEnc` cifrado, `isActive` para baja lógica |
| `FinanceCategory` | todos | `@@unique([name, kind])` |
| `FinanceTransaction` | todos | `amount Int`, índices `[kind, date]`, `date`, `supplierId` |
| `Advance` | todos | `@@index([employeeId, status])` |
| `PayrollRun` | todos | `period String @unique` con formato `"2026-08"` |
| `PayrollItem` | todos | `@@unique([payrollRunId, employeeId])` |
| `FinanceAuditLog` | todos | **Append-only.** `actorEmail` y `actorRole` desnormalizados, sin FK a `User` |
| `RateLimitCounter` | todos | `key @unique`, ventana fija |
| `PasswordResetToken` | todos | `tokenHash @unique` — el token en claro sólo viaja en el correo |
| `User` | **sólo relaciones inversas nuevas** | Ningún campo existente cambia de tipo, nombre ni nulabilidad |
| `UserRole` | gana `FINANZAS` | Ningún valor se renombra ni se borra |
| `ModuleAccess` | gana `FINANZAS` y `FINANZAS_LECTURA` | Ningún valor se renombra ni se borra |

## Contratos

**Consumidos** — ya existen en el repo, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `lib/utils.ts` | `apiError(message, status = 400)` | Devuelve `NextResponse.json({ error: message }, { status })`. **No cambies su forma** |
| `lib/utils.ts` | `formatCurrency(value)` | `Intl.NumberFormat` con `es-CL`, `CLP`, `maximumFractionDigits: 0`. **Ningún test compara su salida literal** |
| `lib/access.ts` | `hasModuleAccess(user, module)` | Con bypass de ADMIN. **Congelada**: tres módulos productivos dependen de ella |
| `lib/auth.ts` | `authOptions`, `getServerSession(authOptions)` | Sesión con `user.{id, role, moduleAccess}` |
| `lib/db.ts` | `prisma` | Cliente Prisma. **Los módulos de `lib/finanzas/` no lo importan**: lo reciben por parámetro |
| `lib/outreach/smtp.ts` | `sendMail({ to, subject, html, text })` | Envía por SMTP de Hostinger. Ya probada. Se reusa en `E1-T9` |

**Producidos** — los epics siguientes dependen de estas firmas exactas. Cambiar una los rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `lib/access.ts` → `hasFinanceAccess` | `(user: AuthorizedUser) => boolean` | `02`, `03`, `04`, `05`, `middleware.ts` |
| `lib/access.ts` → `canWriteFinance` | `(user: AuthorizedUser) => boolean` | `02`, `03`, `04`, `05` |
| `lib/finanzas/audit.ts` → `withAudit` | `(tx: ClienteAuditoria, entrada: EntradaAuditoria) => Promise<void>` | `02`, `03`, `04`, `05` |
| `lib/finanzas/audit.ts` → `mutarConAuditoria` | `(tx, mutacion, entrada) => Promise<T>` | `02`, `03`, `04`, `05` |
| `lib/finanzas/crypto.ts` → `cifrar` / `descifrar` / `ultimos4` | `(texto: string) => string` | `02`, `04` |
| `lib/finanzas/rut.ts` → `normalizarRut` / `esRutValido` / `enmascararRut` | `(rut: string) => string \| boolean` | `02` |
| `lib/finanzas/serialize.ts` → `serializeEmployee` / `serializeSupplier` | `(entidad, viewer) => objeto sin campos prohibidos` | `02`, `04` |
| `lib/finanzas/rate-limit.ts` → `checkRateLimit` | `(contador, key, limit, windowMs, ahora?) => Promise<{ ok, retryAfterSec }>` | `05` |
| `lib/finanzas/routes.ts` → `rutasSinPortero` | `(dir: string) => string[]` | `02`, `03`, `04`, `05` — su test corre en cada `npm run test` |

## Convenciones que muerden en esta área

- **Nunca uses `hasModuleAccess()` para Finanzas.** Tiene bypass de ADMIN cableado
  (`lib/access.ts:13`) y por eso no sirve aquí. Y **no la modifiques**: Operaciones, CRM e Inventario
  dependen de su comportamiento actual.
- **`lib/finanzas/*` no importa `@prisma/client` ni `@/lib/db` en tiempo de ejecución.** Recibe el
  cliente o la transacción por parámetro, declarando la **forma mínima** que necesita como interfaz
  local. Los tipos van con `import type`, que TypeScript borra al compilar. Esto es lo único que
  permite testear sin base de datos.
- **`lib/finanzas/*` usa imports relativos (`./crypto`, `../access`), nunca `@/`.** `vitest.config.ts`
  no declara alias y Vite no lee `paths` de `tsconfig.json`: un `@/` aquí compila con `tsc` y muere en
  Vitest con `Cannot find module`. Es la combinación de errores más confusa posible, y por eso cinco
  tareas de este epic lo comprueban con `! grep -q "@/lib" ...`.
- **Ningún módulo lee `process.env` al importarse.** Se lee dentro de la función que lo usa. Importar
  `crypto.ts` sin `FINANZAS_ENCRYPTION_KEY` debe funcionar; llamar a `cifrar()` sin ella debe lanzar
  con un mensaje nombrado. Si esto se rompe, `E1-T5` revienta los portones de `E1-T1` a `E1-T4`.
- **El orden en `middleware.ts` es literal.** La rama de `/api/finanzas` va antes del
  `if (pathname.startsWith("/api/"))`, que hace `return NextResponse.next()`; escrita después, nunca
  se evalúa. La de `/admin/finanzas` va antes del fallback de `/admin`, que exige `OPERACIONES`.
- **Una ruta de API responde `403` con JSON, nunca con un redirect.** Un `fetch` que recibe un
  redirect a `/login` obtiene HTML con status 200 y el bug aparece como error de parseo.
- **Todos los montos son `Int` en pesos chilenos.** Nunca `Float`, `Decimal`, `parseFloat` ni
  `toFixed`.
- **Estilo de archivo:** comillas dobles, punto y coma, 2 espacios de indentación — es la
  configuración real de `.prettierrc` del repo. Algunos archivos viejos usan comillas simples: sigue
  el estilo del archivo que edites; el hook de pre-commit corre `prettier --write` sobre lo staged.

Reglas completas del proyecto: `CLAUDE.md`. Reglas del área: `.claude/rules/finanzas.md`. Los dos
están en la raíz del proyecto — el builder los copió desde `workspace/` del bundle antes de la tarea
uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
hacia abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E1-T1` — Esquema de Finanzas y db push con respaldo verificado

**Depende de:** nada · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

Antes de tocar la base, respaldar y **comprobar** el respaldo. Después agregar al schema los 7 enums
nuevos y los 10 modelos nuevos, las 6 relaciones inversas dentro de `User`, y los valores nuevos en
`UserRole` y `ModuleAccess`. El cambio es puramente aditivo: ninguna columna existente cambia de tipo
ni se borra, y por eso `db push` no debería pedir `--accept-data-loss` — si lo pide, algo está mal en
tu edición y hay que revisarla, no forzarla.

Secuencia literal del respaldo, antes de editar nada:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
mkdir -p backups
pg_dump "$DIRECT_URL" > backups/pre-finanzas.sql
cp backups/pre-finanzas.sql "backups/pre-finanzas-$(date +%Y%m%d-%H%M).sql"
```

Si `pg_dump` no está instalado, **detente y reporta**. No sigas sin respaldo: `prisma db push` no
genera script de reversa, así que deshacer esta tarea significa restaurar la base completa.
`backups/` ya está en `.gitignore`.

**Archivos**

- `prisma/schema.prisma` — editar: 7 enums, 10 modelos, 6 relaciones inversas en `User`, 3 valores de
  enum nuevos
- `tsconfig.json` — editar: agregar `"blueprints"` al arreglo `exclude`

**Aceptación**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un
comando de la sección Verify, en esta máquina, durante el build.

1. **CUANDO** `test -s backups/pre-finanzas.sql` corre **EL SISTEMA DEBERÁ** salir 0, probando que el respaldo existe y no está vacío antes de tocar la base.
2. **CUANDO** `npx prisma validate` corre sobre `prisma/schema.prisma` **EL SISTEMA DEBERÁ** salir 0.
3. **CUANDO** se busca cada modelo nuevo en `prisma/schema.prisma` **EL SISTEMA DEBERÁ** encontrar `Employee`, `Supplier`, `FinanceCategory`, `FinanceTransaction`, `Advance`, `PayrollRun`, `PayrollItem`, `FinanceAuditLog`, `RateLimitCounter` y `PasswordResetToken`.
4. **CUANDO** `npm run db:push` corre **EL SISTEMA DEBERÁ** salir 0 sin pedir `--accept-data-loss`.
5. **CUANDO** se lee `tsconfig.json` **EL SISTEMA DEBERÁ** tener `"blueprints"` dentro del arreglo `exclude`.
6. **CUANDO** `npm run typecheck` corre después de `npx prisma generate` **EL SISTEMA DEBERÁ** salir 0.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la
tarea está correcta; que el último salga 0 es lo que la da por hecha.

```bash
test -s backups/pre-finanzas.sql
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"; export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"; npx prisma validate
for m in Employee Supplier FinanceCategory FinanceTransaction Advance PayrollRun PayrollItem FinanceAuditLog RateLimitCounter PasswordResetToken; do grep -q "^model $m " prisma/schema.prisma || exit 1; done
grep -q '^  FINANZAS_LECTURA$' prisma/schema.prisma
node -e "const t=require('./tsconfig.json'); process.exit(t.exclude.includes('blueprints')?0:1)"
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"; export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"; npm run db:push
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"; export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"; npx prisma generate
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: esquema de Finanzas (7 enums, 10 modelos) y db push"
git tag step-01-schema-finanzas
git check-ignore -q backups/pre-finanzas.sql; test $? -eq 0
git ls-files --error-unmatch prisma/schema.prisma
```

### `E1-T2` — Porteros de Finanzas sin bypass de ADMIN

**Depende de:** `E1-T1` · **Prioridad:** p0

Cierra el hallazgo #1 del blueprint: `lib/access.ts:13` tiene el bypass de ADMIN cableado. Agrega
`FinanceModuleKey`, `hasFinanceAccess()` y `canWriteFinance()`, ninguna de las cuales mira
`user.role`. **`hasModuleAccess()` no se toca**: su bypass sigue vigente para OPERACIONES, CRM e
INVENTARIO, y ese comportamiento está congelado. `lib/access.test.ts` ya existe con cuatro tests: se
**amplía**, nunca se reemplaza.

Cubre como mínimo: ADMIN sin grant en ambas funciones, alguien con `FINANZAS` en ambas, alguien con
`FINANZAS_LECTURA` (`true` en lectura, `false` en escritura), un CHOFER sin grant, y un ADMIN que
además tiene `FINANZAS_LECTURA` — que debe recibir `false` en `canWriteFinance`.

**Archivos**

- `lib/access.ts` — editar: dos funciones y un tipo nuevos
- `lib/access.test.ts` — editar: ampliar, conservando los cuatro tests existentes

**Aceptación**

1. **CUANDO** se evalúa `hasFinanceAccess({ role: "ADMIN", moduleAccess: [] })` **EL SISTEMA DEBERÁ** devolver `false`.
2. **CUANDO** se evalúa `canWriteFinance({ role: "ADMIN", moduleAccess: [] })` **EL SISTEMA DEBERÁ** devolver `false`.
3. **CUANDO** se evalúa `canWriteFinance` sobre un usuario con `moduleAccess: ["FINANZAS_LECTURA"]` **EL SISTEMA DEBERÁ** devolver `false` mientras `hasFinanceAccess` devuelve `true`.
4. **CUANDO** se evalúa `hasModuleAccess({ role: "ADMIN", moduleAccess: [] }, "CRM")` **EL SISTEMA DEBERÁ** seguir devolviendo `true`, porque el bypass de los otros tres módulos no se toca.
5. **CUANDO** `npx vitest run lib/access.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/access.test.ts
grep -q 'user.role === "ADMIN"' lib/access.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: hasFinanceAccess y canWriteFinance sin bypass de ADMIN"
git tag step-02-porteros-acceso
```

### `E1-T3` — Ramas de middleware para Finanzas, en el orden correcto

**Depende de:** `E1-T2` · **Prioridad:** p0

Cierra la primera mitad del hallazgo #3: hoy las rutas `/api/*` sólo se validan por presencia de
token. Agrega dos ramas. La de `/api/finanzas` va **antes** del `if (pathname.startsWith("/api/"))`
existente, que hace `return NextResponse.next()` — escrita después, no se evalúa nunca. La de
`/admin/finanzas` va **antes** del fallback genérico de `/admin`, que exige `OPERACIONES` y por lo
tanto rebotaría a la usuaria de Finanzas.

Importa `hasFinanceAccess` desde `@/lib/access`, junto al `hasModuleAccess` que ya se importa. El
`matcher` de `config` **no cambia**: `/admin/:path*` y `/api/((?!auth|posiciones|webhooks).*)` ya
cubren las dos superficies. La rama de API responde `NextResponse.json({ error: "Acceso denegado" },
{ status: 403 })`, nunca un redirect.

**Archivos**

- `middleware.ts` — editar: dos ramas nuevas, respetando el comentario "El orden importa"

**Aceptación**

1. **CUANDO** se lee `middleware.ts` **EL SISTEMA DEBERÁ** contener una rama que evalúa `pathname.startsWith("/api/finanzas")`.
2. **CUANDO** se comparan las posiciones de las ramas en `middleware.ts` **EL SISTEMA DEBERÁ** tener la rama de `/api/finanzas` en una línea anterior a la rama genérica de `/api/`.
3. **CUANDO** se comparan las posiciones de las ramas en `middleware.ts` **EL SISTEMA DEBERÁ** tener la rama de `/admin/finanzas` en una línea anterior a la rama genérica de `/admin`.
4. **CUANDO** se lee la rama de `/api/finanzas` **EL SISTEMA DEBERÁ** responder con `NextResponse.json` y status `403`, y no con `NextResponse.redirect`.
5. **CUANDO** `npm run typecheck` y `npm run test` corren **EL SISTEMA DEBERÁ** salir 0 en ambos.

**Verify**

```bash
grep -q 'pathname.startsWith("/api/finanzas")' middleware.ts
grep -q 'pathname.startsWith("/admin/finanzas")' middleware.ts
test "$(grep -n '"/api/finanzas"' middleware.ts | head -1 | cut -d: -f1)" -lt "$(grep -n 'startsWith("/api/")' middleware.ts | head -1 | cut -d: -f1)"
test "$(grep -n '"/admin/finanzas"' middleware.ts | head -1 | cut -d: -f1)" -lt "$(grep -n 'startsWith("/admin")' middleware.ts | head -1 | cut -d: -f1)"
grep -A4 'pathname.startsWith("/api/finanzas")' middleware.ts | grep -q 'NextResponse.json'
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: ramas de middleware para /admin/finanzas y /api/finanzas"
git tag step-03-middleware-finanzas
```

### `E1-T4` — Auditoría transaccional withAudit()

**Depende de:** `E1-T1`, `E1-T2` · **Prioridad:** p0

Cierra el hallazgo #2: no existe tabla de auditoría en todo el schema. `withAudit(tx, entrada)`
escribe la fila; `mutarConAuditoria(tx, mutacion, entrada)` corre la mutación y luego la auditoría
**dentro del mismo `tx`**, de modo que si la auditoría lanza, la promesa se rechaza y el
`prisma.$transaction` que la envuelve aborta.

`ClienteAuditoria` es la forma mínima que el módulo necesita —
`{ financeAuditLog: { create(args: { data: EntradaAuditoria }): Promise<unknown> } }` — no el tipo de
Prisma. Así el test pasa un doble en memoria y el módulo nunca importa `@prisma/client` en tiempo de
ejecución. `withAudit` **redacta**: si `before` o `after` traen `bankAccountEnc` o `password`, los
reemplaza por `"[redactado]"` antes de escribir. No confíes en que el llamador se acuerde.

**Archivos**

- `lib/finanzas/audit.ts` — nuevo
- `lib/finanzas/audit.test.ts` — nuevo: doble de `tx` en memoria, sin base de datos

**Aceptación**

1. **CUANDO** `withAudit` recibe una entrada válida **EL SISTEMA DEBERÁ** llamar exactamente una vez a `tx.financeAuditLog.create` con `actorEmail`, `actorRole`, `action` y `entityType` presentes.
2. **CUANDO** `before` o `after` contienen las claves `bankAccountEnc` o `password` **EL SISTEMA DEBERÁ** escribir el literal `"[redactado]"` en su lugar y nunca el valor original.
3. **CUANDO** `mutarConAuditoria` corre una mutación cuya escritura de auditoría lanza **EL SISTEMA DEBERÁ** rechazar la promesa, para que el `prisma.$transaction` que la envuelve aborte.
4. **CUANDO** `withAudit` recibe una entrada con `actorEmail` vacío **EL SISTEMA DEBERÁ** lanzar y no llamar a `create`.
5. **CUANDO** `npx vitest run lib/finanzas/audit.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/audit.test.ts
! grep -q 'from "@prisma/client"' lib/finanzas/audit.ts
! grep -q '@/lib' lib/finanzas/audit.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: auditoria transaccional withAudit()"
git tag step-04-auditoria
```

### `E1-T5` — Cifrado AES-256-GCM con rotación de clave

**Depende de:** `E1-T1` · **Prioridad:** p0

Sólo `node:crypto`, sin dependencias. `cifrar()` genera un IV de 12 bytes, cifra con `aes-256-gcm` y
devuelve exactamente `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>`. El prefijo de versión es
lo que permite cambiar de algoritmo después sin adivinar el formato de lo ya guardado.
`descifrar()` prueba con `FINANZAS_ENCRYPTION_KEY` y, si falla, reintenta con
`FINANZAS_ENCRYPTION_KEY_PREVIOUS` — así una rotación no deja ilegible lo viejo. `ultimos4()` extrae
los últimos 4 caracteres para `bankAccountLast4`.

**Las variables se leen dentro de las funciones, nunca al importar el módulo.** Importar `crypto.ts`
sin clave debe funcionar; cifrar sin clave debe lanzar `"Falta la variable de entorno
FINANZAS_ENCRYPTION_KEY"`. Si esto se rompe, esta tarea revienta los portones de `E1-T1` a `E1-T4`.
El test fija sus propias variables en `beforeEach`; no depende de `.env.local` ni de ningún cargador.

Documenta las tres variables nuevas en `VARIABLES_ENTORNO.md`, incluida la advertencia de que perder
la clave hace irrecuperables los datos bancarios.

**Archivos**

- `lib/finanzas/crypto.ts` — nuevo
- `lib/finanzas/crypto.test.ts` — nuevo
- `VARIABLES_ENTORNO.md` — editar: `FINANZAS_ENCRYPTION_KEY`, `FINANZAS_ENCRYPTION_KEY_PREVIOUS`,
  `FINANZAS_NOTIFY_EMAILS`

**Aceptación**

1. **CUANDO** se cifra un texto y se descifra el resultado **EL SISTEMA DEBERÁ** devolver el texto original idéntico.
2. **CUANDO** se cifra el mismo texto dos veces **EL SISTEMA DEBERÁ** producir dos cadenas distintas, porque el IV es aleatorio por llamada.
3. **CUANDO** se inspecciona el valor cifrado **EL SISTEMA DEBERÁ** empezar con `v1:` y tener exactamente cuatro segmentos separados por `:`.
4. **CUANDO** un valor cifrado con la clave anterior se descifra con `FINANZAS_ENCRYPTION_KEY` nueva y `FINANZAS_ENCRYPTION_KEY_PREVIOUS` vieja **EL SISTEMA DEBERÁ** devolver el texto original.
5. **CUANDO** se altera un solo carácter del ciphertext **EL SISTEMA DEBERÁ** lanzar y nunca devolver texto parcial, porque GCM autentica.
6. **CUANDO** se importa `lib/finanzas/crypto.ts` sin `FINANZAS_ENCRYPTION_KEY` definida **EL SISTEMA DEBERÁ** importar sin error y lanzar sólo al llamar a `cifrar`.

**Verify**

```bash
npx vitest run lib/finanzas/crypto.test.ts
grep -q 'FINANZAS_ENCRYPTION_KEY' VARIABLES_ENTORNO.md
grep -q 'FINANZAS_ENCRYPTION_KEY_PREVIOUS' VARIABLES_ENTORNO.md
! grep -q '@/lib' lib/finanzas/crypto.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: cifrado AES-256-GCM con rotacion de clave"
git tag step-05-cifrado
```

### `E1-T6` — Validación de RUT chileno y esquemas zod

**Depende de:** `E1-T1` · **Prioridad:** p0

Instala la única dependencia nueva de todo el proyecto:

```bash
npm install --save-exact zod@4.4.3
```

`--save-exact` a propósito: la tabla de dependencias del blueprint pina `4.4.3`, y un `^4.4.3` haría
que esa tabla mienta en la siguiente instalación limpia.

`rut.ts` implementa el módulo 11 con serie 2-3-4-5-6-7: `normalizarRut` (quita puntos y espacios,
mayúscula la K, deja `12345678-9`), `digitoVerificador`, `esRutValido`, `formatearRut` (con puntos,
para mostrar) y `enmascararRut` que devuelve `12.345.***-*`.

`schemas.ts` define los esquemas zod de entrada de cada ruta: empleado, proveedor, categoría,
transacción, anticipo, nómina y filtros de listado. Montos: `z.number().int().positive()` — entero,
positivo, sin decimales. Fechas: `z.coerce.date()`. Enums: `z.enum([...])` con los valores del
schema Prisma.

**Archivos**

- `package.json` — editar: `zod` en `4.4.3` exacto
- `lib/finanzas/rut.ts` — nuevo
- `lib/finanzas/rut.test.ts` — nuevo
- `lib/finanzas/schemas.ts` — nuevo
- `lib/finanzas/schemas.test.ts` — nuevo

**Aceptación**

1. **CUANDO** `esRutValido` recibe un RUT con dígito verificador correcto **EL SISTEMA DEBERÁ** devolver `true`, y `false` si el dígito no corresponde.
2. **CUANDO** `normalizarRut` recibe `"12.345.678-9"` o `"123456789"` **EL SISTEMA DEBERÁ** devolver `"12345678-9"` en ambos casos.
3. **CUANDO** `enmascararRut` recibe `"12345678-9"` **EL SISTEMA DEBERÁ** devolver exactamente `"12.345.***-*"`.
4. **CUANDO** un esquema de monto recibe `1500.5` o `-100` o `0` **EL SISTEMA DEBERÁ** rechazarlo, porque todo monto es entero positivo en pesos.
5. **CUANDO** se lee `package.json` **EL SISTEMA DEBERÁ** tener `zod` en `dependencies` con el valor exacto `4.4.3`, sin rango.
6. **CUANDO** `npx vitest run lib/finanzas/rut.test.ts` y `npx vitest run lib/finanzas/schemas.test.ts` corren **EL SISTEMA DEBERÁ** salir 0 en ambos.

**Verify**

```bash
node -e "process.exit(require('./package.json').dependencies.zod === '4.4.3' ? 0 : 1)"
npx vitest run lib/finanzas/rut.test.ts
npx vitest run lib/finanzas/schemas.test.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T6: validacion de RUT chileno y esquemas zod"
git tag step-06-validacion-zod-rut
```

### `E1-T7` — Serialización con enmascarado por rol

**Depende de:** `E1-T2`, `E1-T5`, `E1-T6` · **Prioridad:** p0

El punto único de salida del módulo: ninguna ruta de Finanzas devuelve una entidad sin pasar por
aquí. `serializeEmployee(employee, viewer)` decide qué campos salen según `canWriteFinance(viewer)`.
Sin escritura: RUT enmascarado con `enmascararRut()`, sin `bankName` ni `bankAccountType`, pero **sí**
`bankAccountLast4` — cuatro dígitos no identifican una cuenta. Con escritura: RUT completo,
`bankAccountLast4`, `bankName` y `bankAccountType`.

**En ningún caso, con ningún rol, sale `bankAccountEnc`.** El valor cifrado no tiene por qué viajar
al navegador de nadie: el único lugar donde una cuenta sale del servidor es la ruta de nómina de pago
del epic 04, ya descifrada y auditada.

`serializeSupplier` sigue la misma lógica. Los tipos de entrada se declaran como interfaces
estructurales locales; si hace falta un tipo de Prisma, con `import type`.

**Archivos**

- `lib/finanzas/serialize.ts` — nuevo
- `lib/finanzas/serialize.test.ts` — nuevo: un caso por rol (`FINANZAS`, `FINANZAS_LECTURA`, ADMIN
  sin grant, usuario sin módulos)

**Aceptación**

1. **CUANDO** `serializeEmployee` recibe un viewer con `moduleAccess: ["FINANZAS_LECTURA"]` **EL SISTEMA DEBERÁ** devolver el RUT enmascarado como `"12.345.***-*"` y omitir `bankName` y `bankAccountType`.
2. **CUANDO** `serializeEmployee` recibe un viewer con `moduleAccess: ["FINANZAS"]` **EL SISTEMA DEBERÁ** devolver el RUT completo y `bankAccountLast4`.
3. **CUANDO** `serializeEmployee` corre con cualquier viewer **EL SISTEMA DEBERÁ** omitir siempre la propiedad `bankAccountEnc` del objeto devuelto.
4. **CUANDO** `serializeSupplier` recibe un viewer con `moduleAccess: ["FINANZAS_LECTURA"]` **EL SISTEMA DEBERÁ** omitir `bankName` y devolver sólo `bankAccountLast4`.
5. **CUANDO** `npx vitest run lib/finanzas/serialize.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/serialize.test.ts
! grep -q '@/lib' lib/finanzas/serialize.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T7: serializacion con enmascarado por rol"
git tag step-07-serializacion
```

### `E1-T8` — Rate limiting sobre Postgres y bloqueo de login

**Depende de:** `E1-T1` · **Prioridad:** p0

`checkRateLimit(contador, key, limit, windowMs, ahora?)` sobre el modelo `RateLimitCounter`. Ventana
**fija**: si `ahora - windowStart >= windowMs`, reinicia `count = 1` y `windowStart = ahora`; si no,
incrementa. Devuelve `ok: false` cuando el contador supera `limit`, con `retryAfterSec` igual a los
segundos que faltan para que la ventana expire. El parámetro `ahora` existe exactamente para poder
testear el cruce de ventana sin esperar 15 minutos.

`ClienteContador` es la forma mínima sobre `RateLimitCounter` (`findUnique`, `upsert`, `update`), no
el tipo de Prisma — mismo motivo que en `E1-T4`.

Después, en `lib/auth.ts`, dentro de `authorize()` y **antes** del `compare` de bcrypt:
`checkRateLimit(prisma, "login:" + email, 5, 15 * 60 * 1000)`. Si `ok` es `false`, devuelve `null`
sin consultar el hash. En un login fallido incrementa; en uno exitoso reinicia el contador de esa
clave. El usuario ve el mismo mensaje de credenciales inválidas — decirle que está bloqueado
confirmaría que el correo existe.

Se elige Postgres y no memoria porque en Vercel las instancias se reutilizan y reinician: un contador
en memoria de proceso no es un límite. Se elige Postgres y no Redis para no sumar un proveedor.

**Archivos**

- `lib/finanzas/rate-limit.ts` — nuevo
- `lib/finanzas/rate-limit.test.ts` — nuevo
- `lib/auth.ts` — editar: bloqueo dentro de `authorize()`

**Aceptación**

1. **CUANDO** se llama `checkRateLimit` con `limit: 5` cinco veces dentro de la ventana **EL SISTEMA DEBERÁ** devolver `ok: true` en las cinco.
2. **CUANDO** se llama una sexta vez dentro de la misma ventana **EL SISTEMA DEBERÁ** devolver `ok: false` con `retryAfterSec` mayor que 0.
3. **CUANDO** se llama después de que la ventana expiró **EL SISTEMA DEBERÁ** devolver `ok: true` y reiniciar el contador a 1.
4. **CUANDO** `authorize()` recibe un intento con una clave de login ya bloqueada **EL SISTEMA DEBERÁ** devolver `null` sin invocar `compare` de bcrypt.
5. **CUANDO** `npx vitest run lib/finanzas/rate-limit.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/rate-limit.test.ts
grep -q 'checkRateLimit' lib/auth.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T8: rate limiting sobre Postgres y bloqueo de login"
git tag step-08-rate-limit
```

### `E1-T9` — Recuperación por enlace y bloqueo del reset por ADMIN

**Depende de:** `E1-T4`, `E1-T8` · **Prioridad:** p0

Cierra el hallazgo #4: hoy `app/api/usuarios/route.ts:139-143` deja al ADMIN fijar la contraseña de
cualquier usuario sin avisarle a nadie. Es la puerta trasera que invalidaría todo el modelo de
amenaza del módulo.

`reset.ts` es puro y testeable: `generarToken()` (32 bytes aleatorios en hex), `hashToken()`
(SHA-256 en hex), `esTokenUtilizable(fila, ahora)` que devuelve `false` si `usedAt` no es null o si
`expiresAt <= ahora`, y `armarEnlace(baseUrl, token)`.

`POST /api/auth/recuperar` responde **siempre 200** con el mismo cuerpo, exista o no la cuenta — no
se filtra qué correos están registrados. Si existe y está activa: guarda el hash con 30 minutos de
vigencia y manda el enlace con `sendMail()`. Rate limit 3/hora por cuenta; al excederlo responde
igual 200 pero no emite token ni correo, y audita.

`POST /api/auth/recuperar/confirmar` busca por hash y rechaza con `400` y **el mismo mensaje**
`"Enlace inválido o expirado"` en los tres casos de fallo — distinguirlos le regala al atacante saber
si un token existió. Dentro de un `prisma.$transaction`: fija `usedAt`, actualiza `User.password`
(bcrypt costo 12, mínimo 8 caracteres) y audita.

En `app/api/usuarios/route.ts`, tres cambios: `VALID_MODULES` suma `FINANZAS` y `FINANZAS_LECTURA`;
las dos listas de roles válidos suman `FINANZAS`; y el `PATCH` responde `403` con `"No puedes fijar
la contraseña de una cuenta de Finanzas. Usa el enlace de recuperación."` si trae `password` sobre
una cuenta con módulos de Finanzas. Además, cambiar `moduleAccess` de Finanzas audita
`CAMBIAR_PERMISOS` y, tras confirmar la transacción, dispara correo a `FINANZAS_NOTIFY_EMAILS`. Eso
no lo hace imposible: lo hace imposible de ocultar.

**Archivos**

- `lib/finanzas/reset.ts` — nuevo
- `lib/finanzas/reset.test.ts` — nuevo
- `app/api/auth/recuperar/route.ts` — nuevo
- `app/api/auth/recuperar/confirmar/route.ts` — nuevo
- `app/api/usuarios/route.ts` — editar

**Aceptación**

1. **CUANDO** `esTokenUtilizable` recibe una fila con `usedAt` no nulo **EL SISTEMA DEBERÁ** devolver `false` aunque `expiresAt` esté en el futuro.
2. **CUANDO** `esTokenUtilizable` recibe una fila cuyo `expiresAt` ya pasó **EL SISTEMA DEBERÁ** devolver `false`.
3. **CUANDO** `hashToken` recibe el mismo token dos veces **EL SISTEMA DEBERÁ** devolver el mismo hash, y uno distinto para un token distinto.
4. **CUANDO** se lee `app/api/usuarios/route.ts` **EL SISTEMA DEBERÁ** tener `FINANZAS` y `FINANZAS_LECTURA` en `VALID_MODULES` y `FINANZAS` en las listas de roles válidos.
5. **CUANDO** un `PATCH /api/usuarios` trae `password` sobre una cuenta con módulos de Finanzas **EL SISTEMA DEBERÁ** responder `403` y no escribir ningún hash nuevo.
6. **CUANDO** `npx vitest run lib/finanzas/reset.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/reset.test.ts
grep -q 'FINANZAS_LECTURA' app/api/usuarios/route.ts
grep -q '"FINANZAS"' app/api/usuarios/route.ts
grep -q 'Usa el enlace de recuperación' app/api/usuarios/route.ts
test -f app/api/auth/recuperar/route.ts
test -f app/api/auth/recuperar/confirmar/route.ts
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T9: recuperacion por enlace y bloqueo del reset por ADMIN"
git tag step-09-recuperacion-clave
```

### `E1-T10` — Guardia mecánico de porteros en rutas de Finanzas

**Depende de:** `E1-T2` · **Prioridad:** p0

Cierra la segunda mitad del hallazgo #3, y es el entregable que convierte "acordarse de poner el
portero" en un error de build.

`rutasSinPortero(dir)` recorre `dir` recursivamente con `node:fs`, junta todos los archivos llamados
`route.ts`, lee cada uno y devuelve la ruta de los que **no** contienen ni `hasFinanceAccess` ni
`canWriteFinance`. Si `dir` no existe, devuelve `[]`.

El test tiene dos bloques, y el primero es el que importa:

1. **Prueba el guardia contra un directorio temporal** creado con `node:fs` y `node:os.tmpdir()`: dos
   archivos `route.ts` falsos, uno con el portero y otro sin él, y se afirma que `rutasSinPortero`
   nombra **sólo** el malo. Esto demuestra que el guardia sabe fallar, sin esperar a que aparezca una
   ruta rota de verdad.
2. **Prueba el repo:** `expect(rutasSinPortero("app/api/finanzas")).toEqual([])`. Hoy el directorio no
   existe y el arreglo es vacío; desde el epic 02 en adelante, cada ruta nueva sin portero rompe este
   test nombrando el archivo.

Vitest corre con `cwd` en la raíz del proyecto, así que la ruta relativa resuelve sin configuración.

**Archivos**

- `lib/finanzas/routes.ts` — nuevo
- `lib/finanzas/routes.test.ts` — nuevo: limpia su directorio temporal al terminar

**Aceptación**

1. **CUANDO** `rutasSinPortero` recorre un directorio temporal con un `route.ts` que contiene `hasFinanceAccess` y otro que no contiene ningún portero **EL SISTEMA DEBERÁ** devolver un arreglo con exactamente la ruta del segundo archivo.
2. **CUANDO** `rutasSinPortero` recibe una ruta de directorio que no existe **EL SISTEMA DEBERÁ** devolver un arreglo vacío y no lanzar.
3. **CUANDO** `rutasSinPortero` recorre un `route.ts` que contiene sólo `canWriteFinance` **EL SISTEMA DEBERÁ** considerarlo protegido y no incluirlo en el resultado.
4. **CUANDO** se ejecuta `rutasSinPortero("app/api/finanzas")` sobre el repo **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
5. **CUANDO** `npm run test` corre la suite completa **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos, incluidos los tests preexistentes de `lib/tracking.test.ts` y `lib/outreach/smtp.test.ts`.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
npm run test
npm run typecheck
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T10: guardia mecanico de porteros en rutas de Finanzas"
git tag step-10-guardia-rutas
```

---

## Aceptación del epic

El epic está hecho cuando las diez tareas están en `done` **y**:

1. **CUANDO** `npx vitest run lib/access.test.ts` corre **EL SISTEMA DEBERÁ** confirmar que un usuario con `role: "ADMIN"` y `moduleAccess: []` recibe `false` de `hasFinanceAccess` y de `canWriteFinance`.
2. **CUANDO** `npm run test` corre la suite completa **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos, incluyendo los ocho archivos de test nuevos de `lib/finanzas/` y los preexistentes del repo.
3. **CUANDO** se busca el alias `@/` dentro de `lib/finanzas/` **EL SISTEMA DEBERÁ** no encontrar ninguna coincidencia, porque Vitest no resuelve ese alias.

```bash
npm run typecheck && npm run test
npx vitest run lib/access.test.ts
npx vitest run lib/finanzas/routes.test.ts
! grep -rq "@/lib" lib/finanzas/
```

Desde la raíz del proyecto.

## Trampas

- **`hasModuleAccess()` es la trampa principal de este epic.** Está justo al lado de las funciones
  nuevas, hace casi lo mismo, y tiene bypass de ADMIN. Usarla para Finanzas —o "simplificar"
  `hasFinanceAccess()` para que la llame— destruye la propiedad que define el módulo. La regla de
  `.claude/rules/finanzas.md` incluye `lib/access.ts` en sus `paths` exactamente por esto.
- **El alias `@/` dentro de `lib/finanzas/` compila y falla.** `npm run typecheck` pasa porque
  `tsconfig.json` declara `paths`; `npm run test` muere con `Cannot find module '@/lib/...'` porque
  Vitest no lee esa configuración. Cinco tareas lo comprueban con `! grep -q`.
- **Leer `process.env` en el cuerpo de un módulo rompe pasos anteriores.** Si `crypto.ts` valida la
  clave al importarse, `E1-T5` deja en rojo los portones de `E1-T1` a `E1-T4`, que corrían sin esa
  variable. Lee dentro de la función.
- **El orden de las ramas en `middleware.ts` no es cosmético.** La rama existente de `/api/` retorna
  temprano: todo lo escrito después de ella es código muerto.
- **`prisma db push` no lee `.env.local`.** Sin las dos líneas de `export`, falla con "Environment
  variable not found: DATABASE_URL", que se lee como un problema de máquina y no lo es.
- **`git add -A` en el checkpoint de `E1-T1` tomaría el respaldo** si `backups/` no estuviera en
  `.gitignore`. Lo está, lo puso el Bootstrap antes del primer commit, y el checkpoint lo verifica.
- **Prettier reformatea tablas de Markdown** al hacer commit. Es `--write`, no `--check`: ajusta el
  archivo, no falla el portón.

## Antes de seguir

- [ ] Las diez tareas están en `done` en `tasks.json` — ninguna quedó en `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` fue editado, y ninguno se saltó porque un archivo no existiera.
- [ ] Las diez etiquetas de checkpoint están en git: `git tag -l 'step-*'` lista de
      `step-01-schema-finanzas` a `step-10-guardia-rutas`.
- [ ] `npm run typecheck && npm run test` pasa limpio desde la raíz del proyecto.
- [ ] Los nueve contratos de la tabla "Producidos" existen con la firma indicada.
- [ ] Ningún archivo fuera del subárbol fue modificado.
- [ ] `VARIABLES_ENTORNO.md` documenta las tres variables nuevas. Este repo **no** usa `.env.example`.
- [ ] Un commit por tarea, cada uno con su id de prefijo, cada uno seguido de su etiqueta.
