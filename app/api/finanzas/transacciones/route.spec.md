# API Route: /api/finanzas/transacciones

**Archivo:** `app/api/finanzas/transacciones/route.ts`

## GET /api/finanzas/transacciones

**Acceso:** `hasFinanceAccess`.

Lista paginada en la base (`resolverPaginacion()`, tope 100), filtros `kind`, `desde`, `hasta`,
`categoryId`, `supplierId`, orden por `date` descendente. Incluye `category` y `supplier`. **No
audita.**

## POST /api/finanzas/transacciones

**Acceso:** `canWriteFinance`.

**Cuerpo:** `crearTransaccionSchema` (`kind`, `amount`, `date`, `description`, `categoryId?`,
`supplierId?`, `method`, `reference?`). `status` nace en `CONFIRMADO` (default del schema).

**Implementación:** crea la `FinanceTransaction` y audita `CREAR` (`entityType:
"FinanceTransaction"`) en la misma transacción. Devuelve `201`.
