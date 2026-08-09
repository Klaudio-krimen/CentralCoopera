# API Route: /api/finanzas/anticipos/[id]

**Archivo:** `app/api/finanzas/anticipos/[id]/route.ts`

## PATCH /api/finanzas/anticipos/[id]

**Acceso:** `canWriteFinance`.

**Cuerpo:** `editarAnticipoSchema` (`status`: `PAGADO` | `ANULADO`).

**Máquina de estados:** `DESCONTADO` y `ANULADO` son terminales — `409` si el anticipo ya está en
uno de esos estados. Desde `PENDIENTE` o `PAGADO` sólo se puede ir a `PAGADO` o `ANULADO`; `409` en
cualquier otra transición. `DESCONTADO` sólo lo fija `POST /api/finanzas/nominas` al generar la
nómina — esta ruta nunca lo escribe.

**Implementación:**

1. `paidAt` con la hora del **servidor** cuando `status` pasa a `PAGADO`, nunca del cliente.
2. Actualiza y audita: `ANULAR` si `status` es `ANULADO`, `EDITAR` en cualquier otro caso.

Devuelve el anticipo actualizado.
