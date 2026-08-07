# Epic 02: Datos maestros

> Después de este epic existen las primeras pantallas de Finanzas y las cinco rutas de API que
> administran trabajadores, proveedores y categorías — cada una con su portero, su validación, su
> cifrado de cuenta bancaria y su fila de auditoría.

| | |
|---|---|
| **Epic id** | `02-datos-maestros` |
| **Tareas** | `E2-T1` … `E2-T2` |
| **Depende de** | `01-seguridad` — completo, las diez tareas |
| **Desbloquea** | `03-movimientos` |
| **Paralelo con** | ninguno |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo se repite aquí a
propósito.

---

## Stack

Next.js 14 (App Router) · TypeScript 5 · Tailwind 3 · `@base-ui/react` · Phosphor Icons · `sonner` ·
PostgreSQL · Prisma 5 · NextAuth v4 · Vercel. Gestor de paquetes: `npm`. **Las versiones están en
`package-lock.json` — léelo, nunca las adivines.** Este epic no instala ninguna dependencia.

| Tarea | Comando |
|---|---|
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Tests (todo) | `npm run test` |
| El guardia de porteros | `npx vitest run lib/finanzas/routes.test.ts` |
| Build | `npm run build` |
| Inspeccionar la BD | `npm run db:studio` |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de marcar
cualquier tarea de este epic como hecha.

Ninguna tarea de este epic necesita levantar un servicio. El esquema ya está aplicado desde `E1-T1`.

## Subárbol de directorios

```
app/
  api/finanzas/
    empleados/route.ts               # NUEVO — GET lista paginada, POST crea
    empleados/[id]/route.ts          # NUEVO — GET ficha, PATCH edita
    proveedores/route.ts             # NUEVO — GET lista, POST crea
    proveedores/[id]/route.ts        # NUEVO — GET ficha, PATCH edita / baja lógica
    categorias/route.ts              # NUEVO — GET activas, POST crea
  (admin)/admin/finanzas/
    layout.tsx                       # NUEVO — shell del módulo, nav según canWriteFinance
    trabajadores/page.tsx            # NUEVO
    trabajadores/[id]/page.tsx       # NUEVO
    proveedores/page.tsx             # NUEVO
lib/
  access.ts                          # existe, sólo lectura: hasFinanceAccess, canWriteFinance
  utils.ts                           # existe, sólo lectura: apiError, formatCurrency, cn
  db.ts                              # existe, sólo lectura: prisma
  auth.ts                            # existe, sólo lectura: authOptions
  finanzas/
    audit.ts serialize.ts crypto.ts rut.ts schemas.ts   # existen, sólo lectura
    routes.test.ts                                       # existe — su gate corre en cada tarea
```

El grupo de rutas `(admin)` **no aparece en la URL**: `app/(admin)/admin/finanzas/trabajadores/page.tsx`
sirve `/admin/finanzas/trabajadores`.

