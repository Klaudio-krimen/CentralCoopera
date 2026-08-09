# API Route: /api/finanzas/proveedores/[id]

**Archivo:** `app/api/finanzas/proveedores/[id]/route.ts`

## GET /api/finanzas/proveedores/[id]

**Acceso:** `hasFinanceAccess`. Ficha serializada con `serializeSupplier()`. `404` si no existe.
**No audita.**

## PATCH /api/finanzas/proveedores/[id]

**Acceso:** `canWriteFinance`.

**Cuerpo:** `editarProveedorSchema` (campos de `crearProveedorSchema` opcionales, más
`isActive?`).

**Implementación:**

1. `404` si no existe.
2. La baja es `isActive: false` — **nunca borrado duro**; la fila y sus `FinanceTransaction`
   asociadas se conservan íntegras.
3. Si viene `bankAccount`, recifra y recalcula `bankAccountLast4`.
4. Actualiza y audita `EDITAR` con `before`/`after` (redactados por `withAudit()`).

Devuelve el proveedor serializado.
