# RASTREO_GPS.md — turnos, ubicación y el mapa de Operaciones

> Fuente única del subsistema de rastreo. `ARQUITECTURA.md`, `ESPECIFICACION_API.md` y
> `ESQUEMA_BASE_DATOS.md` son anteriores a la feature del mapa y no la cubren.
>
> Última actualización: 2026-08-15 · En producción desde el commit `6ada175`.

---

## 1. La idea en una frase

**El turno es el interruptor del rastreo.** No hay posición guardada sin turno abierto, y no
hay chofer en el mapa sin turno abierto. Todo lo demás en este documento es consecuencia de eso.

Antes de agosto de 2026 el rastreo no tenía interruptor: arrancaba solo al abrir cualquier
pantalla de `/chofer` y el mapa mostraba la última posición conocida para siempre. §9 cuenta
qué estaba mal exactamente, porque el diseño actual no se entiende sin eso.

---

## 2. Quién participa

| Actor             | Qué hace                                                         |
| ----------------- | ---------------------------------------------------------------- |
| Chofer            | Inicia y termina su turno desde la app. Acepta el aviso una vez. |
| Operaciones/ADMIN | Ve el mapa en `/admin/mapa`. No puede iniciar turnos ajenos.     |
| GPS físico        | Hardware sin persona detrás. No tiene turno (ver §7).            |

---

## 3. Ciclo de vida de un turno

Un turno abierto es una fila de `Shift` con `endedAt IS NULL`. **Un chofer no puede tener dos.**
Prisma no expresa un índice único parcial sobre `endedAt IS NULL`, así que la unicidad se
garantiza verificando y creando dentro de la misma `prisma.$transaction` en `POST /api/turnos`.

### Se abre

Sólo por acción explícita del chofer: botón **"Iniciar turno"**. Requiere consentimiento vigente
(§4); sin él la ruta responde `409` y la UI muestra el aviso.

Al abrirlo se hace `upsert` del `Tracker` del chofer con los mismos valores que
`scripts/backfill-trackers.ts` (`type: USUARIO`, `kind: CHOFER`). Sin eso, un chofer recién
creado abriría un turno que `POST /api/posiciones` rechazaría con `404` para siempre.

`POST /api/turnos` es idempotente: si ya hay uno abierto lo devuelve en vez de crear otro.

### Se cierra — cuatro caminos

| Camino             | Quién lo dispara                                 | `endedReason`             |
| ------------------ | ------------------------------------------------ | ------------------------- |
| Botón "Terminar"   | `DELETE /api/turnos`                             | `MANUAL`                  |
| Cerrar sesión      | `events.signOut` en `lib/auth.ts`                | `LOGOUT`                  |
| 15 min sin señal   | `cerrarTurnosInactivos()` en `lib/turnos-server` | `INACTIVIDAD`             |
| Revocar el permiso | `DELETE /api/ubicacion/consentimiento`           | `CONSENTIMIENTO_REVOCADO` |

**El cierre por inactividad no usa cron.** Lo disparan los dos polls que ya existían: el del mapa
(`/api/posiciones/activas`, cada 15 s mientras alguien lo mira) y el del chofer (`/api/turnos`,
cada 60 s mientras tiene la app abierta). En la práctica un turno colgado se cierra dentro del
minuto. Es deliberado: evita una Vercel Cron y una variable de entorno más.

**Consecuencia honesta del diseño:** si nadie mira el mapa y nadie tiene la app abierta, un turno
colgado sigue abierto hasta que alguien consulte. No afecta a nadie mientras nadie mire, pero
está anotado como límite conocido en §10.

### El umbral de 15 minutos

`INACTIVIDAD_MS` en `lib/turnos.ts`. `usePositionPing` envía cada 90 s, así que 15 min son diez
pings perdidos: suficiente para descartar un túnel, una calle sin cobertura o la pantalla apagada
un rato, y poco para que un teléfono sin batería quede colgado en el mapa toda la tarde.

**El turno se cierra en la hora de la última señal real, no en "ahora".** El turno terminó de
hecho cuando el teléfono dejó de reportar, no cuando alguien abrió el mapa y disparó la revisión.
Sin eso, la duración de un turno dependería de a qué hora se asomó Operaciones a mirar.

---

## 4. Consentimiento de ubicación

Vive en `User.locationConsentAt` (`DateTime?`). `null` = nunca aceptó, o revocó.

