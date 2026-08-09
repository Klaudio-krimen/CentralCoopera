# API Route: /api/finanzas/nominas

**Archivo:** `app/api/finanzas/nominas/route.ts`

## GET /api/finanzas/nominas

**Acceso:** `hasFinanceAccess`. Lista de `PayrollRun` (cabeceras, sin líneas), filtrable por
`period`, orden descendente, tope 100. **No audita.**

## POST /api/finanzas/nominas

**Acceso:** `canWriteFinance`.

**Cuerpo:** `crearNominaSchema` — `{ period: "AAAA-MM", lineas: [{ employeeId, afpAmount,
healthAmount, otherDeductions? }] }`. `afpAmount`/`healthAmount` **no salen de ninguna tasa
almacenada**: `Employee.afp`/`health` son sólo el nombre de la AFP/isapre (texto libre), así que
quien genera la nómina escribe el descuento real de ese mes, una línea por cada `Employee`
`ACTIVO` — decisión confirmada con el dueño del producto durante el build, no inventada.

**Implementación**, dentro de una `prisma.$transaction`:

1. Valida que `lineas` traiga exactamente un `employeeId` por cada trabajador `ACTIVO`, sin
   duplicados ni faltantes — `400` si no.
2. Por cada trabajador: suma sus `Advance` en estado `PAGADO`, calcula `netAmount` con
   `calcularLiquido()` de `lib/finanzas/payroll.ts`, crea el `PayrollItem`, y mueve esos anticipos
   a `DESCONTADO` enlazándolos al `payrollItemId`.
3. Suma `totalGross`/`totalNet` con `totalizarNomina()` y los guarda en la cabecera.
4. Audita `CREAR` (`entityType: "PayrollRun"`).

**Errores:** `409` si ya existe un `PayrollRun` para ese `period` — lo garantiza el índice único de
`PayrollRun.period`, no un chequeo previo que podría correr en carrera.