Todo lo que esté fuera de este subárbol está fuera de alcance. Si una tarea parece exigir editar un
archivo que no está en esta lista, detente y reporta.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `Employee` | todos menos `terminatedAt` y `purgedAt` | `rut @unique` normalizado; `baseSalary Int` en pesos; `bankAccountEnc` cifrado con prefijo `v1:`; `bankAccountLast4` en claro |
| `Supplier` | todos | Baja lógica con `isActive: false`. **Nunca borrado duro** |
| `FinanceCategory` | todos | `@@unique([name, kind])` — el `POST` traduce esa violación a `409` |
| `FinanceAuditLog` | escritura de filas `CREAR` y `EDITAR` | Dentro de la misma `prisma.$transaction` que la mutación |

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-seguridad` | `hasFinanceAccess(user)` | `true` si el usuario tiene `FINANZAS` o `FINANZAS_LECTURA`. **Sin bypass de ADMIN** |
| `01-seguridad` | `canWriteFinance(user)` | `true` sólo con `FINANZAS`. **Sin bypass de ADMIN** |
| `01-seguridad` | `withAudit(tx, entrada)` · `mutarConAuditoria(tx, mutacion, entrada)` | Escribe la fila dentro del `tx` recibido; lanza si falta `actorEmail`, `action` o `entityType`; redacta `bankAccountEnc` y `password` |
| `01-seguridad` | `cifrar(texto)` · `ultimos4(cuenta)` | Devuelve `v1:iv:tag:ct`; lanza con mensaje nombrado si falta `FINANZAS_ENCRYPTION_KEY` |
| `01-seguridad` | `normalizarRut(rut)` · `esRutValido(rut)` | Normaliza a `12345678-9`; valida el dígito con módulo 11 |
| `01-seguridad` | `serializeEmployee(e, viewer)` · `serializeSupplier(s, viewer)` | Enmascara el RUT y omite datos bancarios para `FINANZAS_LECTURA`; **nunca** devuelve `bankAccountEnc` |
| `01-seguridad` | esquemas de `lib/finanzas/schemas.ts` | zod; montos `int().positive()` |
| repo | `apiError(message, status = 400)` | `NextResponse.json({ error: message }, { status })` |
| repo | `prisma` de `@/lib/db` | Cliente Prisma con `$transaction` |

**Producidos** — los epics siguientes dependen de esto:

| Export | Firma / contrato | Lo usa |
|---|---|---|
| `app/(admin)/admin/finanzas/layout.tsx` | Shell con navegación del módulo; los links de escritura sólo si `canWriteFinance` | `03`, `04`, `05` — todas las pantallas cuelgan de él |
| `GET /api/finanzas/proveedores` | Lista de proveedores activos, serializados | `03` — selector de proveedor en el alta de egreso |
| `GET /api/finanzas/categorias` | Lista de categorías activas por `kind` | `03`, `05` |
| `GET /api/finanzas/empleados` | Lista de trabajadores por `status` | `03`, `04` |

## Convenciones que muerden en esta área

- **Cada método exportado de cada `route.ts` llama a su portero**, después de resolver la sesión y
  antes de tocar la base. Lectura: `hasFinanceAccess`. Mutación: `canWriteFinance`. El guardia lee el
  archivo completo, así que un `GET` protegido y un `POST` desprotegido en el mismo archivo **pasan
  el test**: revísalo a ojo, método por método.
- **Los archivos bajo `app/` sí usan el alias `@/`** (`@/lib/access`, `@/lib/db`, `@/lib/utils`),
  porque los resuelve Next. La regla de imports relativos aplica sólo a `lib/finanzas/`.
- **Ninguna entidad sale sin pasar por `serialize*`.** Devolver el objeto de Prisma directamente
  filtra `bankAccountEnc` y el RUT completo a `FINANZAS_LECTURA`.
- **Cifra antes de escribir.** El `POST` de empleado y el de proveedor guardan `bankAccountEnc` con
  `cifrar()` y `bankAccountLast4` con `ultimos4()`, en ese orden, en la misma operación.
- **La auditoría va dentro de la transacción**, no después. Si la fila no se escribe, la mutación no
  ocurre.
- **Nada de `DELETE`.** Proveedor de baja es `isActive: false`.
- **`409` para violación de unicidad**, no `500`: RUT repetido en empleado, `[name, kind]` repetido
  en categoría. Deja que la base decida y traduce el error de Prisma.
- **Estados de carga, vacío y error en cada lista.** Skeleton de 5 filas, mensaje concreto con botón
  de alta si `canWriteFinance`, y mensaje de error con botón Reintentar.
- **Escritorio y denso:** alto de fila 40px, montos en Geist Mono con `tabular-nums`, sin animación
  al ordenar o filtrar. Ingreso `#15803D`, egreso `#B91C1C`, primario `#1D4ED8`.
- **Estilo de archivo:** comillas dobles, punto y coma, 2 espacios — es `.prettierrc` del repo.
- **Cada `route.ts` y cada `page.tsx` nuevo lleva su `*.spec.md` al lado.** En este epic puedes
  escribirlos ya; el epic 05 verifica que estén todos.

