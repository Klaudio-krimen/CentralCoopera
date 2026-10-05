# Importar inventario

**Archivo:** `components/inventario/ImportarInventarioModal.tsx`

- Interpreta los archivos CSV y el texto pegado antes de confirmar la importación.
- La previsualización muestra la categoría calculada para cada fila.
- Reconoce nombres EPP sin distinguir mayúsculas, tildes ni separadores; el servidor aplica la misma
  regla al persistir y no confía en la categoría de la previsualización.
- Conserva la cantidad, condición, medidas y datos restantes interpretados por la planilla.
