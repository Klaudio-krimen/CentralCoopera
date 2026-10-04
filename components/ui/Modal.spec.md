# Modal compartido

Diálogo neutro basado en `@base-ui/react/dialog`, sin dependencias nuevas.

- Recibe apertura controlada, disparador, título, contenido, tamaño `md`/`lg`, clase opcional y estado `busy`.
- El título identifica el diálogo para lectores de pantalla. El cierre tiene nombre en español.
- Base UI captura el foco, bloquea interacción/scroll del fondo, permite Escape y devuelve
  el foco al disparador al cerrar. Todos los disparadores son botones nativos.
- Con `busy`, se cancelan cierres por Escape, fondo y botón de cierre; los formularios también
  deshabilitan Cancelar para mantener visible la petición en curso.
- Altura máxima `100dvh - 2rem`, desplazamiento vertical interno y margen lateral de 1rem.
- Transiciones de opacidad/transformación de 150 ms. Con movimiento reducido no hay transición
  ni escalado. No condiciona operaciones ni permisos del servidor.
