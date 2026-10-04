# Nuevo usuario

- Conserva roles, selección de módulos y contrato POST `/api/usuarios` existentes.
- Usa `Modal` para gestionar foco, Escape, fondo y retorno al botón "Nuevo usuario".
- Campos con IDs únicos por instancia y etiquetas asociadas. Error anunciado mediante `role="alert"`.
- El formulario indica `aria-busy` al guardar; cierre y Cancelar permanecen deshabilitados
  hasta terminar. El botón conserva texto de guardado junto al spinner.
- Al crear correctamente, cierra, limpia el formulario y refresca la ruta.
- Los errores mantienen los datos del formulario para corregir y reintentar.
- El scroll interno permite acceder a todas las acciones en pantallas pequeñas o con zoom.
- La validación de cliente no reemplaza las reglas y permisos del servidor.
