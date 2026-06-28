# Diseño — Mapa de posiciones (choferes + recicladores)

**Fecha:** 2026-06-28
**Proyecto:** TrackResiduos (Coopera Pro)
**Estado:** Aprobado por el usuario — pendiente de plan de implementación

---

## Objetivo

Integrar un mapa en el panel de administración que muestre la posición de los
choferes en (casi) tiempo real. La arquitectura debe soportar, sin reescritura,
una etapa futura donde **recicladores base** que recolectan latas de aluminio
sean rastreados — algunos con la app, otros con **dispositivos GPS dedicados**
que se comprarán e implementarán más adelante.

## Decisiones tomadas (brainstorming)

1. **Modo:** Híbrido. Empezamos con posición "casi en vivo" vía teléfono, con la
   tubería de ingesta lista para que los GPS dedicados se enchufen después sin
   cambios de arquitectura.
2. **Captura en etapa 1:** Activa — ping periódico desde el teléfono mientras la
   app está abierta. Es la misma tubería que usarán los GPS.
3. **Entidad rastreable:** Concepto genérico `Tracker`, que puede vincularse a un
   `User` (chofer o reciclador con app) **o** ser un dispositivo GPS independiente
   sin login.
4. **Visibilidad:** Solo ADMIN en esta etapa. El mapa vive en `/admin/mapa`.
5. **Enfoque técnico:** Leaflet + OpenStreetMap (gratis, sin API key) + polling
   cada 15 s. Sin WebSockets (mal soporte en Vercel serverless).

---

## Sección 1 — Modelo de datos

Dos modelos nuevos en `schema.prisma`:

```prisma
enum TrackerType {
  USUARIO      // vinculado a un User (chofer o reciclador con app)
  DISPOSITIVO  // GPS físico independiente, sin login
}

enum TrackerKind {
  CHOFER
  RECICLADOR
}

model Tracker {
  id        String      @id @default(cuid())
  label     String      // "Carlos Rojas" o "GPS-001"
  type      TrackerType
  kind      TrackerKind
  isActive  Boolean     @default(true)

  // Vínculo opcional a un usuario (null si es dispositivo físico)
  userId    String?     @unique
  user      User?       @relation(fields: [userId], references: [id])

  // Clave para que un dispositivo GPS se autentique al enviar posición
  deviceKey String?     @unique

  positions Position[]
  createdAt DateTime    @default(now())

  @@index([kind, isActive])
}

model Position {
  id         String   @id @default(cuid())
  trackerId  String
  tracker    Tracker  @relation(fields: [trackerId], references: [id], onDelete: Cascade)

  lat        Float
  lng        Float
  accuracy   Float?   // metros de precisión que reporta el GPS/teléfono
  source     String   // "phone" | "device"
  recordedAt DateTime @default(now())

  @@index([trackerId, recordedAt])
}
```

En el modelo `User` se agrega la relación inversa: `trackers Tracker[]`.

**Decisiones clave:**
- `Tracker` es la entidad rastreable genérica. Un chofer con app =
  `type: USUARIO, kind: CHOFER`. Un reciclador con app =
  `type: USUARIO, kind: RECICLADOR`. Un GPS físico = `type: DISPOSITIVO`,
  con `deviceKey` y `userId: null`.
- `Position` es un **historial** (un registro por ping), no solo el último punto.
  El mapa usa la más reciente por tracker, pero queda lista la base para mostrar
  recorridos/rutas en el futuro.
- `deviceKey` es cómo un GPS sin login probará legitimidad al enviar posición.
  Queda definido aunque todavía no haya dispositivos.

---

## Sección 2 — Endpoints de API

```
POST /api/posiciones          → recibe un ping de posición (teléfono o GPS)
GET  /api/posiciones/activas  → última posición de cada tracker activo (solo ADMIN)
GET  /api/trackers            → lista de trackers para gestión (solo ADMIN)
```

### `POST /api/posiciones` — tubería de ingesta (corazón del híbrido)
- **Body:** `{ lat, lng, accuracy?, source }`
- **Autenticación doble:**
  1. Sesión de usuario (chofer/reciclador con app) → busca su `Tracker` por `userId`.
  2. Header `x-device-key` (GPS físico futuro) → busca `Tracker` por `deviceKey`.
- Hoy solo entra por el camino (1). El camino (2) queda escrito y probado para
  cuando lleguen los GPS — solo se configura el `deviceKey`.
- **Esta ruta queda exenta del middleware** (como `/api/auth`), porque los
  dispositivos GPS no tendrán sesión; la autenticación la maneja la propia ruta.
