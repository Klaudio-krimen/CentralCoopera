# EscenaBodega — Alba vintage y Elizabeth

Escena procedural de escritorio del diseño Alba (LOGIN-003) y la variante gráfica aprobada
LOGIN-004. Se monta únicamente con ancho ≥1024 px y `pointer: fine`. Recibe exclusivamente
`EventoEscena`; nunca credenciales, longitudes ni teclas.

## Render y composición

El arte de 320×180 se pinta sobre buffers puros: fondo cacheado, Elizabeth, lámpara, luz,
cielo emisivo y destello. El canvas visible usa escalas enteras de 3 a 12; una capa Canvas 2D
opcional compone gradación, rayos, polvo, bloom de la ventana/ampolleta, viñeta y grano fijo.
Las capas suaves se cachean a resolución acotada (2 píxeles por píxel lógico), al cambiar escala
o avanzar el alba ≥0,02; no se crea un buffer 4K por efecto. El disco se repone al final,
preservando el azul #2a344d en el área de texto, sin tramado, polvo ni postproceso sobre él.

El amanecer avanza desde alba 0,12 a 1 en aproximadamente 14 s de animación. Elizabeth lleva
pelo largo castaño claro con visos rubios, casco y chaleco. Mira al acceso al enfocar correo y
se da vuelta/cubre los ojos al enfocar contraseña. El personaje es estilizado.

## Ciclo de vida y degradación

Un único requestAnimationFrame con dt limitado a 50 ms, cancelado al desmontar. El monitor usa
tiempo real y coste de dibujo: media >50 ms durante una ventana de 2 s congela en alba completa.
No se afirma que esa protección garantice 60 fps o un coste HD ≤4 ms en todo hardware.

Movimiento reducido: alba completa, poses instantáneas, sin rAF, parpadeo, balanceo, polvo ni
destello en movimiento. El modo estático puede dibujar una pose tras un evento y tras 30 s de
inactividad. Cambios de preferencia, tamaño y visibilidad se atienden sin remontar el formulario.

Si la capa HD falla, se libera y queda la escena pixel; si falta Canvas 2D o falla el render
base, se pide el layout clásico. La decoración nunca desactiva el acceso. Se cancelan rAF,
temporizadores de reposo/éxito y listeners; se libera la capa y se resuelve una celebración
pendiente al desmontar o fallar.

## Control y recursos

localStorage sólo conserva `login-escena-vista`; sin almacenamiento se usa intro corta.
Actividad salta la intro y despierta a Elizabeth. ERROR vuelve al foco al terminar; EXITO es
terminal, completa el alba y espera como máximo SUCCESS_MS=700 ms en modo animado. Reducido,
congelación y desmontaje resuelven sin esperar; LoginForm impone además su límite propio de 750 ms.

Canvas aria-hidden y sin tabulación. Press Start 2P autoalojada mediante next/font/local,
preload desactivado, licencia OFL en fonts/; se aplica sólo al título. Sin recursos gráficos
externos, dependencias nuevas, audio ni cambios de CSP/autenticación.

Antecedente: LOGIN-002 «Turno de noche» usaba cartel rectangular y escena nocturna; Alba
reemplaza esa composición manteniendo los contratos de eventos, acceso y fallback.
