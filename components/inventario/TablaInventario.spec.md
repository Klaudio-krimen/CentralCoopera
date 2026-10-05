# Tabla de inventario

**Archivo:** `components/inventario/TablaInventario.tsx`

- Filtra y pagina inventario desde la API, con debounce para la búsqueda.
- Permite edición optimista y revierte el cambio si el servidor rechaza la operación.
- Delega la presentación de cada registro a `FilaInventario`.
- Archivar/eliminar requieren confirmación; las acciones destructivas se muestran solo a ADMIN.
- Exportar e importar mantienen sus rutas y controles existentes.
