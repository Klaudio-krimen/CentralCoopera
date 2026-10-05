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
