# Epic 04: Nóminas

> Después de este epic Marcela genera la liquidación mensual, el sistema descuenta solo los anticipos
> que corresponden, y existe la única ruta de todo el módulo que descifra cuentas bancarias — cerrada
> a escritura, condicionada a que la nómina esté aprobada, y auditada sin filtrar el dato que
> descifra.

| | |
|---|---|
| **Epic id** | `04-nominas` |
| **Tareas** | `E4-T1` … `E4-T2` |
| **Depende de** | `03-movimientos` — completo, las dos tareas · y `E1-T5` (cifrado) para `E4-T2` |
| **Desbloquea** | `05-reportes-cierre` |
| **Paralelo con** | `05-reportes-cierre` puede empezar `E5-T1` y `E5-T2` en paralelo — sólo dependen de `E3-T1` |

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
| El cálculo de líquido | `npx vitest run lib/finanzas/payroll.test.ts` |
| El guardia de porteros | `npx vitest run lib/finanzas/routes.test.ts` |
| Build | `npm run build` |
| Inspeccionar la BD | `npm run db:studio` |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de marcar
cualquier tarea de este epic como hecha.

Ninguna tarea de este epic necesita levantar un servicio. El esquema ya está aplicado desde `E1-T1`.
`E4-T2` sí necesita `FINANZAS_ENCRYPTION_KEY` en `.env.local` — la puso el Bootstrap de §10.

## Subárbol de directorios

```
app/
  api/finanzas/
    nominas/route.ts                 # NUEVO — GET lista de períodos, POST genera la nómina
    nominas/[id]/route.ts            # NUEVO — GET detalle, PATCH aprueba o marca pagada
    nominas/[id]/pago/route.ts       # NUEVO — GET nómina de pago. DESCIFRA. Sólo escritura
  (admin)/admin/finanzas/
    layout.tsx                       # existe desde E2-T1, sólo lectura
    nominas/page.tsx                 # NUEVO — lista de períodos
    nominas/[id]/page.tsx            # NUEVO — detalle, aprobación y nómina de pago
lib/
  access.ts                          # existe, sólo lectura: hasFinanceAccess, canWriteFinance
  utils.ts                           # existe, sólo lectura: apiError, formatCurrency, cn
  db.ts                              # existe, sólo lectura: prisma
  finanzas/
    payroll.ts                       # NUEVO — calcularLiquido, totalizarNomina
    payroll.test.ts                  # NUEVO
    crypto.ts audit.ts serialize.ts schemas.ts paginacion.ts   # existen, sólo lectura
    routes.test.ts                   # existe — su gate corre en cada tarea
```

El grupo de rutas `(admin)` **no aparece en la URL**: `app/(admin)/admin/finanzas/nominas/page.tsx`
sirve `/admin/finanzas/nominas`.

