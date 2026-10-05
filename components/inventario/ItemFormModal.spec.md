# Crear y editar un ítem de inventario

El ciclo de vida del diálogo y la persistencia se mantienen en `ItemFormModal.tsx`; los controles
del formulario se renderizan en `ItemFormFields.tsx`.

- Conserva el contrato y conversiones numéricas actuales de POST/PATCH de inventario.
- Usa `Modal`, con título según creación/edición y ancho máximo de 512 px.
- Al abrir se recargan los datos del ítem y se limpia el error. El disparador es un botón nativo.
- Campos con IDs únicos y etiquetas asociadas. Base UI gobierna el foco inicial según
  interacción, sin forzar la apertura del teclado virtual mediante `autoFocus`.
- El formulario anuncia error y guardado; durante la petición se impiden cierres y se
  deshabilita Cancelar. El botón de guardado conserva texto junto al spinner.
- Una respuesta correcta cierra y refresca; una respuesta fallida conserva el formulario.
- Altura adaptada al viewport y scroll interno mantienen accesibles las acciones finales.
- Al escribir un artículo reconocido como EPP, selecciona esa categoría antes de enviar; el servidor
  aplica la misma regla como autoridad final.
