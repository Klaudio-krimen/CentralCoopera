# Epic 05: Reportes y cierre

> El último epic. Aquí aparece el resumen que Marcela abre cada mañana, el visor que hace verificable
> todo lo que el módulo prometió sobre auditoría, la exportación con el límite que impide que alguien
> se lleve la base entera, y el cierre: el sidebar, la purga de datos bancarios al desvincular, los
> `*.spec.md` y el barrido final.

| | |
|---|---|
| **Epic id** | `05-reportes-cierre` |
| **Tareas** | `E5-T1` … `E5-T4` |
| **Depende de** | `03-movimientos` para `E5-T1`/`E5-T2`/`E5-T3` · `04-nominas` completo para `E5-T4` |
| **Desbloquea** | nada — es el último |
| **Paralelo con** | `04-nominas`: `E5-T1` y `E5-T2` sólo dependen de `E3-T1` y `E1-T4`, así que pueden avanzar mientras se construyen las nóminas |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo se repite aquí a
propósito.

---

## Stack

Next.js 14 (App Router) · TypeScript 5 · Tailwind 3 · `@base-ui/react` · Phosphor Icons · Recharts 3 ·
`sonner` · PostgreSQL · Prisma 5 · NextAuth v4 · Vercel. Gestor de paquetes: `npm`. **Las versiones
están en `package-lock.json` — léelo, nunca las adivines.** Este epic no instala ninguna dependencia.

| Tarea | Comando |
|---|---|
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Tests (todo) | `npm run test` |
| El guardia de porteros | `npx vitest run lib/finanzas/routes.test.ts` |
| Build | `npm run build` |
| Inspeccionar la BD | `npm run db:studio` |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de marcar
cualquier tarea de este epic como hecha. En `E5-T4` ese portón **es** la tarea.

Ninguna tarea de este epic necesita levantar un servicio. El esquema ya está aplicado desde `E1-T1`.

## Subárbol de directorios

```
app/
  api/finanzas/
    reportes/route.ts                # NUEVO — GET agregados del período
    auditoria/route.ts               # NUEVO — GET paginado. SÓLO GET
    export/route.ts                  # NUEVO — GET CSV, limitado y auditado
    empleados/[id]/desvincular/route.ts  # NUEVO — POST desvincula y purga
  (admin)/admin/finanzas/
    page.tsx                         # NUEVO — resumen del mes, la raíz del módulo
    auditoria/page.tsx               # NUEVO — visor
    **/*.spec.md                     # NUEVO — los que falten, en E5-T4
components/ui/
  AdminSidebar.tsx                   # SE MODIFICA — módulo Finanzas sin bypass de isAdmin
lib/
  finanzas/
    reportes.ts reportes.test.ts     # NUEVO — resumirPeriodo, agruparPorCategoria
    csv.ts csv.test.ts               # NUEVO — escaparCampoCsv
    paginacion.ts rate-limit.ts audit.ts serialize.ts   # existen, sólo lectura
    routes.test.ts                   # existe — su gate corre en cada tarea
CLAUDE.md                            # SE MODIFICA — se fusiona el bloque de Finanzas
```

`lib/finanzas/csv.ts` es un archivo nuevo y **no** reemplaza `lib/csv.ts`, que es del módulo CRM y no
se toca.

El grupo de rutas `(admin)` **no aparece en la URL**: `app/(admin)/admin/finanzas/page.tsx` sirve
`/admin/finanzas`.

