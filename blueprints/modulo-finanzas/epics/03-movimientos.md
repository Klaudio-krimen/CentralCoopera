# Epic 03: Movimientos

> Después de este epic Marcela puede registrar ingresos y egresos y llevar los anticipos de los
> trabajadores. Aquí nace la paginación en servidor que usan todas las listas grandes del módulo, y
> aquí se fija la regla de que un movimiento nunca se borra: se anula.

| | |
|---|---|
| **Epic id** | `03-movimientos` |
| **Tareas** | `E3-T1` … `E3-T2` |
| **Depende de** | `02-datos-maestros` — completo, las dos tareas |
| **Desbloquea** | `04-nominas`, `05-reportes-cierre` |
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
    transacciones/route.ts           # NUEVO — GET lista paginada y filtrada, POST crea
    transacciones/[id]/route.ts      # NUEVO — PATCH edita o anula. SIN DELETE
    anticipos/route.ts               # NUEVO — GET lista por trabajador y estado, POST crea
    anticipos/[id]/route.ts          # NUEVO — PATCH cambia estado
  (admin)/admin/finanzas/
    layout.tsx                       # existe desde E2-T1, sólo lectura
    movimientos/page.tsx             # NUEVO — tabla de ingresos y egresos
    anticipos/page.tsx               # NUEVO — anticipos por trabajador
lib/
  access.ts                          # existe, sólo lectura: hasFinanceAccess, canWriteFinance
  utils.ts                           # existe, sólo lectura: apiError, formatCurrency, cn
  db.ts                              # existe, sólo lectura: prisma
  finanzas/
    paginacion.ts                    # NUEVO — resolverPaginacion
    paginacion.test.ts               # NUEVO
    audit.ts serialize.ts schemas.ts # existen, sólo lectura
    routes.test.ts                   # existe — su gate corre en cada tarea
```

El grupo de rutas `(admin)` **no aparece en la URL**: `app/(admin)/admin/finanzas/movimientos/page.tsx`
sirve `/admin/finanzas/movimientos`.

Todo lo que esté fuera de este subárbol está fuera de alcance. Si una tarea parece exigir editar un
archivo que no está en esta lista, detente y reporta.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `FinanceTransaction` | todos | `amount Int` en pesos. `status` pasa a `ANULADO`, nunca se borra la fila |
| `Advance` | todos menos `payrollItemId` | `payrollItemId` lo escribe el epic 04 al generar la nómina |
| `FinanceCategory` | sólo lectura | El selector de categoría del alta |
| `Supplier` | sólo lectura | El selector de proveedor del alta de egreso |
| `Employee` | sólo lectura | El selector de trabajador del alta de anticipo |
| `FinanceAuditLog` | escritura de filas `CREAR`, `EDITAR` y `ANULAR` | Dentro de la misma `prisma.$transaction` que la mutación |

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-seguridad` | `hasFinanceAccess(user)` | `true` si el usuario tiene `FINANZAS` o `FINANZAS_LECTURA`. **Sin bypass de ADMIN** |
| `01-seguridad` | `canWriteFinance(user)` | `true` sólo con `FINANZAS`. **Sin bypass de ADMIN** |
| `01-seguridad` | `withAudit(tx, entrada)` · `mutarConAuditoria(tx, mutacion, entrada)` | Escribe la fila dentro del `tx` recibido; lanza si falta `actorEmail`, `action` o `entityType` |
| `01-seguridad` | esquemas de `lib/finanzas/schemas.ts` | zod; montos `int().positive()` |
| `02-datos-maestros` | `GET /api/finanzas/proveedores` | Lista de proveedores activos, serializados |
| `02-datos-maestros` | `GET /api/finanzas/categorias` | Lista de categorías activas por `kind` |
| `02-datos-maestros` | `GET /api/finanzas/empleados` | Lista de trabajadores por `status` |
| `02-datos-maestros` | `app/(admin)/admin/finanzas/layout.tsx` | Shell y navegación del módulo |
| repo | `apiError(message, status = 400)` | `NextResponse.json({ error: message }, { status })` |
| repo | `formatCurrency(value)` | `es-CL`, `CLP`, `maximumFractionDigits: 0` |
| repo | `prisma` de `@/lib/db` | Cliente Prisma con `$transaction` |

