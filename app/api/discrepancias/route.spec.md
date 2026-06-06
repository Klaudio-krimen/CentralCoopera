# API Route: /api/discrepancias

**Archivo:** `app/api/discrepancias/route.ts` y `app/api/discrepancias/[id]/route.ts`

## GET /api/discrepancias
Solo ADMIN.

**Implementación:**
1. Construir filtros desde query params: `status`, `severity`, `driverId`, `from`, `to`
2. `prisma.discrepancy.findMany()` con include: `order.driver`, `order.company`
3. Ordenar por: PENDIENTE primero, luego GRAVE, luego por fecha descendente
4. Retornar paginado

## PATCH /api/discrepancias/[id]
Solo ADMIN.

**Implementación:**
1. Cargar la discrepancia
2. Validar que el cambio de estado es válido (PENDIENTE → EN_INVESTIGACION → RESUELTA)
3. Si status = RESUELTA: requerir `resolutionNotes`, guardar `resolvedAt = new Date()` y `resolvedById = session.user.id`
4. Si se resuelve la discrepancia: cambiar el status de la orden a CERRADA
5. Guardar y retornar