Todo lo que esté fuera de este subárbol está fuera de alcance, con dos excepciones nombradas:
`components/ui/AdminSidebar.tsx` y `CLAUDE.md`, ambas sólo en `E5-T4`.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `FinanceTransaction` | sólo lectura | Los `ANULADO` se excluyen de todos los totales |
| `PayrollRun` · `PayrollItem` | sólo lectura | Alimentan el bloque de sueldos del resumen |
| `FinanceAuditLog` | lectura en el visor; escritura de filas `EXPORTAR` y `DESVINCULAR` | Append-only: el visor **no** expone `POST`, `PATCH`, `PUT` ni `DELETE` |
| `RateLimitCounter` | escritura vía `checkRateLimit` | El tope de exportación |
| `Employee` | `status`, `terminatedAt`, `purgedAt`, y el borrado de los campos bancarios y de contacto | Nunca borrado duro |

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-seguridad` | `hasFinanceAccess(user)` | `true` si el usuario tiene `FINANZAS` o `FINANZAS_LECTURA`. **Sin bypass de ADMIN** |
| `01-seguridad` | `canWriteFinance(user)` | `true` sólo con `FINANZAS`. **Sin bypass de ADMIN** |
| `01-seguridad` | `withAudit(tx, entrada)` · `mutarConAuditoria(tx, mutacion, entrada)` | Escribe la fila dentro del `tx` recibido |
| `01-seguridad` | `checkRateLimit(contador, key, limit, windowMs, ahora?)` | Ventana fija sobre `RateLimitCounter`; devuelve `{ ok, retryAfterSec }` |
| `01-seguridad` | `rutasSinPortero(dir)` | Recorre `dir` con `node:fs` y devuelve las rutas sin portero |
| `02-datos-maestros` | `app/(admin)/admin/finanzas/layout.tsx` | Shell y navegación del módulo |
| `03-movimientos` | `resolverPaginacion(params)` | `{ page, skip, take }` con tope duro `take ≤ 100` y `take: 25` por defecto |
| `03-movimientos` | `GET /api/finanzas/transacciones` | Lista paginada y filtrada |
| `04-nominas` | `calcularLiquido` · `totalizarNomina` | Aritmética entera, líquido con piso en 0 |
| repo | `apiError(message, status = 400)` | `NextResponse.json({ error: message }, { status })` |
| repo | `formatCurrency(value)` | `es-CL`, `CLP`, `maximumFractionDigits: 0` |
| repo | `cn(...classes)` | Concatenador de clases de `lib/utils.ts` |
| repo | `prisma` de `@/lib/db` | Cliente Prisma con `$transaction` |

**Producidos** — nadie depende de esto, es el final del árbol. Se listan porque el gate del epic los
comprueba:

| Export | Firma / contrato |
|---|---|
| `resumirPeriodo(transacciones)` | `=> { ingresos: number; egresos: number; saldo: number }`. Excluye `ANULADO` |
| `agruparPorCategoria(transacciones)` | `=> Array<{ categoria: string; monto: number }>` ordenado de mayor a menor; los sin categoría bajo `"Sin categoría"` |
| `escaparCampoCsv(valor)` | `=> string`. Entrecomilla si hay coma, duplica comillas internas, neutraliza fórmulas |

## Convenciones que muerden en esta área

- **Cada método exportado de cada `route.ts` llama a su portero.** Lectura: `hasFinanceAccess`.
  Mutación: `canWriteFinance`. El visor de auditoría y el resumen son lectura; la exportación es
  lectura *con* rate limiting; la desvinculación es mutación.
- **El visor de auditoría exporta `GET` y nada más.** `FinanceAuditLog` es append-only por contrato,
  y eso se hace cumplir con la ausencia de rutas, no con un comentario. Hay un `verify` que falla si
  aparece `POST`, `PATCH`, `PUT` o `DELETE` en ese archivo.
- **Los `ANULADO` se excluyen de los totales, no de las listas.** El visor de movimientos los muestra
  tachados; `resumirPeriodo` los ignora. Confundir las dos cosas hace que Marcela no encuentre el
  movimiento que anuló ayer.
- **Los tests de reportes prueban números, no formato.** Hay un `verify` que falla si
  `reportes.test.ts` menciona `formatCurrency`: un test que compara `"$ 564.000"` se rompe cuando
  cambia el locale y no prueba la aritmética, que es lo único que importa aquí.
- **Neutraliza la inyección de fórmulas al exportar.** Un campo que empieza con `=`, `+`, `-` o `@`
  se abre como fórmula en Excel. `escaparCampoCsv` le antepone una comilla simple. Es la parte de la
  exportación que nadie recuerda hasta que un nombre de proveedor ejecuta algo.
- **El tope de exportación es el que importa de verdad.** 5 por hora por usuario. Los 120 req/min de
  los otros endpoints protegen contra el accidente; este protege contra llevarse la base completa, y
  es el único límite del módulo con esa función.
- **Purgar no es borrar la fila.** Desvincular deja `Employee` en pie con su historial de pagos
  intacto y vacía sólo los campos bancarios y de contacto. El borrado duro de un trabajador no existe
  en este módulo.
- **`AdminSidebar` se modifica con cirugía.** Finanzas se filtra siempre por `moduleAccess`; los otros
  tres módulos conservan el bypass de `isAdmin` exactamente como está hoy. Cambiar el comportamiento
  de Operaciones, CRM o Inventario está fuera de alcance y rompe interfaces congeladas.
- **`CLAUDE.md` se fusiona, no se sobrescribe.** El bloque de Finanzas entra entre los marcadores
  `<!-- FINANZAS:INICIO -->` y `<!-- FINANZAS:FIN -->`, una sola vez. Reemplazar el archivo destruye
  la memoria de los otros tres módulos.
- **Escritorio y denso:** alto de fila 40px, montos en Geist Mono con `tabular-nums`. Ingreso
  `#15803D`, egreso `#B91C1C`, primario `#1D4ED8`. Los gráficos del resumen usan Recharts, que ya
  está en el repo.
