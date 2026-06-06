# API Route: /api/ordenes

**Archivo:** `app/api/ordenes/route.ts`

## GET /api/ordenes
Ver especificación completa en [ESPECIFICACION_API.md](../../../ESPECIFICACION_API.md).

**Implementación:**
1. Obtener sesión con `getServerSession()`
2. Construir filtros de Prisma según query params y rol del usuario
3. Si es CHOFER: forzar `where.driverId = session.user.id` (no puede ver órdenes de otros)
4. Ejecutar `prisma.pickupOrder.findMany()` con includes: `driver`, `company`, `_count.items`
5. Retornar paginado

## POST /api/ordenes
**Implementación:**
1. Verificar que el usuario es CHOFER
2. Generar `orderCode` con `generateOrderCode()` (ver lib/db.spec.md)
3. Crear la orden con status `EN_RETIRO` y `driverId = session.user.id`
4. Retornar la orden creada
