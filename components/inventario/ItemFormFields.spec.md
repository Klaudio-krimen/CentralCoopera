# Campos del formulario de inventario

**Archivo:** `components/inventario/ItemFormFields.tsx`

- Renderiza los campos tipados del formulario de alta y edición de ítems.
- Identifica etiquetas con `formId` para evitar colisiones entre formularios.
- Limita categoría, unidad de medida y condición a valores del dominio.
- Mantiene controles para detalle, formato, cantidad, porcentaje de llenado y comentario.
- No realiza solicitudes ni persiste información; informa cambios al formulario contenedor.