- **Estilo de archivo:** comillas dobles, punto y coma, 2 espacios — es `.prettierrc` del repo.

Reglas completas del proyecto: `CLAUDE.md`. Reglas del área: `.claude/rules/finanzas.md`. Los dos
están en la raíz del proyecto.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E5-T1` — Reportes y resumen del mes

**Depende de:** `E3-T1` · **Prioridad:** p1 — metadato para recortes de alcance, no un orden de
ejecución

El cuarto dolor de la lista: cuadrar ingresos y egresos. Es la pantalla que Marcela abre primero, así
que la aritmética de atrás tiene que ser aburrida y probada.

`resumirPeriodo` suma ingresos, suma egresos, devuelve el saldo — **excluyendo los `ANULADO`**. Es la
regla que hace que anular un movimiento signifique algo. Un período con sólo egresos devuelve
`ingresos: 0` y un saldo negativo; eso es correcto y hay una aceptación que lo fija, porque el
reflejo de "proteger" el saldo con un `Math.abs` esconde exactamente el mes que hay que mirar.

`agruparPorCategoria` mete las transacciones sin `categoryId` bajo `"Sin categoría"` en vez de
descartarlas. Descartarlas hace que la suma de las categorías no cuadre con el total, y ese
descuadre es imposible de diagnosticar desde la pantalla.

El arreglo sale ordenado de mayor a menor por monto: la categoría donde se va la plata va arriba,
sin que nadie tenga que ordenar la tabla a mano.

Cada KPI del resumen enlaza a su lista filtrada. Un número sin salida es un número que genera una
pregunta que nadie puede responder sin abrir la base.

**Archivos**

- `lib/finanzas/reportes.ts` — nuevo: `resumirPeriodo`, `agruparPorCategoria`
- `lib/finanzas/reportes.test.ts` — nuevo
- `app/api/finanzas/reportes/route.ts` — nuevo: `GET` agregados del período
- `app/(admin)/admin/finanzas/page.tsx` — nuevo: resumen del mes, la raíz del módulo

**Aceptación**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** `resumirPeriodo` recibe transacciones que incluyen una en estado `ANULADO` **EL SISTEMA DEBERÁ** excluirla de los tres totales.
2. **CUANDO** `resumirPeriodo` recibe sólo egresos **EL SISTEMA DEBERÁ** devolver `ingresos: 0` y un `saldo` negativo igual al total de egresos con signo invertido.
3. **CUANDO** `agruparPorCategoria` recibe transacciones sin `categoryId` **EL SISTEMA DEBERÁ** agruparlas bajo la etiqueta `"Sin categoría"` en vez de descartarlas.
4. **CUANDO** `agruparPorCategoria` devuelve el arreglo **EL SISTEMA DEBERÁ** entregarlo ordenado de mayor a menor por monto.
5. **CUANDO** `npx vitest run lib/finanzas/reportes.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto.

