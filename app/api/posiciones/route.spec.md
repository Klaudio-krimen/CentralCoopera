# `/api/posiciones` — ingesta de posición

Recibe un ping de ubicación. Dos emisores: el teléfono del chofer y los GPS físicos.

## Está fuera del matcher del middleware

`middleware.ts` excluye `posiciones` a propósito (`/api/((?!auth|posiciones|webhooks).*)`).
Si no, `withAuth` devolvería `401` antes de que corra el código, y los GPS físicos —que
se autentican por `x-device-key`, no por sesión— nunca podrían reportar. Por eso esta
ruta hace su propia validación de sesión.

## Dos caminos de autenticación

| Camino          | Cómo se identifica    | Requiere turno |
| --------------- | --------------------- | -------------- |
| GPS físico      | header `x-device-key` | no             |
| Teléfono chofer | sesión de NextAuth    | **sí**         |

El chofer necesita un turno abierto porque **el turno es el interruptor real del
rastreo, no sólo un botón en la UI**. Sin esa comprobación, una pestaña vieja abierta en
un teléfono seguiría escribiendo posiciones después de que el chofer terminó su turno o
cerró sesión — que es exactamente el comportamiento que se está corrigiendo. Sin turno
abierto → `409`.

Los GPS físicos no tienen turno: son hardware que reporta mientras esté encendido.

## Validación

`validateCoordinates()` de `lib/tracking.ts`: `lat`/`lng` finitos y dentro de rango.
Fuera de rango → `422`. JSON inválido → `400`. Tracker inexistente o inactivo → `404`.

`recordedAt` es del servidor (`@default(now())`), nunca del cliente — regla dura del
repo. `source` se normaliza a `device` o `phone`; cualquier otro valor cae en `phone`.

## Pendiente conocido

Sin rate limiting. Un `deviceKey` filtrado puede escribir posiciones sin tope. Ya estaba
en el backlog junto con blobs privados y retención de posiciones > 30 días.
