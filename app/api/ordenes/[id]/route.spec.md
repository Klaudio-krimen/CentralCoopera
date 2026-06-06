# API Route: /api/ordenes/[id]

**Archivo:** `app/api/ordenes/[id]/route.ts`

## GET /api/ordenes/[id]
**Implementación:**
1. Verificar sesión y permisos (CHOFER solo su propia orden, RECEPCION y ADMIN cualquiera)
2. `prisma.pickupOrder.findUnique()` con includes completos: `driver`, `company`, `items.materialType`, `evidences`, `discrepancy`
3. Retornar 404 si no existe o no tiene permiso

## PATCH /api/ordenes/[id]
**Implementación:**
1. Verificar sesión y permisos
2. Cargar la orden actual
3. Verificar que la orden no esté CERRADA
4. Validar que la transición de status sea válida (solo las definidas en FLUJOS_DE_USUARIO.md)
5. Si se envían `items`: borrar items existentes y crear los nuevos (dentro de una transacción)
6. Si se envían `receivedItems`:
   - Actualizar `receivedQuantity` en cada OrderItem
   - Calcular discrepancias
   - Si hay discrepancia: crear registro Discrepancy y cambiar status a DISCREPANCIA
   - Si no: cambiar status a RECIBIDA
7. Si status cambia a `EN_TRANSITO`: registrar `pickupAt = new Date()`
8. Si status cambia a `RECIBIDA` o `DISCREPANCIA`: registrar `deliveredAt = new Date()`
9. Guardar y retornar la orden actualizada