```bash
npx vitest run lib/finanzas/reportes.test.ts
npx vitest run lib/finanzas/routes.test.ts
! grep -q 'formatCurrency' lib/finanzas/reportes.test.ts
npm run test
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T1: reportes y resumen del mes"
git tag step-17-reportes
```

### `E5-T2` — Visor de auditoría

**Depende de:** `E1-T4`, `E3-T1` · **Prioridad:** p0

Esta pantalla es lo que convierte la promesa de seguridad del módulo en algo comprobable. El modelo
de amenaza acordado es el escenario (A): la defensa contra un acceso indebido no es impedirlo, es que
quede registrado y a la vista. Un registro que nadie puede leer no cumple esa función, así que el
visor no es un extra — es la mitad visible del control.

Lo ven **los dos roles**: Marcela y Elizabeth. Que la dueña pueda revisar quién tocó qué, sin pedirle
permiso a nadie, es el punto entero.

Sólo `GET`. `FinanceAuditLog` es append-only y eso se hace cumplir con la ausencia de rutas de
mutación, no con un comentario en el schema. El `verify` falla si aparece cualquier otro método
exportado en el archivo.

Paginado con `resolverPaginacion` del epic 03, con 25 filas por defecto. El log crece para siempre y
sin paginación esta pantalla se vuelve inusable justo cuando más se necesita.

Filtros útiles: por actor, por tipo de entidad, por rango de fechas. Los tres se resuelven en el
`where` de Prisma.

**Archivos**

- `app/api/finanzas/auditoria/route.ts` — nuevo: `GET` paginado y filtrado. **Sólo `GET`**
- `app/(admin)/admin/finanzas/auditoria/page.tsx` — nuevo: visor con filtros

**Aceptación**

