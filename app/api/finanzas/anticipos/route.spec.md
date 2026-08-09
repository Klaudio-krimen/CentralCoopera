# API Route: /api/finanzas/anticipos

**Archivo:** `app/api/finanzas/anticipos/route.ts`

## GET /api/finanzas/anticipos

**Acceso:** `hasFinanceAccess`.

Lista paginada (`resolverPaginacion()`, tope 100), filtros `employeeId` y `status`, orden por
`requestedAt` descendente. Incluye `employee.fullName`. **No audita.**

## POST /api/finanzas/anticipos

**Acceso:** `canWriteFinance`.

**Cuerpo:** `crearAnticipoSchema` (`employeeId`, `amount`, `requestedAt`, `notes?`).

**Implementación:**

1. `404` si el trabajador no existe.
2. Crea el `Advance` en estado `PENDIENTE` y audita `CREAR` (`entityType: "Advance"`) en la misma
   transacción.

Devuelve `201`.
