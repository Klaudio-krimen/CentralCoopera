# API Route: /api/finanzas/nominas/[id]

**Archivo:** `app/api/finanzas/nominas/[id]/route.ts`

## GET /api/finanzas/nominas/[id]

**Acceso:** `hasFinanceAccess`. Cabecera + líneas. RUT de cada línea enmascarado con
`enmascararRut()` para `FINANZAS_LECTURA`, completo para `canWriteFinance` — sin números de cuenta
en ningún caso, ésos sólo salen por `GET .../pago`. **No audita.**

## PATCH /api/finanzas/nominas/[id]

**Acceso:** `canWriteFinance`.

**Cuerpo:** `editarNominaSchema` (`status`: `APROBADA` | `PAGADA`).

**Máquina de estados, sin vuelta atrás:** `BORRADOR → APROBADA → PAGADA`. Cualquier transición
fuera de esas dos flechas responde `409`.

**Implementación:**

1. `approvedAt`/`approvedById` con la hora y el actor del **servidor** al pasar a `APROBADA`.
2. `paidAt` con la hora del **servidor** al pasar a `PAGADA`.
3. Audita `APROBAR` o `PAGAR` según el destino, con `before`/`after`.