1. **CUANDO** se inspecciona `app/api/finanzas/auditoria/route.ts` **EL SISTEMA DEBERÁ** exportar únicamente `GET`, sin `POST`, `PATCH`, `PUT` ni `DELETE`.
2. **CUANDO** `GET /api/finanzas/auditoria` lo llama una sesión con `FINANZAS_LECTURA` **EL SISTEMA DEBERÁ** responder `200` con las filas paginadas.
3. **CUANDO** `GET /api/finanzas/auditoria` lo llama una sesión sin ningún módulo de Finanzas **EL SISTEMA DEBERÁ** responder `403`.
4. **CUANDO** `GET /api/finanzas/auditoria` se llama sin parámetros **EL SISTEMA DEBERÁ** devolver como máximo 25 filas, aplicando el `pageSize` por defecto.
5. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
! grep -qE 'export async function (POST|PATCH|PUT|DELETE)' app/api/finanzas/auditoria/route.ts
grep -q 'resolverPaginacion' app/api/finanzas/auditoria/route.ts
npm run test
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T2: visor de auditoria"
git tag step-18-visor-auditoria
```

### `E5-T3` — Exportación CSV limitada y auditada

**Depende de:** `E1-T8`, `E3-T1` · **Prioridad:** p1

Marcela viene de Excel y va a querer sacar los datos a Excel. La exportación es una función legítima
y también la vía más eficiente para llevarse todo, así que lleva los tres controles juntos: límite,
auditoría y escapado.

**El límite** es 5 por hora por usuario, vía `checkRateLimit` del epic 01. Es el único límite del
módulo pensado contra la extracción masiva y no contra el accidente. Al exceder: `429` con la
cabecera `Retry-After`.

**La auditoría** registra el rango exportado y el conteo de filas. Si alguien saca la base entera, la
fila queda.

**El escapado** es `escaparCampoCsv`, en `lib/finanzas/csv.ts`, con tres reglas y un test cada una:
coma → el campo va entre comillas dobles; comilla doble interna → se duplica dentro del campo
entrecomillado; valor que empieza con `=` → se le antepone una comilla simple. La tercera es
seguridad, no formato: sin ella, un nombre de proveedor que empieza con `=` se ejecuta como fórmula
al abrir el archivo.

`lib/finanzas/csv.ts` es un archivo nuevo. `lib/csv.ts` es del CRM y no se toca.

**Archivos**

- `lib/finanzas/csv.ts` — nuevo: `escaparCampoCsv` y el armador de filas
- `lib/finanzas/csv.test.ts` — nuevo
- `app/api/finanzas/export/route.ts` — nuevo: `GET` CSV, limitado y auditado

**Aceptación**

1. **CUANDO** `escaparCampoCsv` recibe un valor que contiene una coma **EL SISTEMA DEBERÁ** devolverlo envuelto en comillas dobles.
2. **CUANDO** `escaparCampoCsv` recibe un valor que contiene una comilla doble **EL SISTEMA DEBERÁ** duplicarla dentro del campo entrecomillado.
3. **CUANDO** `escaparCampoCsv` recibe un valor que empieza con `=` **EL SISTEMA DEBERÁ** anteponerle una comilla simple para neutralizar la inyección de fórmulas.
4. **CUANDO** `GET /api/finanzas/export` se llama por sexta vez dentro de una hora por el mismo usuario **EL SISTEMA DEBERÁ** responder `429` con la cabecera `Retry-After`.
5. **CUANDO** `GET /api/finanzas/export` devuelve un CSV **EL SISTEMA DEBERÁ** haber escrito una fila de auditoría `EXPORTAR` con el rango y el conteo de filas.
6. **CUANDO** `npx vitest run lib/finanzas/csv.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify**

```bash
npx vitest run lib/finanzas/csv.test.ts
npx vitest run lib/finanzas/routes.test.ts
grep -q 'checkRateLimit' app/api/finanzas/export/route.ts
grep -q 'EXPORTAR' app/api/finanzas/export/route.ts
npm run test
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T3: exportacion CSV limitada y auditada"
git tag step-19-export-csv
```

### `E5-T4` — Sidebar, desvinculación con purga, specs y barrido final

**Depende de:** `E4-T2`, `E5-T1`, `E5-T2`, `E5-T3` · **Prioridad:** p0

La tarea de cierre. Cuatro entregables y ningún atajo.

**El sidebar** cierra el quinto hallazgo del §1. `components/ui/AdminSidebar.tsx:148` hoy dice
`const visibleModules = isAdmin ? MODULES : MODULES.filter(...)`. Con Finanzas adentro, ese bypass le
muestra el link a cualquier ADMIN — el middleware lo rebota, sí, pero un link que siempre da error es
un defecto, y peor: sugiere que el módulo está ahí para quien no debería verlo. Finanzas se filtra
siempre por `moduleAccess`; **los otros tres módulos conservan el bypass exactamente como está**.

**La desvinculación** cumple la decisión de retención: `status: DESVINCULADO`, `terminatedAt` con hora
del servidor, y `bankAccountEnc`, `bankAccountLast4`, `bankName`, `bankAccountType`, `email` y `phone`
a `null`, con `purgedAt` fechado. El historial —`PayrollItem`, `Advance`, `FinanceTransaction`— queda
intacto: son seis años de obligación tributaria. Dejas de custodiar la cuenta bancaria de alguien que
ya no trabaja contigo, sin perder el respaldo de lo que se le pagó.

