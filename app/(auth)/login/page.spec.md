# Login `/login`

Página pública sin registro. Correo y contraseña con etiquetas asociadas, autocompletado del
navegador y botón de mostrar/ocultar accesible por teclado. El error se anuncia con `role=alert`.

La casilla «Mantener sesión iniciada en este equipo» inicia desmarcada y tiene área táctil de
44 px. Envía `remember=1` o `0` a NextAuth; no guarda la contraseña ni una preferencia en
localStorage. Sin marcar: ocho horas. Marcada: siete días, salvo acceso a Finanzas, siempre ocho
horas. El servidor impone esos límites y revoca sesiones al cambiar contraseña.

El envío desactiva botón y casilla mientras está pendiente. Error de credenciales:
«Correo o contraseña incorrectos»; fallo de conexión: «No se pudo iniciar sesión. Intenta
nuevamente.». Sólo si `result.ok`, navega a `/` y refresca; la raíz resuelve el destino por rol.
No se promete redirección automática desde esta página por middleware.

Logo circular completo oficial: 56 px en panel de escritorio y 48 px en móvil, sin fondo
esmeralda adicional. Panel lateral visible desde 1024 px; formulario limitado a 400 px.
Los textos vecinos identifican la marca, por lo que la imagen es decorativa.

## LOGIN-002 — Turno de noche

El formulario se comparte mediante components/login/LoginForm.tsx. Sigue montado una sola vez
al cambiar tamaño, movimiento reducido o fallback: no borra los campos. La lógica de acceso y
los límites de sesión anteriores se conservan.

Con ancho ≥1024 px y pointer:fine se carga dinámicamente una bodega procedural 320×180. En
móvil o puntero grueso se conserva el layout anterior y no se carga el motor de escena. El SSR
reserva por CSS el layout de escritorio; el formulario se puede utilizar durante la intro.

La intro se salta con foco, tecla o clic. La escena sólo recibe tipos de evento; no recibe
credenciales, longitudes o teclas. Error reacciona al resultado real de signIn; éxito inicia la
navegación después de como máximo 750 ms, sin modificar el destino / ni router.refresh.

Modo reducido y degradación por rendimiento: escena iluminada sin bucle. Si falta canvas o falla
la escena, vuelve al layout anterior con el formulario operativo. El cartel usa azul #2a344d,
campos #1c2438, botón verde #5bbd2f y foco amarillo #f2c230; fuente pixel sólo en su título.

El decorado sigue el revelado del prototipo; el formulario mantiene opacidad 1 desde el SSR
para conservar contraste AA durante la intro, además de seguir disponible para interacción.