Reglas completas del proyecto: `CLAUDE.md`. Reglas del área: `.claude/rules/finanzas.md`. Los dos
están en la raíz del proyecto.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E2-T1` — CRUD de trabajadores (API y pantallas)

**Depende de:** `E1-T4`, `E1-T7`, `E1-T10` · **Prioridad:** p0 — metadato para recortes de alcance,
no un orden de ejecución

La primera pantalla del módulo, y recién ahora, con todos sus porteros probados. El `POST` de
empleado es el que ejercita la cadena completa por primera vez: valida con zod, normaliza y valida el
RUT, cifra la cuenta bancaria, guarda los últimos 4 en claro, escribe la fila de auditoría en la
misma transacción y devuelve la entidad serializada según el rol de quien consulta.

El `layout.tsx` es el shell del módulo: la navegación entre las nueve pantallas, con los enlaces de
escritura visibles sólo si `canWriteFinance`. Cuélgalo de aquí; los epics siguientes agregan páginas
adentro sin volver a tocarlo.

Ojo con el detalle que se olvida: `/admin/finanzas` (la raíz del módulo) todavía **no** existe —
llega en el epic 05 con el resumen. Que la navegación apunte ahí está bien, pero no la uses como
página de aterrizaje del layout hasta entonces.

**Archivos**

- `app/api/finanzas/empleados/route.ts` — nuevo: `GET` lista paginada con filtro `status`, `POST` crea
- `app/api/finanzas/empleados/[id]/route.ts` — nuevo: `GET` ficha, `PATCH` edita con `before`/`after`
- `app/(admin)/admin/finanzas/layout.tsx` — nuevo: shell y navegación del módulo
- `app/(admin)/admin/finanzas/trabajadores/page.tsx` — nuevo: tabla de trabajadores
- `app/(admin)/admin/finanzas/trabajadores/[id]/page.tsx` — nuevo: ficha y edición

**Aceptación**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** `GET /api/finanzas/empleados` recibe una sesión sin `FINANZAS` ni `FINANZAS_LECTURA` **EL SISTEMA DEBERÁ** responder `403` con el cuerpo `{ "error": "Acceso denegado" }`.
2. **CUANDO** `POST /api/finanzas/empleados` recibe un RUT con dígito verificador incorrecto **EL SISTEMA DEBERÁ** responder `400` y no escribir ninguna fila.
3. **CUANDO** `POST /api/finanzas/empleados` crea un trabajador con cuenta bancaria **EL SISTEMA DEBERÁ** guardar `bankAccountEnc` con el prefijo `v1:` y `bankAccountLast4` con los últimos 4 dígitos en claro.
4. **CUANDO** `PATCH /api/finanzas/empleados/[id]` lo llama una sesión con sólo `FINANZAS_LECTURA` **EL SISTEMA DEBERÁ** responder `403` y no modificar la fila.
5. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre **EL SISTEMA DEBERÁ** devolver un arreglo vacío, es decir las dos rutas nuevas llaman a un portero.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto.

```bash
npx vitest run lib/finanzas/routes.test.ts
npm run test
npm run typecheck
npm run build
grep -q 'serializeEmployee' app/api/finanzas/empleados/route.ts && grep -q 'serializeEmployee' 'app/api/finanzas/empleados/[id]/route.ts'
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: CRUD de trabajadores (API y pantallas)"
git tag step-11-trabajadores
```

### `E2-T2` — Proveedores y categorías

**Depende de:** `E2-T1` · **Prioridad:** p1

Mismo patrón que trabajadores, con dos diferencias que importan. Primero, `Supplier.rut` **no** es
único ni obligatorio: hay proveedores informales sin RUT registrado, y forzarlo bloquearía cargas
reales. Segundo, la baja de un proveedor es lógica (`isActive: false`) y sus transacciones asociadas
sobreviven intactas — la FK es `SetNull`, así que el movimiento se conserva aunque el proveedor
desaparezca de las listas.

Las categorías no tienen pantalla propia a propósito: se administran desde un diálogo dentro de la
pantalla de movimientos del epic 03. Una pantalla completa para una tabla de tres columnas sería
ruido en un módulo que ya tiene nueve.

El `POST` de categoría debe traducir la violación de `@@unique([name, kind])` a un `409` con mensaje
concreto. No hagas un `findFirst` previo y luego el `create`: eso es una carrera. Deja que la base
decida y captura el error de Prisma.

**Archivos**

- `app/api/finanzas/proveedores/route.ts` — nuevo: `GET` lista paginada de activos, `POST` crea
- `app/api/finanzas/proveedores/[id]/route.ts` — nuevo: `GET` ficha, `PATCH` edita y da de baja
- `app/api/finanzas/categorias/route.ts` — nuevo: `GET` activas, `POST` crea con manejo de `409`
- `app/(admin)/admin/finanzas/proveedores/page.tsx` — nuevo: lista y alta

**Aceptación**

1. **CUANDO** `POST /api/finanzas/categorias` recibe un nombre y un `kind` que ya existen **EL SISTEMA DEBERÁ** responder `409` y no crear una segunda fila.
2. **CUANDO** `PATCH /api/finanzas/proveedores/[id]` fija `isActive: false` **EL SISTEMA DEBERÁ** conservar la fila y todas sus transacciones asociadas.
3. **CUANDO** cualquiera de las tres rutas nuevas recibe una sesión con sólo `FINANZAS_LECTURA` y un método de mutación **EL SISTEMA DEBERÁ** responder `403`.
4. **CUANDO** `POST /api/finanzas/proveedores` crea un proveedor con cuenta bancaria **EL SISTEMA DEBERÁ** guardar `bankAccountEnc` con el prefijo `v1:` y escribir una fila de auditoría `CREAR`.
5. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
npm run test
npm run typecheck
npm run build
grep -q 'serializeSupplier' app/api/finanzas/proveedores/route.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: proveedores y categorias"
git tag step-12-proveedores-categorias
```

