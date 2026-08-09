# Página: Anticipos

**Ruta:** `/admin/finanzas/anticipos`
**Acceso:** `hasFinanceAccess`. Alta y acciones sólo si `canWriteFinance`.

## Propósito

Lista de anticipos a trabajadores, filtrable por estado, con alta y acciones de estado.

## Datos

`prisma.advance.findMany()`, filtro `?status=` (`PENDIENTE` | `PAGADO` | `DESCONTADO` |
`ANULADO`), incluye `employee.fullName`.

## Interfaz

- Filtro por estado con `<a href>` reales.
- `NuevoAnticipoForm.tsx` (sólo escritura): selecciona trabajador `ACTIVO`, monto y fecha; `POST
/api/finanzas/anticipos`.
- Tabla con estado (badge de texto, nunca sólo color) y monto en `font-mono tabular-nums`.
- `AccionesAnticipo.tsx`, visible sólo en filas `PENDIENTE`: "Marcar pagado" y "Anular", vía
  `PATCH .../[id]`. Las filas `PAGADO`, `DESCONTADO` y `ANULADO` no muestran acciones.
