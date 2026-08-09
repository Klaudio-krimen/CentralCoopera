# Página: Proveedores

**Ruta:** `/admin/finanzas/proveedores`
**Acceso:** `hasFinanceAccess`. Alta y baja sólo si `canWriteFinance`.

## Propósito

Lista de proveedores del taller de pallets, con alta y baja lógica.

## Datos

`prisma.supplier.findMany({ where: { isActive: true } })`, serializado con `serializeSupplier()`.

## Interfaz

- `NuevoProveedorForm.tsx` (sólo escritura): crea vía `POST /api/finanzas/proveedores`, con RUT,
  contacto y cuenta bancaria opcionales.
- Tabla con nombre, RUT, contacto y últimos 4 dígitos de la cuenta.
- `DesactivarProveedorButton.tsx` (sólo escritura): `PATCH .../[id]` con `isActive: false` — nunca
  borrado duro, la fila y sus `FinanceTransaction` se conservan.
