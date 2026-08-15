# `/api/turnos` — turno del chofer

El turno es el interruptor del rastreo GPS. No hay posición sin turno abierto, y no
hay chofer en el mapa sin turno abierto.

## Quién entra

`CHOFER` y `ADMIN`. `ADMIN` porque `app/(chofer)/layout.tsx` ya lo deja entrar a las
pantallas de chofer para probar. Cualquier otro rol → `403`. Sin sesión → `401`.

## `GET`

Devuelve el estado del turno del usuario autenticado.

```json
{
  "enTurno": true,
  "startedAt": "2026-08-15T13:00:00.000Z",
  "consentimiento": "2026-08-10T09:12:00.000Z"
}
```

Antes de responder llama a `cerrarTurnosInactivos()`. Junto con la llamada gemela de
`/api/posiciones/activas`, eso es lo que reemplaza a un cron: entre el poll del chofer
(60 s) y el del mapa (15 s), un turno colgado se cierra dentro del minuto.

## `POST` — iniciar

| Situación               | Respuesta                                  |
| ----------------------- | ------------------------------------------ |
| Sin `locationConsentAt` | `409` — la UI muestra el aviso y reintenta |
| Ya hay un turno abierto | `201` con ese mismo turno (idempotente)    |
| Todo en orden           | `201` con el turno recién creado           |

Antes de crear el turno hace `upsert` del `Tracker` del chofer, con los mismos valores
que `scripts/backfill-trackers.ts` (`type: USUARIO`, `kind: CHOFER`). Sin eso, un chofer
nuevo abriría un turno que `POST /api/posiciones` rechazaría con `404` para siempre.

La verificación de "no hay otro turno abierto" y la creación van en la misma
`prisma.$transaction`. Es lo único que garantiza un solo turno abierto por chofer:
Prisma no expresa un índice único parcial sobre `endedAt IS NULL`.

## `DELETE` — terminar

Cierra el turno abierto con `endedReason: MANUAL` y `endedAt` del servidor. Sin turno
abierto responde `200`, no `404`: en terreno la conexión se corta y un reintento no
debe verse como un error.

## Lo que NO hace

- No acepta ninguna fecha del cliente. `startedAt` y `endedAt` son del servidor.
- No cierra turnos de otros usuarios, ni siquiera para un `ADMIN`.
- No borra posiciones al cerrar el turno. El histórico se conserva; lo que cambia es
  quién aparece en el mapa.

## Los otros dos caminos de cierre

| Camino             | Dónde vive                                        | `endedReason`             |
| ------------------ | ------------------------------------------------- | ------------------------- |
| Cerrar sesión      | `events.signOut` en `lib/auth.ts`                 | `LOGOUT`                  |
| 15 min sin señal   | `cerrarTurnosInactivos` en `lib/turnos-server.ts` | `INACTIVIDAD`             |
| Revocar el permiso | `DELETE /api/ubicacion/consentimiento`            | `CONSENTIMIENTO_REVOCADO` |