---

## Aceptación del epic

El epic está hecho cuando las dos tareas están en `done` **y**:

1. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre sobre las cinco rutas nuevas de este epic **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
2. **CUANDO** `npm run build` corre con las cuatro pantallas nuevas en el árbol **EL SISTEMA DEBERÁ** salir 0.
3. **CUANDO** se busca `serializeEmployee` o `serializeSupplier` en cada `route.ts` de este epic que devuelve una entidad **EL SISTEMA DEBERÁ** encontrarlo, porque ninguna entidad sale cruda.

```bash
npm run typecheck && npm run test && npm run build
npx vitest run lib/finanzas/routes.test.ts
```

Desde la raíz del proyecto.

## Trampas

- **El guardia lee el archivo, no el método.** Un `route.ts` con `GET` protegido y `POST` sin portero
  pasa `routes.test.ts` sin chistar. Revisa método por método, o usa la skill `verificar-porteros`.
- **Devolver el objeto de Prisma sin serializar** filtra `bankAccountEnc` y el RUT completo a
  `FINANZAS_LECTURA`. Es el error más silencioso de este epic: la pantalla se ve bien y los datos ya
  salieron.
- **Cifrar sin `FINANZAS_ENCRYPTION_KEY` lanza con mensaje nombrado**, no con un error genérico. Si
  lo ves en desarrollo, es que el Bootstrap no corrió o la variable no está en `.env.local`.
- **`(admin)` no aparece en la URL.** `app/(admin)/admin/finanzas/proveedores/page.tsx` sirve
  `/admin/finanzas/proveedores`. Si escribes el link con `(admin)` adentro, da 404.
- **`/admin/finanzas` todavía no existe** — la página raíz del módulo llega en el epic 05. La
  navegación puede apuntar ahí, pero no confíes en que resuelva todavía.
- **Un `findFirst` antes del `create`** para "evitar el duplicado" es una carrera. El índice único ya
  lo resuelve; traduce su error a `409`.
- **`Supplier` no es `Company`.** No importes proveedores a la tabla del CRM ni al revés: son las
  tablas de dos módulos distintos y mezclarlas rompe la deduplicación pendiente de Outreach.

## Antes de seguir

- [ ] Las dos tareas están en `done` en `tasks.json` — ninguna quedó en `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` fue editado, y ninguno se saltó porque un archivo no existiera.
- [ ] Las dos etiquetas de checkpoint están en git: `step-11-trabajadores` y
      `step-12-proveedores-categorias`.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio.
- [ ] Los cuatro contratos de la tabla "Producidos" existen y responden.
- [ ] Ningún archivo fuera del subárbol fue modificado.
- [ ] Este epic no agregó ninguna variable de entorno; `VARIABLES_ENTORNO.md` no cambia.
- [ ] Un commit por tarea, cada uno con su id de prefijo, cada uno seguido de su etiqueta.