**Producidos** — los epics siguientes dependen de esto:

| Export | Firma / contrato | Lo usa |
|---|---|---|
| `resolverPaginacion(params)` | `(params: { page?: unknown; pageSize?: unknown }) => { page: number; skip: number; take: number }`. Tope duro `take ≤ 100`; entrada inválida cae a `page: 1`, `skip: 0`, `take: 25` | `05-reportes-cierre` — el visor de auditoría |
| `GET /api/finanzas/transacciones` | Lista paginada y filtrada por `kind`, rango de fechas y categoría | `05` — el resumen del mes lee de la misma tabla |
| `POST /api/finanzas/anticipos` | Crea un anticipo en `PENDIENTE` | `04` — la nómina descuenta los `PAGADO` |

## Convenciones que muerden en esta área

- **Cada método exportado de cada `route.ts` llama a su portero**, después de resolver la sesión y
  antes de tocar la base. Lectura: `hasFinanceAccess`. Mutación: `canWriteFinance`. El guardia lee el
  archivo completo, así que un `GET` protegido y un `POST` desprotegido en el mismo archivo **pasan
  el test**: revísalo a ojo, método por método.
- **Paginar en la base de datos, siempre.** `take` y `skip` en la consulta de Prisma. Traer todo y
  cortar en el navegador funciona con los datos de prueba y muere el primer mes real.
- **`resolverPaginacion` vive en `lib/finanzas/`, no dentro del handler.** Ahí es donde el Vitest del
  repo la ve — `include: ['lib/**/*.test.ts']` y nada más. Un helper escondido en `app/` es un helper
  sin test.
- **Los montos son `Int` en pesos.** Nada de `parseFloat`, nada de `toFixed`, nada de decimales. La
  validación de zod es `int().positive()` y el `POST` rechaza cualquier otra cosa con `400`.
- **Los timestamps son del servidor.** `paidAt` y `date` los fija el handler, nunca el cuerpo del
  request. Es la regla 6 del `CLAUDE.md` del repo y aquí se rompe fácil porque el formulario tiene un
  campo de fecha: la fecha *contable* la elige el usuario, la fecha de *registro* la pone el servidor.
- **Nada de `DELETE`.** Un movimiento equivocado se anula (`status: "ANULADO"`) y la fila queda. El
  epic 05 la excluye de los totales. Exportar un método `DELETE` en cualquier ruta de este epic es un
  fallo del gate.
- **Los estados de anticipo avanzan, no retroceden.** `PENDIENTE → PAGADO → DESCONTADO`, y `ANULADO`
  desde `PENDIENTE` o `PAGADO`. Cualquier transición hacia atrás es `409`.
- **La auditoría va dentro de la transacción**, no después. Si la fila no se escribe, la mutación no
  ocurre.
- **Estados de carga, vacío y error en cada lista.** Skeleton de 5 filas, mensaje concreto con botón
  de alta si `canWriteFinance`, y mensaje de error con botón Reintentar.
- **Escritorio y denso:** alto de fila 40px, montos en Geist Mono con `tabular-nums` alineados a la
  derecha, sin animación al ordenar o filtrar. Ingreso `#15803D`, egreso `#B91C1C`, primario
  `#1D4ED8`.
- **Estilo de archivo:** comillas dobles, punto y coma, 2 espacios — es `.prettierrc` del repo.
- **Cada `route.ts` y cada `page.tsx` nuevo lleva su `*.spec.md` al lado.** El epic 05 verifica que
  estén todos; escribirlos ahora cuesta menos que buscarlos después.