Antes vivía en `localStorage["chofer-location-consent"]`. Tres problemas, los tres reales:

1. **Era por dispositivo, no por persona.** Dos choferes que comparten un teléfono o una tablet:
   el segundo nunca veía el aviso y era rastreado sin haberlo leído.
2. **Era irrevocable.** La única salida era borrar los datos del navegador.
3. **No dejaba constancia.** Para datos de ubicación de un trabajador (Ley 19.628) lo que
   interesa poder mostrar es quién aceptó y en qué fecha.

Revocar cierra el turno abierto en la misma transacción. Revocar dejando el turno abierto sería
seguir rastreando a alguien que acaba de decir que no.

### Qué dice el aviso

Cinco puntos, todos verificables contra el código:

1. Con el turno iniciado, Operaciones ve la ubicación en el mapa.
2. Al terminar el turno o cerrar sesión, desaparece del mapa **de inmediato**.
3. Sin señal o sin batería, el turno se cierra solo a los 15 min.
4. Fuera del turno no se registra la ubicación.
5. El permiso se puede revocar desde esa misma pantalla.

El punto 2 era **falso** antes de este cambio: el aviso anterior prometía "no se comparte cuando
la cierras" y el mapa seguía mostrando el punto. Corregir el aviso sin corregir el mapa habría
sido cosmético.

---

## 5. Ingesta de posiciones

`POST /api/posiciones`, dos caminos de autenticación:

| Camino          | Se identifica por     | ¿Requiere turno? |
| --------------- | --------------------- | ---------------- |
| Teléfono chofer | sesión de NextAuth    | **sí** (`409`)   |
| GPS físico      | header `x-device-key` | no               |

La ruta está **fuera del matcher de `middleware.ts`** a propósito
(`/api/((?!auth|posiciones|webhooks).*)`): si no, `withAuth` devolvería `401` antes de que corra
el código y los GPS físicos nunca podrían reportar. Por eso valida la sesión por su cuenta.

`recordedAt` es del servidor (`@default(now())`), nunca del cliente. Regla dura del repo.

La comprobación de turno en esta ruta es lo que hace que el turno sea el interruptor **real** y no
un botón decorativo: una pestaña vieja abierta en un teléfono no puede seguir escribiendo
posiciones después de que el chofer terminó.

---

## 6. El mapa (`/admin/mapa`)

`GET /api/posiciones/activas`, polling cada 15 s. Requiere acceso a `OPERACIONES`.

### Quién aparece

| Tipo de tracker | Aparece si…                                          |
| --------------- | ---------------------------------------------------- |
| `USUARIO`       | su chofer tiene turno abierto                        |
| `DISPOSITIVO`   | su última señal es de hace menos de `INACTIVIDAD_MS` |

**`tracker.isActive` no significa "conectado".** Es una bandera administrativa: "este tracker
sigue en uso". Confundir las dos cosas era el bug original.

### Cómo se ve

El filtro decide **quién** aparece; `signalFreshness()` de `lib/tracking.ts` decide **cómo**:

| Estado                  | Marcador                  |
| ----------------------- | ------------------------- |
| Señal de menos de 5 min | Azul `#2563eb`, con pulso |
| Señal de más de 5 min   | Ámbar `#d97706`, quieto   |

El pulso significa "esta posición es de ahora mismo" y por eso **no** es incondicional. Un chofer
en turno con la señal atrasada sigue trabajando, pero su punto no es de este momento. Pasados los
15 min el turno se cierra solo y desaparece.

El popup muestra "En turno hace N min" (sólo para trackers de `USUARIO`) y "Última señal / Sin
señal hace N min".

---

## 7. GPS físicos

Trackers `type: DISPOSITIVO`, sin `userId`, autenticados por `deviceKey`. No tienen turno porque
no hay una persona que lo inicie: son hardware que reporta mientras esté encendido. Su
equivalente al turno es **seguir reportando**, así que el mapa los filtra por frescura de señal
con el mismo umbral de 15 min.

Alta: crear el `Tracker` con `type: DISPOSITIVO`, `kind` según corresponda y un `deviceKey`
propio. No requiere cambios de código.

---

## 8. Mapa del código

