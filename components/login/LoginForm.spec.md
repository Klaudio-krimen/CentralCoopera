# LoginForm

Formulario único extraído del login existente. Conserva etiquetas, autocompletado,
remember inicialmente desmarcado y sus valores 1/0, errores, botón/casilla desactivados
al enviar, signIn credentials con redirect:false y navegación a / sólo tras result.ok.
El destino por rol y los límites de sesión siguen impuestos por el servidor.

onEscenaEvento es opcional. Emite FOCO_CORREO, FOCO_CLAVE, BLUR, ACTIVIDAD, ERROR y EXITO;
no entrega valores, longitudes ni eventos de teclado. Un callback defectuoso no afecta
el acceso. Tras éxito puede esperar la celebración; un límite independiente de 750 ms
impide que un callback colgado bloquee router.push/refresh. Sin callback funciona como antes.

El estado del formulario vive una sola vez: resize, movimiento reducido y fallback no lo
desmontan ni borran los campos. Mostrar/ocultar clave cambia el tipo del mismo input y devuelve
el foco a contraseña para conservar la pose de privacidad. Es accesible por teclado.

## Alba

El saludo inicial estable «Bienvenido, equipo» se calcula después del montaje: «Buenos días,
equipo» antes de las 12:00 locales; «Buenas tardes, equipo» después. Sólo se muestra en el
layout de escena. Ante error, la clase login-form-error oculta el saludo para reservar espacio
en el disco. Ambos errores conservan role=alert y el texto vigente.

CSS adapta el contenedor al disco de 60 píxeles lógicos de ancho; el formulario mantiene
opacidad 1 y operabilidad durante la intro. Móvil, puntero grueso y fallback conservan el
layout clásico, sus instrucciones y ayuda. No modifica las reglas de autenticación.

Antecedente de LOGIN-002: se extrajo el formulario sin cambiar signIn ni sesiones. Sin marcar:
ocho horas; marcada: siete días; accesos a Finanzas siempre ocho horas, según contrato servidor.
Nunca se guarda la contraseña ni la preferencia remember en localStorage.
