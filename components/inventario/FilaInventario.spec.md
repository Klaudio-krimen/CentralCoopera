# Fila de inventario

**Archivo:** `components/inventario/FilaInventario.tsx`

- Presenta los campos editables del ítem y conserva el formato de tabla del inventario.
- Envía cambios como parches tipados mediante `onCommit`; no persiste directamente.
- Convierte la cantidad usando `parseCantidad` y conserva la relación entre medida y unidad.
- Muestra ajustar stock y editar a los usuarios autorizados por la pantalla contenedora.
- Solo muestra archivar y eliminar cuando `isAdmin` es verdadero.
- Mantiene etiquetas accesibles para los controles de condición y acciones.