- Valida `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`. Coordenadas inválidas → 422.
- Límite de tamaño de payload. Comparación segura del `x-device-key`.
- Crea un registro en `Position` con `recordedAt = now()`.

### `GET /api/posiciones/activas` (solo ADMIN)
- Devuelve, por cada `Tracker` activo, su `Position` más reciente.
- Incluye: `label`, `kind`, `lat`, `lng`, `recordedAt`, y minutos desde la última señal.
- Filtra trackers sin ninguna posición todavía.

### `GET /api/trackers` (solo ADMIN)
- Lista de trackers, de solo lectura en esta etapa (base para una futura pantalla
  de gestión: crear GPS-001, asociar deviceKey).

---

## Sección 3 — Frontend

### 3a — Página del mapa: `/admin/mapa`

```
app/(admin)/admin/mapa/
  page.tsx          → Server Component: verifica sesión ADMIN, renderiza el mapa
  MapaClient.tsx    → 'use client': react-leaflet + polling cada 15 s
```

- `MapaClient.tsx` es un componente cliente aislado (regla RSC). Carga
  `react-leaflet`, hace `GET /api/posiciones/activas` al montar y cada 15 s con
  `setInterval`.
- Marcadores diferenciados por `kind` (camión = chofer, ícono distinto = reciclador).
  Color/opacidad según frescura: verde si <5 min, gris si la señal es vieja.
- Popup al clic: nombre del tracker, hace cuánto fue la última señal, tipo.
- Centrado por defecto en Santiago (RM), con auto-zoom para encajar todos los pines.
- Estados de UI: skeleton de carga, empty state ("Ningún tracker activo en este
  momento"), manejo de error de fetch.
- Leaflet se importa dinámicamente con `ssr: false` (toca `window`); su CSS se
  carga en el componente.

### 3b — Ping del teléfono (chofer/reciclador)

Hook `usePositionPing()` montado en el layout de las sesiones de chofer:
- Si hay sesión activa y el navegador concede permiso de geolocalización:
  - `navigator.geolocation.watchPosition(...)`
  - cada ~90 s, `POST /api/posiciones` con `{ lat, lng, accuracy, source: 'phone' }`
- Silencioso, sin UI. Si el usuario niega el permiso, degrada limpio.
- El permiso se pide **con un mensaje previo** que explica por qué (transparencia
  y privacidad con el chofer).

---

## Sección 4 — Manejo de errores, privacidad y testing

### Errores y resiliencia
- Ping falla (sin red): reintenta en el siguiente ciclo, no bloquea la app.
- Permiso negado: degrada limpio; el chofer trabaja normal, solo no aparece.
- Coordenadas inválidas: `POST` responde 422, no se guardan.
- Tracker sin posiciones: se filtra del mapa, no rompe el render.
- Fetch del mapa falla: muestra el último estado bueno + aviso de "reconectando".

### Privacidad
- Solo se registra posición de usuarios con sesión activa y permiso explícito.
- El ping solo corre con la app abierta (`watchPosition`, no tracking del SO en
  segundo plano).
- Aviso previo transparente al chofer.
- **Retención:** limpiar posiciones con más de 30 días (job futuro o borrado
  manual). El mapa solo necesita lo reciente; guardar historial indefinido es
  riesgo de privacidad innecesario.

### Testing
- Validación de coordenadas: tests unitarios del validador de lat/lng y payload.
- Doble autenticación del POST: test del camino sesión-usuario y del camino device-key.
- Control de acceso: `GET /api/posiciones/activas` rechaza a no-ADMIN (403).
- Lógica "última posición por tracker": devuelve la más reciente con varias.
- Verificación manual del mapa en el navegador con trackers sembrados.

---

## Ruta futura (GPS dedicados)

Cuando lleguen los dispositivos GPS:
1. Crear un `Tracker` con `type: DISPOSITIVO`, `kind: RECICLADOR`, un `deviceKey`.
2. Configurar el dispositivo para que haga `POST /api/posiciones` con el header
   `x-device-key` y el mismo payload `{ lat, lng, accuracy, source: 'device' }`.
3. No se requieren cambios en el mapa ni en la base de datos — la tubería ya existe.

## Fuera de alcance (YAGNI en esta etapa)
- WebSockets / tiempo real al segundo.
- Vista de recorridos/rutas históricas (los datos quedan, la vista no).
- Mapa para roles RECEPCIÓN o CHOFER.
- Pantalla de gestión CRUD de trackers (la API queda de solo lectura).
- Geocercas / alertas por zona.
