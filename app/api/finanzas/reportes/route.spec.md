# API Route: /api/finanzas/reportes

**Archivo:** `app/api/finanzas/reportes/route.ts`

## GET /api/finanzas/reportes?desde=&hasta=

**Acceso:** `hasFinanceAccess`. Es sólo lectura de agregados, sin diferencia entre `FINANZAS` y
`FINANZAS_LECTURA`.

**Implementación:**

1. Lee las `FinanceTransaction` del rango (`desde`/`hasta` sobre `date`, ambos opcionales).
2. `resumirPeriodo()` de `lib/finanzas/reportes.ts` agrega `{ ingresos, egresos, saldo }` sobre
   filas ya leídas, ignorando `ANULADO`.
3. `agruparPorCategoria()` suma por categoría (sin categoría → `"Sin categoría"`), ordenado de
   mayor a menor.

**Respuesta:** `{ ingresos, egresos, saldo, categorias: [{ categoryId, nombre, monto }] }`.

**No audita** — es lectura.
