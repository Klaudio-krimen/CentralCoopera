# `TurnoControl` — interruptor de turno del chofer

Montado en `app/(chofer)/layout.tsx`, debajo de `ChoferHeader`. Es la única puerta de
entrada al rastreo GPS: reemplaza a `PositionPinger`, que arrancaba solo.

## Qué cambió respecto de `PositionPinger`

| Antes                                               | Ahora                                       |
| --------------------------------------------------- | ------------------------------------------- |
| El GPS partía al abrir cualquier pantalla `/chofer` | Parte cuando el chofer toca "Iniciar turno" |
| Consentimiento en `localStorage`, por dispositivo   | En `User.locationConsentAt`, por persona    |
| Irrevocable                                         | Botón "Revocar permiso de ubicación"        |
| El aviso prometía algo que el mapa no cumplía       | El aviso describe el comportamiento real    |

## Estados

| Estado                           | Qué se ve                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Cargando                         | Barra gris con `animate-pulse`                                                |
| Fuera de turno                   | Blanco · "No se está compartiendo tu ubicación" · botón verde "Iniciar turno" |
| En turno                         | Verde · "Compartiendo ubicación · N min" · botón "Terminar"                   |
| Fuera de turno, con permiso dado | Además, enlace pequeño "Revocar permiso de ubicación"                         |

## El aviso de ubicación

Se abre al tocar "Iniciar turno" sin `locationConsentAt`, o si `POST /api/turnos`
responde `409`. Cinco puntos, todos verificables contra el código:

1. Con el turno iniciado, Operaciones ve la ubicación en el mapa.
2. Al terminar el turno o cerrar sesión, desaparece del mapa de inmediato.
3. Sin señal o sin batería, el turno se cierra solo a los 15 min.
4. Fuera del turno no se registra la ubicación.
5. El permiso se puede revocar desde esa misma pantalla.

Aceptar hace dos llamadas: `POST /api/ubicacion/consentimiento` y luego
`POST /api/turnos`. El chofer tocó "iniciar turno" una vez; no debería tener que
tocarlo de nuevo después de leer el aviso.

"Ahora no" cierra el aviso sin otorgar nada y sin abrir turno.

## Por qué no es `sticky` ni `fixed`

`/chofer/dashboard` ya tiene un CTA en `fixed bottom-6` y `/chofer/nueva-orden` una
barra de acciones en `sticky bottom-0`. Una tercera capa flotante chocaría con las dos.
Va como bloque normal al tope del scroll.

Usa `createPortal` para el modal del aviso, por la trampa conocida del repo: cualquier
`position: fixed` anidado bajo un contenedor con `animate-fade-up` queda atrapado en su
fila porque el keyframe deja un `transform` permanente.

## Polling

`GET /api/turnos` cada 60 s. Es lo que hace visible el cierre automático: si el turno se
cerró solo por inactividad, el chofer lo ve dentro del minuto en vez de creer que sigue
compartiendo ubicación.

Un reloj interno aparte refresca "hace N min" cada 30 s sin depender del poll.

## Degradación

Todo fallo de red conserva el último estado conocido y muestra un mensaje en rojo bajo
la barra. Nunca deja la UI en blanco: en terreno la conexión se corta seguido.