Reglas completas del proyecto: `CLAUDE.md`. Reglas del área: `.claude/rules/finanzas.md`. Los dos
están en la raíz del proyecto.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E3-T1` — Movimientos con paginación en servidor

**Depende de:** `E2-T2` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de
ejecución

El corazón del cuadre de ingresos y egresos, que es uno de los cuatro dolores que Marcela nombró. La
tarea tiene dos mitades y la primera es la que importa a largo plazo: `resolverPaginacion` es una
función pura en `lib/finanzas/paginacion.ts` que traduce los parámetros crudos de la URL —que llegan
como `string | null | undefined` y a veces como basura— en `{ page, skip, take }` con un tope duro.
Vive ahí y no dentro del handler porque es el único lugar donde el Vitest del repo la puede probar.

El tope de 100 no es decoración: sin él, `?pageSize=999999` es una descarga de la tabla completa
disfrazada de paginación, y el rate limiting del epic 01 no la detiene porque es una sola petición.

La segunda mitad es el CRUD de `FinanceTransaction`. La regla que se fija aquí y no se vuelve a
discutir: **un movimiento nunca se borra**. El `PATCH` lo lleva a `ANULADO` y la fila sobrevive con
su historial de auditoría. Por eso `app/api/finanzas/transacciones/[id]/route.ts` no exporta `DELETE`
y hay un `verify` que lo comprueba.

Los filtros de la lista —`kind`, rango de fechas, categoría— se resuelven en el `where` de Prisma,
junto al `take`/`skip`. Filtrar en el cliente sobre una página ya paginada da resultados que mienten.

**Archivos**

- `lib/finanzas/paginacion.ts` — nuevo: `resolverPaginacion`
- `lib/finanzas/paginacion.test.ts` — nuevo
- `app/api/finanzas/transacciones/route.ts` — nuevo: `GET` lista paginada y filtrada, `POST` crea
- `app/api/finanzas/transacciones/[id]/route.ts` — nuevo: `PATCH` edita o anula. **Sin `DELETE`**
- `app/(admin)/admin/finanzas/movimientos/page.tsx` — nuevo: tabla con filtros y alta

**Aceptación**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** `resolverPaginacion` recibe `pageSize: "500"` **EL SISTEMA DEBERÁ** devolver `take: 100`, aplicando el tope duro.
2. **CUANDO** `resolverPaginacion` recibe `page: "0"` o `page: "abc"` **EL SISTEMA DEBERÁ** devolver `page: 1` y `skip: 0`.
3. **CUANDO** `resolverPaginacion` recibe `page: 3` y `pageSize: 25` **EL SISTEMA DEBERÁ** devolver `skip: 50` y `take: 25`.
4. **CUANDO** `GET /api/finanzas/transacciones` responde **EL SISTEMA DEBERÁ** incluir `take` y `skip` en la consulta de Prisma y nunca devolver la tabla completa.
5. **CUANDO** `PATCH /api/finanzas/transacciones/[id]` anula un movimiento **EL SISTEMA DEBERÁ** fijar `status: "ANULADO"` y conservar la fila, sin exponer ningún método `DELETE`.
6. **CUANDO** `npx vitest run lib/finanzas/paginacion.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto.

```bash
npx vitest run lib/finanzas/paginacion.test.ts
npx vitest run lib/finanzas/routes.test.ts
npm run test
! grep -q 'export async function DELETE' 'app/api/finanzas/transacciones/[id]/route.ts'
grep -q 'skip' app/api/finanzas/transacciones/route.ts
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: movimientos con paginacion en servidor"
git tag step-13-transacciones
```

### `E3-T2` — Anticipos a trabajadores

**Depende de:** `E2-T1`, `E3-T1` · **Prioridad:** p1

El segundo dolor de la lista de Marcela. Un anticipo es plata que sale antes de la liquidación y que
después hay que descontar — si el descuento se pierde, la empresa paga dos veces. Por eso el estado
de un anticipo avanza y no retrocede: `PENDIENTE → PAGADO → DESCONTADO`, con `ANULADO` como salida
desde los dos primeros. Llevar un `DESCONTADO` de vuelta a `PENDIENTE` significaría que la nómina que
ya lo descontó quedó mintiendo, así que es `409`.

`payrollItemId` se deja en `null` aquí. Lo escribe el epic 04 cuando genera la nómina del período y
enlaza cada anticipo con la línea que lo descontó. No lo pobles a mano.

`paidAt` lo fija el servidor en el momento de la transición a `PAGADO`. Si el cliente manda una
fecha, se ignora.

**Archivos**

