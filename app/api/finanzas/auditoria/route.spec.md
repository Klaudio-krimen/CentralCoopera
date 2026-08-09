# API Route: /api/finanzas/auditoria

**Archivo:** `app/api/finanzas/auditoria/route.ts`

## GET /api/finanzas/auditoria

**Acceso:** `hasFinanceAccess` — visible para `FINANZAS` y `FINANZAS_LECTURA` por igual. Que
Elizabeth pueda leer este visor es la mitad del modelo de amenaza del módulo: la defensa no es
impedir, es que quede a la vista.

**Implementación:** lista paginada con `resolverPaginacion()` (25/página, tope 100), filtros
`entityType`, `actorId` y rango de fechas sobre `createdAt`, orden descendente.

**Sólo `GET`.** Este archivo no exporta ni exportará `POST`, `PATCH`, `PUT` ni `DELETE`:
`FinanceAuditLog` es append-only por contrato — no hay ninguna ruta que lo actualice o borre.

**No audita a sí mismo** — leer el log no genera una fila del log.
