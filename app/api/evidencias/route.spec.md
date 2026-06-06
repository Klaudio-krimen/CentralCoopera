# API Route: /api/evidencias

**Archivo:** `app/api/evidencias/route.ts`

## POST /api/evidencias
**Implementación:**
1. Parsear el cuerpo como `multipart/form-data` (usar `formData()` de Next.js)
2. Extraer: `file`, `orderId`, `stage`, `lat`, `lng`
3. Verificar que la orden existe y que el usuario tiene permiso para agregar evidencia en esa etapa
4. Llamar a `saveImage(file, orderId)` de `lib/storage.ts`
5. Crear registro `Evidence` en la base de datos con el path retornado, el timestamp del servidor, y las coordenadas GPS
6. Retornar el registro Evidence creado

## DELETE /api/evidencias/[id]
**Archivo:** `app/api/evidencias/[id]/route.ts`

**Implementación:**
1. Verificar que la evidencia existe
2. Verificar permisos (ADMIN, o el propietario si la orden está en BORRADOR/EN_RETIRO)
3. Llamar a `deleteImage(evidence.imagePath)` de `lib/storage.ts`
4. Eliminar el registro de la base de datos
5. Retornar 204 No Content
