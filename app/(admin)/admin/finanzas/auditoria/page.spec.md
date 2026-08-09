# Página: Visor de auditoría

**Ruta:** `/admin/finanzas/auditoria`
**Acceso:** `hasFinanceAccess`. **Idéntica para `FINANZAS` y `FINANZAS_LECTURA`** — no hay
ninguna acción de escritura en esta pantalla. Que Elizabeth pueda leer este visor es la mitad del
modelo de amenaza del módulo.

## Propósito

Tabla de `FinanceAuditLog`, filtrable y con el detalle de cada mutación.

## Datos

`prisma.financeAuditLog.findMany()` paginado con `resolverPaginacion()` (25/página, tope 100),
filtros `entityType`, `actorId` y rango de fechas sobre `createdAt`. Los valores de los filtros
salen de los distintos ya presentes en el propio log (`distinct`), no de una lista fija ni de la
tabla `User` — una fila de auditoría no depende de que el usuario siga existiendo.

## Interfaz

- Filtros por entidad, actor, desde y hasta (`<form method="get">`).
- Tabla: fecha, actor (correo y rol **tal como estaban en el momento del hecho**, no una relación
  viva), acción (badge de texto), entidad.
- Columna "Detalle": `<details>` semántico con `before`/`after` en JSON, sin JavaScript adicional.
- Paginador con `<a href>` reales.
