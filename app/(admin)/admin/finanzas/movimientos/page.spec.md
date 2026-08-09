# Página: Movimientos

**Ruta:** `/admin/finanzas/movimientos`
**Acceso:** `hasFinanceAccess`. Formulario de alta, panel de categorías y botón de anular sólo si
`canWriteFinance(session.user)` — la lectura es la misma tabla para ambos roles.

## Propósito

Lista de ingresos y egresos con filtro y alta.

## Datos

`prisma.financeTransaction.findMany()` paginado con `resolverPaginacion()`, filtros `kind`,
`categoryId`, `desde`, `hasta` vía query string (`<form method="get">`, sin JS).

## Interfaz

- Filtros por tipo, categoría y rango de fechas.
- `NuevoMovimientoForm.tsx` (sólo escritura): crea vía `POST /api/finanzas/transacciones`.
- `CategoriasPanel.tsx` (sólo escritura): crea categorías vía `POST /api/finanzas/categorias`.
- Tabla con signo `+`/`−` y color por tipo, badge de estado, monto en `font-mono tabular-nums`.
- `AnularMovimientoButton.tsx`: `PATCH .../[id]` con `status: "ANULADO"`, confirmación con monto y
  descripción antes de anular. Oculto si la fila ya está `ANULADO`.
- Paginador con `<a href>` reales (compartible, sin estado oculto en JS).
