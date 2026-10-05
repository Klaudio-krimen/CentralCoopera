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

## Privacidad y fechas AUD-002

before/after eliminan password y bankAccountEnc recursivamente; lectura enmascara RUT,
email, phone, address y bankAccountLast4. Escritura ve datos vivos, pero también se enmascaran
snapshots históricos de empleados actualmente purgados/inexistentes y acciones DESVINCULAR.
Usa serializarAuditorias, consultando sólo ID/purgedAt. El log original es inmutable.
Fechas estrictas YYYY-MM-DD: inválidas o rango invertido responden 400; hasta incluye todo el día.
