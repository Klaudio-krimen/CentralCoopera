# API Route: /api/finanzas/transacciones/[id]

**Archivo:** `app/api/finanzas/transacciones/[id]/route.ts`

## PATCH /api/finanzas/transacciones/[id]

**Acceso:** `canWriteFinance`.

**Cuerpo:** `editarTransaccionSchema` (todos los campos de `crearTransaccionSchema` opcionales,
más `status?`).

**Implementación:**

1. `404` si no existe.
2. Anular es `status: "ANULADO"` — **nunca borrado duro**, no existe `DELETE` en este archivo.
3. Actualiza y audita: `ANULAR` si `status` pasó a `ANULADO`, `EDITAR` en cualquier otro caso.
   `before`/`after` con el registro completo.

Devuelve la transacción actualizada.