| Asunto                                | Archivo                                           |
| ------------------------------------- | ------------------------------------------------- |
| Modelo `Shift` + `ShiftEndReason`     | `prisma/schema.prisma`                            |
| Consentimiento                        | `prisma/schema.prisma` → `User.locationConsentAt` |
| Lógica pura de cierre (11 tests)      | `lib/turnos.ts` · `lib/turnos.test.ts`            |
| Acceso a base para turnos             | `lib/turnos-server.ts`                            |
| Frescura de señal + validación coords | `lib/tracking.ts` · `lib/tracking.test.ts`        |
| Envío de posición desde el navegador  | `lib/usePositionPing.ts`                          |
| Iniciar / terminar / consultar turno  | `app/api/turnos/route.ts`                         |
| Otorgar / revocar permiso             | `app/api/ubicacion/consentimiento/route.ts`       |
| Ingesta de posiciones                 | `app/api/posiciones/route.ts`                     |
| Alimentación del mapa                 | `app/api/posiciones/activas/route.ts`             |
| Interruptor del chofer                | `components/tracking/TurnoControl.tsx`            |
| Render del mapa                       | `app/(admin)/admin/mapa/LeafletMap.tsx`           |
| Polling del mapa                      | `app/(admin)/admin/mapa/MapaClient.tsx`           |

Cada ruta y componente de la tabla lleva su `*.spec.md` al lado, según la convención del repo.

**`lib/turnos.ts` es puro y usa imports relativos a propósito.** `vitest.config.ts` sólo recoge
`lib/**/*.test.ts` y **no resuelve el alias `@/`**; además, un módulo que importe Prisma al
cargarse no se puede testear sin base. Mismo patrón que `lib/finanzas/*`. El acceso a datos vive
en `lib/turnos-server.ts`, que recibe el cliente por parámetro.

---

## 9. Qué estaba mal antes (y por qué el diseño es así)

El síntoma reportado: _"aunque cierre la sesión aún permanece conectado el dispositivo en el
mapa"_. **No era un bug de sesión — la sesión nunca participaba en el cálculo.**

**Causa raíz.** `/api/posiciones/activas` devolvía la última posición de todo tracker con
`isActive: true`, sin ningún filtro de tiempo. Cerrar sesión no borra la última fila de
`Position`, así que el marcador quedaba ahí indefinidamente.

**Agravante.** `signalFreshness()` existía en `lib/tracking.ts`, estaba **testeado**, y no lo
importaba nadie en la aplicación. El plan original
(`docs/superpowers/plans/2026-06-28-mapa-trackers.md:655-656`) lo usaba para pintar gris vs verde;
se perdió en el rediseño visual al punto azul con pulso. Resultado: todos los marcadores pulsaban
igual y un punto de hace tres días era **visualmente idéntico** a uno en vivo. El único indicio
—"hace N min"— estaba escondido dentro del popup.

**Lección reusable:** cuando un rediseño visual reescribe un componente, revisar qué imports se
perdieron. Una función exportada, testeada y sin consumidores es una señal de alarma, no ruido.

---

## 10. Límites conocidos

| Límite                                                                              | Estado                   |
| ----------------------------------------------------------------------------------- | ------------------------ |
| Sin rate limiting en `/api/posiciones`: un `deviceKey` filtrado escribe sin tope    | Backlog, preexistente    |
| Sin retención/purga de `Position` a más de 30 días                                  | Backlog, preexistente    |
| Sin pantalla de historial de turnos — el dato se guarda pero no se muestra          | No pedido todavía        |
| El cierre por inactividad depende de que alguien consulte (§3)                      | Deliberado, ver §3       |
| El rastreo sólo corre con la app abierta (no hay service worker ni background sync) | Limitación del navegador |

---

## 11. Verificación

```bash
npm run typecheck   # 0 errores
npm run test        # 210 tests, incluidos los 11 de lib/turnos.test.ts
npm run build       # compila /api/turnos y /api/ubicacion/consentimiento
```

Prueba manual que cierra el reporte original: iniciar turno con un chofer real → confirmar que
aparece en `/admin/mapa` → cerrar sesión → recargar el mapa. Debe desaparecer **de inmediato**, no
a los 15 min. Los 15 min son sólo para batería muerta o app matada por el sistema, donde no hay
`signOut` que dispare.

`npm run lint` **no se corre**: el repo no tiene configuración de ESLint y `next lint` abre un
prompt interactivo que cuelga. Condición preexistente, documentada también en el blueprint de
Finanzas.