Todo lo que esté fuera de este subárbol está fuera de alcance. Si una tarea parece exigir editar un
archivo que no está en esta lista, detente y reporta.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `PayrollRun` | todos | `period String @unique` en formato `"2026-08"`. `status`: `BORRADOR → APROBADA → PAGADA` |
| `PayrollItem` | todos | `@@unique([payrollRunId, employeeId])`. Todos los montos `Int` |
| `Advance` | `status`, `payrollItemId` | Los `PAGADO` del trabajador pasan a `DESCONTADO` y quedan enlazados |
| `Employee` | sólo lectura, incluido `bankAccountEnc` en `E4-T2` | Es la única lectura de `bankAccountEnc` en todo el módulo |
| `FinanceAuditLog` | escritura de filas `CREAR`, `APROBAR`, `PAGAR` y `DESCIFRAR` | Dentro de la misma `prisma.$transaction` que la mutación |

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-seguridad` | `hasFinanceAccess(user)` | `true` si el usuario tiene `FINANZAS` o `FINANZAS_LECTURA`. **Sin bypass de ADMIN** |
| `01-seguridad` | `canWriteFinance(user)` | `true` sólo con `FINANZAS`. **Sin bypass de ADMIN** |
| `01-seguridad` | `withAudit(tx, entrada)` · `mutarConAuditoria(tx, mutacion, entrada)` | Escribe la fila dentro del `tx` recibido; redacta `bankAccountEnc` y `password` |
| `01-seguridad` | `descifrar(valor)` | Prueba con `FINANZAS_ENCRYPTION_KEY` y, si falla, con `FINANZAS_ENCRYPTION_KEY_PREVIOUS` |
| `01-seguridad` | esquemas de `lib/finanzas/schemas.ts` | zod; montos `int().positive()` |
| `02-datos-maestros` | `GET /api/finanzas/empleados` | Lista de trabajadores por `status` |
| `02-datos-maestros` | `app/(admin)/admin/finanzas/layout.tsx` | Shell y navegación del módulo |
| `03-movimientos` | `resolverPaginacion(params)` | `{ page, skip, take }` con tope duro `take ≤ 100` |
| `03-movimientos` | `POST /api/finanzas/anticipos` | Anticipos en `PENDIENTE`; los `PAGADO` son los que este epic descuenta |
| repo | `apiError(message, status = 400)` | `NextResponse.json({ error: message }, { status })` |
| repo | `formatCurrency(value)` | `es-CL`, `CLP`, `maximumFractionDigits: 0` |
| repo | `prisma` de `@/lib/db` | Cliente Prisma con `$transaction` |

**Producidos** — el epic siguiente depende de esto:

| Export | Firma / contrato | Lo usa |
|---|---|---|
| `calcularLiquido(linea)` | `(l: { grossAmount: number; afpAmount: number; healthAmount: number; otherDeductions: number; advancesApplied: number }) => number`. Nunca negativo: piso en 0 | `05` — el resumen suma líquidos |
| `totalizarNomina(lineas)` | `(l: Linea[]) => { totalGross: number; totalNet: number }`. Arreglo vacío devuelve ceros | `05` |
| `GET /api/finanzas/nominas` | Lista de períodos con sus totales | `05` — el resumen del mes |
| `GET /api/finanzas/nominas/[id]/pago` | Nómina de pago con cuentas descifradas. **Sólo `canWriteFinance`** | ninguno — es una hoja del árbol, a propósito |

## Convenciones que muerden en esta área

- **Cada método exportado de cada `route.ts` llama a su portero**, después de resolver la sesión y
  antes de tocar la base. Lectura: `hasFinanceAccess`. Mutación: `canWriteFinance`. **La excepción es
  `nominas/[id]/pago/route.ts`: su `GET` llama a `canWriteFinance`, no a `hasFinanceAccess`**, porque
  leer cuentas bancarias en claro es una operación de escritura disfrazada de lectura. Hay un
  `verify` que comprueba las dos mitades de esa regla.
- **`calcularLiquido` y `totalizarNomina` son funciones puras en `lib/finanzas/payroll.ts`.** Ahí es
  donde el Vitest del repo las ve. El cálculo del sueldo de una persona es lo último que debería
  vivir sin test dentro de un handler.
- **Aritmética entera, sin excepciones.** Nada de `parseFloat`, nada de `toFixed`, nada de dividir sin
  `Math.round`. Hay un `verify` que busca `parseFloat` y `toFixed` en `payroll.ts` y falla si los
  encuentra. Un peso perdido por redondeo en una liquidación es una conversación con un trabajador.
- **El líquido nunca es negativo.** Si las deducciones superan al bruto, el resultado es 0. Un
  negativo se propaga a los totales del período y ensucia el resumen del epic 05.
- **El período es único.** `@@unique` sobre `PayrollRun.period` y el `POST` traduce esa violación a
  `409`. No hagas un `findFirst` previo: eso es una carrera, y generar dos veces la nómina de agosto
  es exactamente el error que hay que hacer imposible.
- **La generación es una sola transacción.** Crear la cabecera, crear las líneas y marcar los
  anticipos como `DESCONTADO` ocurren juntos o no ocurren. A medio camino quedan anticipos
  descontados contra una nómina que no existe.
- **Sólo se descuentan los anticipos en `PAGADO`.** Los `PENDIENTE` todavía no salieron de la caja y
  los `DESCONTADO` ya se descontaron en otro período. Descontar un `PENDIENTE` le quita al trabajador
  plata que nunca recibió.
- **La auditoría del descifrado no contiene lo descifrado.** La fila registra *cuántas* cuentas se
  descifraron y quién lo hizo, nunca los números. Una bitácora que copia el dato sensible es una
  segunda filtración con nombre de control.
- **Estados de carga, vacío y error en cada lista.** Skeleton de 5 filas, mensaje concreto con botón
  de alta si `canWriteFinance`, y mensaje de error con botón Reintentar.
- **Escritorio y denso:** alto de fila 40px, montos en Geist Mono con `tabular-nums` alineados a la
  derecha. Ingreso `#15803D`, egreso `#B91C1C`, primario `#1D4ED8`.