- `app/api/finanzas/anticipos/route.ts` — nuevo: `GET` lista por trabajador y estado, `POST` crea
- `app/api/finanzas/anticipos/[id]/route.ts` — nuevo: `PATCH` cambia estado
- `app/(admin)/admin/finanzas/anticipos/page.tsx` — nuevo: anticipos agrupados por trabajador

**Aceptación**

1. **CUANDO** `PATCH /api/finanzas/anticipos/[id]` marca un anticipo como `PAGADO` **EL SISTEMA DEBERÁ** fijar `paidAt` con la hora del servidor y nunca con una fecha enviada por el cliente.
2. **CUANDO** `PATCH /api/finanzas/anticipos/[id]` intenta llevar un anticipo `DESCONTADO` de vuelta a `PENDIENTE` **EL SISTEMA DEBERÁ** responder `409` y no modificar la fila.
3. **CUANDO** `POST /api/finanzas/anticipos` recibe un monto que no es entero positivo **EL SISTEMA DEBERÁ** responder `400` y no escribir ninguna fila.
4. **CUANDO** una sesión con sólo `FINANZAS_LECTURA` llama a `POST` o `PATCH` de anticipos **EL SISTEMA DEBERÁ** responder `403`.
5. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
npm run test
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: anticipos a trabajadores"
git tag step-14-anticipos
```

---

## Aceptación del epic

El epic está hecho cuando las dos tareas están en `done` **y**:

1. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre sobre las cuatro rutas nuevas de este epic **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
2. **CUANDO** se busca `export async function DELETE` en cualquier `route.ts` de este epic **EL SISTEMA DEBERÁ** no encontrarlo, porque nada se borra en Finanzas.
3. **CUANDO** `npm run build` corre con las dos pantallas nuevas en el árbol **EL SISTEMA DEBERÁ** salir 0.

```bash
npm run typecheck && npm run test && npm run build
npx vitest run lib/finanzas/routes.test.ts
! grep -rq 'export async function DELETE' app/api/finanzas/
```

Desde la raíz del proyecto.

## Trampas

- **El guardia lee el archivo, no el método.** Un `route.ts` con `GET` protegido y `POST` sin portero
  pasa `routes.test.ts` sin chistar. Revisa método por método, o usa la skill `verificar-porteros`.
- **Paginar en el cliente parece funcionar.** Con 30 movimientos de prueba, traer todo y cortar en
  React se ve idéntico. La diferencia aparece el mes en que hay 4.000 filas, y para entonces el
  patrón está copiado en cinco pantallas.
- **`resolverPaginacion` dentro del handler no se prueba.** El Vitest del repo sólo recoge
  `lib/**/*.test.ts`. Un helper en `app/api/.../route.ts` es código sin red.
- **Dos fechas distintas.** La fecha contable del movimiento la elige el usuario y va en `date`; la
  hora de registro la pone el servidor en `createdAt`. Confundirlas deja los movimientos
  antedatables desde el cliente.
- **`parseFloat` sobre un monto** es el bug que no se ve hasta que alguien escribe `1.500` pensando
  en miles. Los montos son `Int`; valida con zod y rechaza.
- **Anular no es borrar, y filtrar no es excluir.** El `GET` devuelve los `ANULADO` para que Marcela
  los vea tachados; el que los excluye de los totales es `resumirPeriodo`, en el epic 05.
- **El estado del anticipo no retrocede.** Si el formulario ofrece un selector con los cuatro
  estados, alguien va a elegir el equivocado. Ofrece sólo las transiciones válidas desde el estado
  actual.

## Antes de seguir

- [ ] Las dos tareas están en `done` en `tasks.json` — ninguna quedó en `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` fue editado, y ninguno se saltó porque un archivo no existiera.
- [ ] Las dos etiquetas de checkpoint están en git: `step-13-transacciones` y `step-14-anticipos`.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio.
- [ ] Los tres contratos de la tabla "Producidos" existen con la firma indicada.
- [ ] Ninguna ruta de `app/api/finanzas/` exporta `DELETE`.
- [ ] Ningún archivo fuera del subárbol fue modificado.
- [ ] Este epic no agregó ninguna variable de entorno; `VARIABLES_ENTORNO.md` no cambia.
- [ ] Un commit por tarea, cada uno con su id de prefijo, cada uno seguido de su etiqueta.
