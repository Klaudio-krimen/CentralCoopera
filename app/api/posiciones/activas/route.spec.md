# `/api/posiciones/activas` — quién está en la calle ahora

Alimenta el mapa de Operaciones (`/admin/mapa`), que la consulta cada 15 s.

## Quién entra

Sesión con acceso a `OPERACIONES` (`hasModuleAccess`, con bypass de `ADMIN`). Sin
sesión → `401`. Sin el módulo → `403`.

## El bug que esta ruta tenía

Devolvía la última posición de **todo** tracker con `isActive: true`, sin ningún filtro
de tiempo. Como cerrar sesión no borra la última fila de `Position`, un chofer que se
desconectó hace tres días seguía apareciendo en el mapa para siempre, y con el mismo
punto azul pulsante que uno en vivo.

La confusión de fondo: `tracker.isActive` es una bandera **administrativa** ("este
tracker sigue en uso"), no un estado de conexión. Nunca dijo nada sobre si alguien está
trabajando ahora.

## Qué significa "activo" ahora

| Tipo de tracker | Aparece en el mapa si…                                     |
| --------------- | ---------------------------------------------------------- |
| `USUARIO`       | su chofer tiene un turno abierto (`Shift.endedAt IS NULL`) |
| `DISPOSITIVO`   | su última señal es de hace menos de `INACTIVIDAD_MS`       |

Los GPS físicos no tienen turno — no hay una persona que lo inicie. Su equivalente es
seguir reportando, así que se los filtra por frescura de señal con el mismo umbral.

Antes de consultar llama a `cerrarTurnosInactivos()`, para que el resultado ya refleje
los turnos que acaban de vencer. El poll del mapa es lo que en la práctica hace de cron.

## Respuesta

```json
[
  {
    "trackerId": "clx…",
    "label": "Juan Pérez",
    "kind": "CHOFER",
    "lat": -33.45,
    "lng": -70.66,
    "recordedAt": "2026-08-15T13:40:00.000Z",
    "enTurnoDesde": "2026-08-15T09:00:00.000Z"
  }
]
```

`enTurnoDesde` es `null` en los GPS físicos.

## Frescura en el mapa

El filtro decide **quién** aparece; `signalFreshness()` decide **cómo**. Un chofer en
turno cuya última señal tiene más de 5 min se pinta ámbar y sin pulso: sigue trabajando,
pero su posición no es de ahora mismo. Pasados los 15 min el turno se cierra solo y
desaparece.