**Los `*.spec.md`** son la convención 2 del `CLAUDE.md` del repo. El `verify` recorre cada `route.ts`
y cada `page.tsx` de Finanzas y falla si a alguno le falta el suyo. Si los fuiste escribiendo en cada
epic, esto pasa solo; si no, es aquí donde se paga.

**La fusión de `CLAUDE.md`** entra entre `<!-- FINANZAS:INICIO -->` y `<!-- FINANZAS:FIN -->`, y el
`verify` comprueba que el marcador aparezca **exactamente una vez**: ni cero (no se fusionó) ni dos
(se fusionó dos veces y el archivo tiene el bloque duplicado). El contenido está en
`workspace/CLAUDE.md`.

Y el barrido: los cuatro comandos del portón, en verde, sobre el árbol completo.

**Archivos**

- `components/ui/AdminSidebar.tsx` — se modifica: módulo Finanzas sin bypass de `isAdmin`
- `app/api/finanzas/empleados/[id]/desvincular/route.ts` — nuevo: `POST` desvincula y purga
- `app/api/finanzas/**/*.spec.md` — los que falten
- `app/(admin)/admin/finanzas/**/*.spec.md` — los que falten
- `CLAUDE.md` — se fusiona el bloque de Finanzas

**Aceptación**

1. **CUANDO** se lee `components/ui/AdminSidebar.tsx` **EL SISTEMA DEBERÁ** filtrar el módulo Finanzas por `moduleAccess` incluso cuando `isAdmin` es `true`, y conservar el bypass para los otros tres módulos.
2. **CUANDO** `POST /api/finanzas/empleados/[id]/desvincular` corre **EL SISTEMA DEBERÁ** dejar `bankAccountEnc`, `bankAccountLast4`, `bankName`, `bankAccountType`, `email` y `phone` en `null`, y `purgedAt` con la hora del servidor.
3. **CUANDO** se desvincula a un trabajador **EL SISTEMA DEBERÁ** conservar todas sus filas de `PayrollItem` y `Advance` sin modificarlas.
4. **CUANDO** se listan los archivos de ruta y de página creados por este cambio **EL SISTEMA DEBERÁ** tener un `*.spec.md` al lado de cada uno.
5. **CUANDO** se lee el `CLAUDE.md` del repo **EL SISTEMA DEBERÁ** contener el marcador `<!-- FINANZAS:INICIO -->` una sola vez.
6. **CUANDO** `npm run typecheck && npm run test && npm run build` corre **EL SISTEMA DEBERÁ** salir 0 en los cuatro comandos.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
test "$(grep -c '<!-- FINANZAS:INICIO -->' CLAUDE.md)" -eq 1
grep -q 'FINANZAS' components/ui/AdminSidebar.tsx
test -f 'app/api/finanzas/empleados/[id]/desvincular/route.ts'
test -f 'app/api/finanzas/empleados/[id]/desvincular/route.spec.md'
for f in $(find app/api/finanzas 'app/(admin)/admin/finanzas' -name 'route.ts' -o -name 'page.tsx'); do test -f "${f%.*}.spec.md" || exit 1; done
npm run typecheck
npm run test
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T4: sidebar, desvinculacion con purga, specs y barrido final"
git tag step-20-cierre-finanzas
```

---

## Aceptación del epic

El epic está hecho —y con él el módulo completo— cuando las cuatro tareas están en `done` **y**:

1. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre sobre las dieciséis rutas del módulo **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
2. **CUANDO** se busca `export async function DELETE` en todo `app/api/finanzas/` **EL SISTEMA DEBERÁ** no encontrarlo.
3. **CUANDO** se lista cada `route.ts` y cada `page.tsx` de Finanzas **EL SISTEMA DEBERÁ** encontrar su `*.spec.md` al lado.
4. **CUANDO** `npm run typecheck && npm run test && npm run build` corre **EL SISTEMA DEBERÁ** salir 0 en los cuatro.

```bash
npm run typecheck && npm run test && npm run build
npx vitest run lib/finanzas/routes.test.ts
! grep -rq 'export async function DELETE' app/api/finanzas/
test "$(grep -c '<!-- FINANZAS:INICIO -->' CLAUDE.md)" -eq 1
```

Desde la raíz del proyecto. Cuando esto está en verde, corre el portón de §20.1 del blueprint — es la
compuerta de aceptación del cambio completo, no sólo de este epic.

## Trampas

- **Quitarle el bypass de `isAdmin` a todos los módulos.** El cambio es quirúrgico: sólo Finanzas.
  Tocar Operaciones, CRM o Inventario rompe interfaces congeladas de §5 y le quita el panel a gente
  que hoy trabaja con él.
- **Sobrescribir `CLAUDE.md`.** El archivo del repo tiene la memoria de los otros tres módulos.
  `workspace/CLAUDE.md` es un bloque que se **inserta**, y el `verify` del marcador es lo que
  distingue una fusión de un reemplazo.
- **Fusionar dos veces.** Re-ejecutar el paso duplica el bloque y el `grep -c` da 2. El `verify` exige
  exactamente 1, así que la operación tiene que ser idempotente: si el marcador ya está, no
  reinsertar.
- **Borrar la fila del trabajador al desvincular.** Se lleva por delante seis años de respaldo
  tributario. Se purgan campos, nunca la fila.
- **Purgar y olvidar `purgedAt`.** Sin esa marca no hay forma de distinguir un trabajador cuyos datos
  bancarios se purgaron de uno que nunca los tuvo cargados.
- **`Math.abs` sobre el saldo.** Un saldo negativo es información, no un error de formato. Esconderlo
  con valor absoluto es exactamente lo contrario de lo que Marcela necesita ver.
- **Descartar las transacciones sin categoría** en `agruparPorCategoria` hace que la suma de las
  categorías no cuadre con el total del resumen, y ese descuadre es indiagnosticable desde la
  pantalla.
- **Olvidar el escapado de fórmulas.** Es la única de las tres reglas de `escaparCampoCsv` que es
  seguridad y no formato, y es la que se omite porque el CSV "se ve bien" sin ella.
- **Exportar sin límite "porque es sólo lectura".** La exportación es la vía más eficiente para
  llevarse la base entera. El tope de 5/hora es el control, y sin él los otros tres candados del
  módulo protegen una puerta que quedó abierta al lado.
- **Dejar los `*.spec.md` para el final.** El `verify` de `E5-T4` los exige todos; escribirlos en su
  epic cuesta minutos, reconstruirlos al cierre cuesta una tarde.

## Antes de seguir

- [ ] Las cuatro tareas están en `done` en `tasks.json` — ninguna quedó en `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` fue editado, y ninguno se saltó porque un archivo no existiera.
- [ ] Las cuatro etiquetas de checkpoint están en git: `step-17-reportes`, `step-18-visor-auditoria`,
      `step-19-export-csv` y `step-20-cierre-finanzas`.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio.
- [ ] Los tres contratos de la tabla "Producidos" existen con la firma indicada.
- [ ] `<!-- FINANZAS:INICIO -->` aparece exactamente una vez en `CLAUDE.md`.
- [ ] El bypass de `isAdmin` sigue vigente para Operaciones, CRM e Inventario, y no para Finanzas.
- [ ] Ningún archivo fuera del subárbol fue modificado, salvo las dos excepciones nombradas.
- [ ] Este epic no agregó ninguna variable de entorno; `VARIABLES_ENTORNO.md` no cambia.
- [ ] Un commit por tarea, cada uno con su id de prefijo, cada uno seguido de su etiqueta.
- [ ] **El portón de §20.1 del blueprint corre y pasa.** Es la compuerta del cambio completo.
