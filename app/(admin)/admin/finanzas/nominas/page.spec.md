# Página: Nóminas

**Ruta:** `/admin/finanzas/nominas`
**Acceso:** `hasFinanceAccess`. Generación sólo si `canWriteFinance`.

## Propósito

Lista de nóminas mensuales por estado, con la generación de una nueva.

## Datos

`prisma.payrollRun.findMany()` ordenado por `period` descendente, tope 100. Para el formulario de
generación: `prisma.employee.findMany({ where: { status: "ACTIVO" } })`.

## Interfaz

- Tabla con período (enlaza al detalle), estado (badge de texto), bruto y líquido totales.
- `NuevaNominaForm.tsx` (sólo escritura): un período (`<input type="month">`) y una fila por
  trabajador `ACTIVO` con bruto y nombre de AFP/isapre precargados de sólo lectura (WCAG 2.2 SC
  3.3.7 — entrada redundante), más los campos editables de descuento AFP, salud y otras
  deducciones. Muestra un líquido estimado en vivo con `calcularLiquido()` de
  `lib/finanzas/payroll.ts` (sin los anticipos, que sólo se conocen en el servidor). `POST
/api/finanzas/nominas`.
