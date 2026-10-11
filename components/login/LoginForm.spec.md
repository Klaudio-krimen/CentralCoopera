# LoginForm

Formulario extraído del login existente. Conserva labels, autocompletado, mostrar/ocultar clave,
remember inicialmente desmarcado y sus valores 1/0, errores, botón/casilla desactivados al enviar,
signIn credentials sin redirect automático y navegación a / únicamente tras result.ok.

onEscenaEvento es opcional. Emite FOCO_CORREO, FOCO_CLAVE, BLUR, ACTIVIDAD, ERROR y EXITO;
no entrega valores, longitudes ni eventos de teclado. Un callback defectuoso no afecta el acceso.
Tras éxito puede esperar la celebración; un límite independiente de 750 ms garantiza que un
callback colgado no bloquea router.push/refresh. Sin callback funciona como antes.

El estado del formulario vive una sola vez: resize, movimiento reducido y fallback de escena
no lo desmontan ni borran credenciales. El aspecto de escritorio se limita al CSS del login;
en móvil conserva el formulario original. No modifica reglas de autenticación del servidor.
