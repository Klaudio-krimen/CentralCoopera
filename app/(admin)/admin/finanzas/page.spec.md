# Página: Resumen de Finanzas

**Ruta:** `/admin/finanzas`
**Acceso:** `hasFinanceAccess` (vía `middleware.ts`). Idéntica para `FINANZAS` y
`FINANZAS_LECTURA` — no hay ninguna acción de escritura en esta pantalla.

## Propósito

KPI del mes en curso: ingresos, egresos y saldo, más un desglose por categoría.

## Datos

Lee `FinanceTransaction` del mes calendario actual (`date` entre el primer y el último día),
agrega con `resumirPeriodo()` y `agruparPorCategoria()` de `lib/finanzas/reportes.ts`.

## Interfaz

- Tres tarjetas KPI (ingresos `#15803D`, egresos `#B91C1C`, saldo con signo según valor), montos
  con `formatCurrency()` de `lib/utils.ts` y signo explícito — nunca sólo color.
- `GraficoCategorias.tsx`: gráfico de barras por categoría con Recharts (`#1D4ED8`), o un mensaje
  de estado vacío si no hay movimientos en el período.
