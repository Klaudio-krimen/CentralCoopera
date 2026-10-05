# Paso de materiales de una orden

**Archivo:** `components/ordenes/MaterialesOrdenStep.tsx`

- Lista los materiales asociados al retiro y permite elegir tipo, cantidad y unidad.
- Informa alta, edición y eliminación mediante callbacks al flujo contenedor.
- Permite avanzar sin estado inválido solo si el contenedor valida todos los campos requeridos.
- Muestra instrucciones cuando la lista está vacía y asocia cada etiqueta con su control.
- No realiza solicitudes ni persiste información directamente.
