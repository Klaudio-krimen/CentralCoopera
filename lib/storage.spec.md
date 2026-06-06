# Librería: Almacenamiento de Archivos

**Archivo:** `lib/storage.ts`

## Propósito
Maneja el guardado y eliminación de imágenes (fotos y firmas) en el servidor.

## Función: `saveImage(file: File | Buffer, orderId: string): Promise<string>`

**Proceso:**
1. Valida que el archivo sea imagen (jpg, png, webp)
2. Genera nombre único: `{orderId}_{Date.now()}_{randomUUID().slice(0,8)}.jpg`
3. Crea la carpeta `/public/uploads/{orderId}/` si no existe
4. Guarda el archivo en disco
5. Retorna el path relativo: `/uploads/{orderId}/{nombre}.jpg`

**Errores posibles:**
- Tipo de archivo no permitido → lanza error con código `INVALID_FILE_TYPE`
- Error de escritura en disco → lanza error con código `STORAGE_ERROR`

## Función: `deleteImage(imagePath: string): Promise<void>`

**Proceso:**
1. Construye el path absoluto desde el path relativo
2. Verifica que el archivo exista
3. Elimina el archivo
4. Si la carpeta del orderId quedó vacía, la elimina también

## Función: `saveSignature(dataUrl: string, orderId: string): Promise<string>`

**Proceso:**
1. Convierte el data URL (base64) en buffer PNG
2. Guarda con nombre: `{orderId}_firma.png`
3. Retorna el path relativo

## Notas de implementación
- Usar `sharp` (npm) para validar imágenes y convertir firmas si es necesario
- El directorio base se obtiene de `process.env.UPLOAD_DIR`
- En producción con múltiples instancias del servidor, este sistema no funciona — migrar a S3
