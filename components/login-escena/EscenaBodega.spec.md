# EscenaBodega — Turno de noche

Escena procedural 320×180 del prototipo aprobado LOGIN-002 v2. Sólo se monta con ancho ≥1024 px
y puntero fino. No recibe credenciales: su control acepta exclusivamente EventoEscena.

Fondo pre-renderizado; operaria, lámpara, Bayer y emisivos sobre buffers puros. Un rAF con dt
limitado a 50 ms, cancelado al desmontar. Con movimiento reducido dibuja poses instantáneas sin
bucle. Un coste medio de render superior a 50 ms durante 2 s congela la escena iluminada.

localStorage sólo conserva login-escena-vista; fallo de acceso implica intro corta. Actividad
salta la intro y despierta a la operaria; foco correo mira el cartel, foco clave tapa ojos,
error vuelve al foco al terminar, éxito es terminal y espera 700 ms como máximo. Canvas sin
tabulación y aria-hidden. Fallos de canvas/render llaman al fallback con formulario operativo.

Fuente Press Start 2P autoalojada con `next/font/local` (`fonts/`, licencia OFL; el build no descarga nada de Google Fonts), preload desactivado; se aplica sólo al título de la
escena. Sin recursos gráficos externos, dependencias nuevas, audio ni cambios de CSP.
