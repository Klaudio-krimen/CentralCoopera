# Login /login

Página pública sin registro. Correo y contraseña con etiquetas asociadas, autocompletado del
navegador y botón de mostrar/ocultar accesible por teclado. El error se anuncia con role=alert.

La casilla «Mantener sesión iniciada en este equipo» inicia desmarcada y tiene área táctil de
44 px en el layout clásico. Envía remember=1 o 0 a NextAuth; no guarda la contraseña ni una
preferencia en localStorage. Sin marcar: ocho horas. Marcada: siete días, salvo acceso a
Finanzas, siempre ocho horas. El servidor impone esos límites y revoca sesiones al cambiar
contraseña. Esos contratos anteriores al rediseño se conservan.

El envío desactiva botón y casilla mientras está pendiente. Error de credenciales:
«Correo o contraseña incorrectos»; fallo de conexión: «No se pudo iniciar sesión. Intenta
nuevamente.». Sólo si result.ok, navega a / y refresca; la raíz resuelve el destino por rol.
No se promete redirección automática desde esta página por middleware.

## Layout clásico, móvil y fallback

Logo circular oficial completo: 56 px en panel de escritorio y 48 px en móvil. Panel lateral
desde 1024 px; formulario limitado a 400 px. Los textos vecinos identifican la marca,
por lo que la imagen es decorativa. Móvil o puntero grueso conserva este layout.

LoginForm permanece montado una sola vez al cambiar tamaño o movimiento reducido, y si falla
la escena: no borra campos, casilla ni estado de envío. Si falta canvas o falla la carga/render
de la escena, el error boundary y onFallo restauran el layout clásico.

## Alba vintage — LOGIN-003 / LOGIN-004

Con ancho ≥1024 px y pointer:fine se importa dinámicamente EscenaBodega. Una carga móvil o
puntero grueso no descarga el motor ni la fuente de escena. El SSR reserva el disco por CSS;
el formulario se puede usar mientras llega el chunk, durante la intro y tras fallback.

Composición de 320×180 con escala entera de 3 a 12: disco centrado en (184,94), radio 50,
área del formulario de 60 píxeles lógicos de ancho. Amanecer con cordillera y luz cálida,
acabado vintage y Elizabeth Cabrera estilizada, con pelo largo castaño claro y visos rubios.
Fuente pixel autoalojada sólo en el título; azul #2a344d, campos #1c2438, botón #5bbd2f,
foco #f2c230. El formulario mantiene opacidad 1 para contraste desde la primera vista.

Saludo calculado en cliente tras montaje; se oculta con error para mantener campos, casilla,
botón y alerta dentro del disco. No existe un segundo formulario para la escena. Los rótulos
del decorado son aria-hidden y el canvas no participa del foco.

Foco, tecla o clic saltan la intro. La escena recibe sólo tipos de evento, sin credenciales,
longitudes o teclas. Error reacciona al resultado de signIn; EXITO espera como máximo 750 ms
antes de iniciar navegación sin cambiar / ni router.refresh.

Movimiento reducido y degradación por rendimiento: alba completa sin bucle animado; poses
instantáneas por eventos. Fallo de la capa HD conserva escena pixel. Fallo base restaura
layout clásico. Listeners y recursos de escena se liberan al desmontar.

## Verificación requerida

Tipos, tests y build; navegador con foco correo/clave/mostrar clave, ambos errores, remember
0/1 y éxito; resize conservando el único formulario; móvil/puntero grueso sin chunk; reducido
en vivo; fallback canvas y HD por separado; lentitud simulada; geometría/error en escala 3 y
escalas mayores; color final y peso gzip del chunk. Las mediciones locales no prueban
dispositivo físico, cuentas reales ni despliegue.

Antecedente: LOGIN-002 «Turno de noche» introdujo bodega nocturna y cartel rectangular.
La composición Alba aprobada los reemplaza; autenticación, CSP y contratos de degradación
permanecen. Preparado para entrega local; commit, push, Preview y producción se registran
por separado cuando se realicen.
