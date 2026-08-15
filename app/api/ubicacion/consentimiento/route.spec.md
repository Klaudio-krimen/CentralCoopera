# `/api/ubicacion/consentimiento` — permiso de rastreo

Registro de que **esta persona** aceptó ser rastreada durante su turno, y cuándo.

## Por qué existe esta ruta y no un `localStorage`

Hasta antes de esto el consentimiento era `localStorage["chofer-location-consent"]`.
Tres problemas, los tres reales en terreno:

1. **Era por dispositivo, no por persona.** Dos choferes que comparten un teléfono o
   una tablet: el segundo nunca veía el aviso y era rastreado sin haberlo leído.
2. **Era irrevocable.** No había UI para desactivarlo; la única salida era borrar los
   datos del navegador.
3. **No dejaba constancia.** Para datos de ubicación de un trabajador (Ley 19.628) lo
   que interesa poder mostrar es quién aceptó y en qué fecha.

Vive en `User.locationConsentAt`. `null` = nunca aceptó, o revocó.

## `POST` — otorgar

Escribe `locationConsentAt = now()` (timestamp del servidor). Cualquier sesión válida
puede otorgar el suyo; no hay chequeo de rol porque nadie puede otorgar por otro.

## `DELETE` — revocar

Dos escrituras en una `prisma.$transaction`:

1. `locationConsentAt = null`
2. cierra cualquier turno abierto con `endedReason: CONSENTIMIENTO_REVOCADO`

Van juntas o no van. Revocar dejando el turno abierto sería seguir rastreando a alguien
que acaba de decir que no.

## Efecto sobre el turno

Sin `locationConsentAt`, `POST /api/turnos` responde `409` y no abre turno. El permiso
es condición previa, no un aviso decorativo.