- **Estilo de archivo:** comillas dobles, punto y coma, 2 espacios — es `.prettierrc` del repo.
- **Cada `route.ts` y cada `page.tsx` nuevo lleva su `*.spec.md` al lado.** El epic 05 verifica que
  estén todos.

Reglas completas del proyecto: `CLAUDE.md`. Reglas del área: `.claude/rules/finanzas.md`. Los dos
están en la raíz del proyecto.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E4-T1` — Nóminas mensuales y cálculo de líquido

**Depende de:** `E3-T2` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de
ejecución

El primer dolor de la lista de Marcela: el pago de sueldos. La tarea son dos piezas con pesos muy
distintos.

`lib/finanzas/payroll.ts` es la pieza pequeña en líneas y la grande en consecuencias.
`calcularLiquido` resta AFP, salud, otras deducciones y anticipos al bruto, con piso en 0. Es
aritmética entera y trivial, y por eso mismo es donde nadie mira dos veces — de ahí que tenga su
propio archivo de test y un `verify` que prohíbe `parseFloat` y `toFixed` en el módulo.

El caso de la aceptación 1 es el que hay que dejar clavado: bruto 800.000, AFP 80.000, salud 56.000,
otras 0, anticipos 100.000 → **564.000**. Si tu implementación da otra cosa, es la implementación.

`totalizarNomina` sobre un arreglo vacío devuelve ceros, no `NaN` ni `undefined`. Un período sin
trabajadores activos es un caso real, no un error.

La segunda pieza es `POST /api/finanzas/nominas`, que genera el período completo en **una sola
transacción**: cabecera, una línea por trabajador `ACTIVO`, y el paso a `DESCONTADO` de cada anticipo
en `PAGADO` de ese trabajador, enlazado al `payrollItemId` que le corresponde. Ese enlace es lo que
después permite responder "¿por qué a Juan le llegaron $80.000 menos en agosto?" sin abrir Excel.

El `PATCH` mueve el estado: `BORRADOR → APROBADA` (fija `approvedById` y `approvedAt`) y
`APROBADA → PAGADA` (fija `paidAt`). Todos los timestamps son del servidor.

**Archivos**

- `lib/finanzas/payroll.ts` — nuevo: `calcularLiquido`, `totalizarNomina`
- `lib/finanzas/payroll.test.ts` — nuevo
- `app/api/finanzas/nominas/route.ts` — nuevo: `GET` lista de períodos, `POST` genera
- `app/api/finanzas/nominas/[id]/route.ts` — nuevo: `GET` detalle, `PATCH` aprueba o marca pagada
- `app/(admin)/admin/finanzas/nominas/page.tsx` — nuevo: lista de períodos

**Aceptación**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** `calcularLiquido` recibe bruto 800000 con AFP 80000, salud 56000, otras deducciones 0 y anticipos 100000 **EL SISTEMA DEBERÁ** devolver 564000.
2. **CUANDO** `calcularLiquido` recibe deducciones que superan al bruto **EL SISTEMA DEBERÁ** devolver 0 y nunca un número negativo.
3. **CUANDO** `totalizarNomina` recibe un arreglo vacío **EL SISTEMA DEBERÁ** devolver `totalGross: 0` y `totalNet: 0`.
4. **CUANDO** `POST /api/finanzas/nominas` recibe un período que ya tiene un `PayrollRun` **EL SISTEMA DEBERÁ** responder `409` y no crear una segunda cabecera.
5. **CUANDO** `POST /api/finanzas/nominas` genera la nómina **EL SISTEMA DEBERÁ** pasar a `DESCONTADO` cada anticipo en estado `PAGADO` del trabajador y enlazarlo al `payrollItemId` correspondiente.
6. **CUANDO** `npx vitest run lib/finanzas/payroll.test.ts` corre **EL SISTEMA DEBERÁ** salir 0 con 0 tests fallidos y 0 omitidos.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto.

```bash
npx vitest run lib/finanzas/payroll.test.ts
npx vitest run lib/finanzas/routes.test.ts
npm run test
! grep -qE 'parseFloat|toFixed' lib/finanzas/payroll.ts
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E4-T1: nominas mensuales y calculo de liquido"
git tag step-15-nominas
```

### `E4-T2` — Nómina de pago con descifrado auditado

**Depende de:** `E1-T5`, `E4-T1` · **Prioridad:** p0

La ruta más sensible del módulo, y la única que llama a `descifrar()`. Devuelve la lista de
trabajadores con su cuenta bancaria en claro para que Marcela arme la transferencia. Tres candados,
los tres verificados:

**Uno.** El portero es `canWriteFinance`, **no** `hasFinanceAccess`. Elizabeth tiene sólo lectura y
ve todo el módulo, incluidos los montos de cada liquidación — pero no las cuentas bancarias en claro.
El `verify` comprueba las dos mitades: que `canWriteFinance` aparezca y que `hasFinanceAccess` **no**
aparezca en el archivo. Usar el portero de lectura aquí es el error que la regla existe para atajar.

**Dos.** La nómina tiene que estar `APROBADA` o `PAGADA`. Una en `BORRADOR` responde `409` con el
mensaje exacto `"La nómina debe estar aprobada antes de generar el pago"`. Descifrar cuentas para un
borrador que todavía se está editando no tiene ningún uso legítimo.

**Tres.** El descifrado escribe **exactamente una** fila de auditoría con `action: "DESCIFRAR"` y el
conteo de cuentas en `after`. Una fila por llamada, no una por cuenta: lo que importa registrar es
que alguien abrió el sobre y cuántas cuentas había adentro. Y la fila **no contiene ningún número de
cuenta**, ni cifrado ni en claro — hay una aceptación dedicada a eso porque es la forma más fácil de
convertir la bitácora en la filtración.

La pantalla de detalle muestra la nómina completa a cualquiera con acceso, y el botón de "Generar
nómina de pago" sólo aparece con `canWriteFinance`. Que el botón esté oculto es presentación; el
`403` del servidor es la seguridad.

**Archivos**

- `app/api/finanzas/nominas/[id]/pago/route.ts` — nuevo: `GET` que descifra, auditado
- `app/(admin)/admin/finanzas/nominas/[id]/page.tsx` — nuevo: detalle, aprobación y nómina de pago

**Aceptación**

1. **CUANDO** `GET /api/finanzas/nominas/[id]/pago` lo llama una sesión con sólo `FINANZAS_LECTURA` **EL SISTEMA DEBERÁ** responder `403` y no descifrar ninguna cuenta.
2. **CUANDO** la nómina está en estado `BORRADOR` **EL SISTEMA DEBERÁ** responder `409` con el mensaje `"La nómina debe estar aprobada antes de generar el pago"`.
3. **CUANDO** la ruta devuelve las cuentas descifradas **EL SISTEMA DEBERÁ** haber escrito exactamente una fila de `FinanceAuditLog` con `action: "DESCIFRAR"` y el conteo de cuentas en `after`.
4. **CUANDO** se inspecciona la fila de auditoría escrita **EL SISTEMA DEBERÁ** no contener ningún número de cuenta, ni cifrado ni en claro.
5. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
6. **CUANDO** `npm run build` corre **EL SISTEMA DEBERÁ** salir 0.

**Verify**

```bash
npx vitest run lib/finanzas/routes.test.ts
grep -q 'canWriteFinance' 'app/api/finanzas/nominas/[id]/pago/route.ts'
! grep -q 'hasFinanceAccess' 'app/api/finanzas/nominas/[id]/pago/route.ts'
grep -q 'DESCIFRAR' 'app/api/finanzas/nominas/[id]/pago/route.ts'
npm run test
npm run typecheck
npm run build
```

**Checkpoint**

```bash
git add -A && git commit -m "E4-T2: nomina de pago con descifrado auditado"
git tag step-16-pago-nomina
```

---

## Aceptación del epic

El epic está hecho cuando las dos tareas están en `done` **y**:

1. **CUANDO** `rutasSinPortero("app/api/finanzas")` corre sobre las tres rutas nuevas de este epic **EL SISTEMA DEBERÁ** devolver un arreglo vacío.
2. **CUANDO** se busca `descifrar` en todo `app/api/finanzas/` **EL SISTEMA DEBERÁ** encontrarlo únicamente en `nominas/[id]/pago/route.ts`, porque ninguna otra ruta descifra nada.
3. **CUANDO** `npm run build` corre con las dos pantallas nuevas en el árbol **EL SISTEMA DEBERÁ** salir 0.

```bash
npm run typecheck && npm run test && npm run build
npx vitest run lib/finanzas/payroll.test.ts
npx vitest run lib/finanzas/routes.test.ts
test "$(grep -rl 'descifrar' app/api/finanzas/ | wc -l)" -eq 1
```

Desde la raíz del proyecto.

## Trampas

- **El portero equivocado en la ruta de pago.** `hasFinanceAccess` es el reflejo, y aquí es el error:
  le abre las cuentas bancarias a Elizabeth. Es `canWriteFinance`, y el `verify` lo comprueba por
  presencia *y* por ausencia.
- **La bitácora que copia el secreto.** Poner la cuenta descifrada en `after` "para trazabilidad"
  convierte `FinanceAuditLog` en una tabla de cuentas bancarias en claro, sin cifrar, que además
  nadie borra nunca. Registra el conteo, no el dato.
- **Una fila de auditoría por cuenta.** Con 20 trabajadores, 20 filas por cada clic. La unidad del
  hecho auditable es la llamada, no la cuenta.
- **Descontar anticipos `PENDIENTE`.** Es plata que no ha salido de la caja. Sólo los `PAGADO`.
- **`findFirst` antes de crear el período** para evitar el duplicado es una carrera. El `@@unique` de
  `period` ya lo resuelve; traduce su error a `409`.
- **Generar la nómina fuera de una transacción** deja anticipos en `DESCONTADO` apuntando a líneas
  que no existen si algo falla a mitad de camino. Y ese estado no se revierte solo.
- **Redondear con `toFixed`** devuelve un `string`, y `"564000.00"` sumado a un número da una
  concatenación silenciosa. En este módulo no hay decimales que redondear: el peso chileno no los
  tiene.
- **El líquido negativo.** Si alguien carga deducciones mayores al bruto, el piso en 0 evita que el
  resumen del epic 05 muestre un total absurdo. No lo dejes pasar "porque no debería ocurrir".

## Antes de seguir

- [ ] Las dos tareas están en `done` en `tasks.json` — ninguna quedó en `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` fue editado, y ninguno se saltó porque un archivo no existiera.
- [ ] Las dos etiquetas de checkpoint están en git: `step-15-nominas` y `step-16-pago-nomina`.
- [ ] `npm run typecheck && npm run test && npm run build` pasa limpio.
- [ ] Los cuatro contratos de la tabla "Producidos" existen con la firma indicada.
- [ ] `descifrar` aparece en exactamente un archivo bajo `app/api/finanzas/`.
- [ ] Ninguna fila de auditoría escrita por este epic contiene un número de cuenta.
- [ ] Ningún archivo fuera del subárbol fue modificado.
- [ ] Este epic no agregó ninguna variable de entorno; `VARIABLES_ENTORNO.md` no cambia.
- [ ] Un commit por tarea, cada uno con su id de prefijo, cada uno seguido de su etiqueta.
