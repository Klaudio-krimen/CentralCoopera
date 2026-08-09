# API Route: /api/finanzas/empleados/[id]/desvincular

**Archivo:** `app/api/finanzas/empleados/[id]/desvincular/route.ts`

## POST /api/finanzas/empleados/[id]/desvincular

**Acceso:** `canWriteFinance`. Es la única ruta que puede mover a un trabajador a
`DESVINCULADO`; `PATCH /api/finanzas/empleados/[id]` lo rechaza explícitamente.

**Cuerpo:** ninguno — la acción es el `id` de la URL.

**Implementación**, dentro de una `prisma.$transaction`:

1. `404` si el trabajador no existe. `409` si ya está `DESVINCULADO`.
2. Actualiza el `Employee`: `status: "DESVINCULADO"`, `terminatedAt` y `purgedAt` con la hora del
   **servidor**, y pone en `null` `bankAccountEnc`, `bankAccountLast4`, `bankName`,
   `bankAccountType`, `email` y `phone`.
3. Audita `DESVINCULAR` (`entityType: "Employee"`) con `before`/`after` del registro.

**Lo que nunca hace:** borrado duro de `Employee`, ni tocar sus filas de `PayrollItem`,
`Advance` o `FinanceTransaction` — ese historial se conserva íntegro por la obligación tributaria
de 6 años. No existe ruta de reactivación: `DESVINCULADO` es terminal.

Devuelve el trabajador serializado.
