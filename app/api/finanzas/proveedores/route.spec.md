# API Route: /api/finanzas/proveedores

**Archivo:** `app/api/finanzas/proveedores/route.ts`

## GET /api/finanzas/proveedores

**Acceso:** `hasFinanceAccess`.

Lista paginada (25/página, tope 100) de proveedores activos (`isActive: true`). Cada fila pasa por
`serializeSupplier()`: `bankName` sólo si `canWriteFinance`; `bankAccountEnc` nunca sale. **No
audita.**

## POST /api/finanzas/proveedores

**Acceso:** `canWriteFinance`.

**Cuerpo:** `crearProveedorSchema` (`name`, `rut?`, `email?`, `phone?`, `bankName?`,
`bankAccount?` en texto plano).

**Implementación:**

1. Si viene `bankAccount`, lo cifra con `cifrar()` y calcula `bankAccountLast4`.
2. Crea el `Supplier` y audita `CREAR` (`entityType: "Supplier"`) en la misma transacción.

Devuelve el proveedor serializado con `201`.
