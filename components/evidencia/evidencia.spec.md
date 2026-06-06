# Componente: EvidenciaUploader

**Ubicación:** `components/evidencia/EvidenciaUploader.tsx`

## Propósito
Permite al usuario tomar o seleccionar fotos y subirlas al servidor. Muestra las fotos ya subidas con opción de eliminar.

## Props
- `orderId: string` — ID de la orden a la que se asocian las fotos
- `stage: "RETIRO" | "RECEPCION"` — etapa de la cadena de custodia
- `maxPhotos: number` — máximo de fotos permitidas (default: 5)
- `existingPhotos: Evidence[]` — fotos ya subidas (para mostrar en la lista inicial)
- `onChange(photos: Evidence[]): void` — callback cuando cambia la lista de fotos

## Interfaz
- Botón "Tomar foto" que abre `<input type="file" capture="environment" accept="image/*">`
- Cuadrícula de miniaturas con botón "X" para eliminar
- Indicador de progreso de subida por foto
- Cuando se alcanza `maxPhotos`, el botón "Tomar foto" se deshabilita con mensaje "Máximo {n} fotos"

## Proceso de subida
1. Usuario selecciona imagen
2. El componente comprime la imagen en el cliente si supera 1MB (usando `canvas.toBlob()`)
3. Envía `POST /api/evidencias` con `multipart/form-data`
4. Muestra spinner en la miniatura mientras sube
5. Reemplaza el spinner con la imagen al completar
6. Si falla: muestra error en rojo con botón "Reintentar"

## Eliminar foto
1. Click en "X" de una miniatura
2. Pide confirmación: "¿Eliminar esta foto?"
3. Llama a `DELETE /api/evidencias/{id}`
4. Quita la miniatura de la lista

## Compresión en cliente
- Si el archivo supera `MAX_PHOTO_SIZE_MB` (variable de entorno), redimensionar al 70% de calidad con canvas
- Dimensión máxima: 1920px en el lado más largo
