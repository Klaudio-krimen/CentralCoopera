# Mapa de posiciones (choferes + recicladores) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un mapa en `/admin/mapa` que muestre la última posición de choferes (y, a futuro, recicladores) casi en tiempo real, con una tubería de ingesta de posiciones lista para recibir GPS dedicados sin reescritura.

**Architecture:** Un modelo genérico `Tracker` (vinculado a un `User` o a un dispositivo GPS sin login) acumula registros `Position`. Los teléfonos envían pings vía `POST /api/posiciones` (autenticación por sesión o por `x-device-key`). El admin ve un mapa Leaflet/OpenStreetMap que hace polling cada 15 s a `GET /api/posiciones/activas`.

**Tech Stack:** Next.js 14 App Router, Prisma + Neon PostgreSQL, NextAuth, react-leaflet + Leaflet (OpenStreetMap, sin API key), Vitest (lógica pura).

**Spec:** `docs/superpowers/specs/2026-06-28-mapa-trackers-design.md`

---

## Estructura de archivos

**Crear:**
- `vitest.config.ts` — config de Vitest (entorno node, solo `lib/**`)
- `lib/tracking.ts` — helpers puros: validación de coordenadas y frescura de señal
- `lib/tracking.test.ts` — tests de los helpers
- `lib/usePositionPing.ts` — hook cliente que envía pings de geolocalización
- `app/api/posiciones/route.ts` — `POST` ingesta de posición (doble auth)
- `app/api/posiciones/activas/route.ts` — `GET` última posición por tracker (ADMIN)
- `app/api/trackers/route.ts` — `GET` lista de trackers (ADMIN, solo lectura)
- `components/tracking/PositionPinger.tsx` — componente cliente que monta el hook
- `app/(admin)/admin/mapa/page.tsx` — página del mapa (Server Component)
- `app/(admin)/admin/mapa/MapaClient.tsx` — cliente: polling + estados de UI
- `app/(admin)/admin/mapa/LeafletMap.tsx` — leaf que renderiza Leaflet (importado con `ssr:false`)

**Modificar:**
- `prisma/schema.prisma` — modelos `Tracker` + `Position`, enums, relación inversa en `User`
- `middleware.ts` — eximir `/api/posiciones` del matcher
- `app/(chofer)/layout.tsx` — montar `<PositionPinger />`
- `components/ui/AdminSidebar.tsx` — agregar enlace "Mapa"
- `prisma/seed.ts` — sembrar trackers + posiciones de demo
- `package.json` — scripts `test`/`test:watch`; deps de leaflet y vitest

---

## Task 1: Infraestructura de tests (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest**

Run:
```bash
npm install -D vitest
```
Expected: se agrega `vitest` a devDependencies sin errores.

- [ ] **Step 2: Crear la config de Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Agregar scripts de test**

Modify `package.json` — en el bloque `"scripts"`, agregar después de `"lint": "next lint",`:
```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Verificar que Vitest corre (sin tests aún)**

Run:
```bash
npm test
```
Expected: Vitest arranca y reporta "No test files found" (o 0 tests). Sin crash de configuración.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: add Vitest for pure-logic unit tests"
```

---

## Task 2: Helpers de tracking (validación + frescura) — TDD

**Files:**
- Create: `lib/tracking.ts`
- Test: `lib/tracking.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Create `lib/tracking.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateCoordinates, minutesSince, signalFreshness } from './tracking'

describe('validateCoordinates', () => {
  it('acepta coordenadas válidas', () => {
    expect(validateCoordinates(-33.45, -70.66)).toBe(true)
  })
  it('rechaza latitud fuera de rango', () => {
    expect(validateCoordinates(91, 0)).toBe(false)
    expect(validateCoordinates(-91, 0)).toBe(false)
  })
  it('rechaza longitud fuera de rango', () => {
    expect(validateCoordinates(0, 181)).toBe(false)
    expect(validateCoordinates(0, -181)).toBe(false)
  })
  it('rechaza tipos no numéricos', () => {
    expect(validateCoordinates('-33.45' as unknown as number, -70)).toBe(false)
    expect(validateCoordinates(undefined as unknown as number, 0)).toBe(false)
  })
  it('rechaza NaN e Infinity', () => {
    expect(validateCoordinates(NaN, 0)).toBe(false)
    expect(validateCoordinates(0, Infinity)).toBe(false)
  })
})

describe('minutesSince', () => {
  it('calcula minutos transcurridos', () => {
    const now = 1_000_000_000_000
    const fiveMinAgo = new Date(now - 5 * 60_000)
    expect(minutesSince(fiveMinAgo, now)).toBe(5)
  })
})

describe('signalFreshness', () => {
  it('marca fresh si es menor a 5 minutos', () => {
    const now = 1_000_000_000_000
    const recent = new Date(now - 2 * 60_000)
    expect(signalFreshness(recent, now)).toBe('fresh')
  })
  it('marca stale si es 5 minutos o más', () => {
    const now = 1_000_000_000_000
    const old = new Date(now - 10 * 60_000)
    expect(signalFreshness(old, now)).toBe('stale')
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run:
```bash
npm test
```
Expected: FAIL — "Failed to resolve import './tracking'" o "validateCoordinates is not a function".

- [ ] **Step 3: Implementar los helpers**

Create `lib/tracking.ts`:
```ts
/** Valida que lat/lng sean números finitos dentro de rango geográfico. */
export function validateCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

/** Minutos enteros transcurridos desde `date` hasta `now` (ms). */
export function minutesSince(date: Date | string, now: number = Date.now()): number {
  return Math.floor((now - new Date(date).getTime()) / 60_000)
}

/** 'fresh' si la última señal es de hace menos de 5 minutos, si no 'stale'. */
export function signalFreshness(date: Date | string, now: number = Date.now()): 'fresh' | 'stale' {
  return minutesSince(date, now) < 5 ? 'fresh' : 'stale'
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run:
```bash
npm test
```
Expected: PASS — todos los tests verdes.

- [ ] **Step 5: Commit**

```bash
git add lib/tracking.ts lib/tracking.test.ts
git commit -m "feat: add coordinate validation and signal freshness helpers"
```

---

## Task 3: Modelos Prisma (Tracker + Position)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar enums y modelos**

Modify `prisma/schema.prisma` — agregar al final del archivo:
```prisma
enum TrackerType {
  USUARIO
  DISPOSITIVO
}

enum TrackerKind {
  CHOFER
  RECICLADOR
}

model Tracker {
  id        String      @id @default(cuid())
  label     String
  type      TrackerType
  kind      TrackerKind
  isActive  Boolean     @default(true)

  userId    String?     @unique
  user      User?       @relation(fields: [userId], references: [id])

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
  accuracy   Float?
  source     String
  recordedAt DateTime @default(now())

  @@index([trackerId, recordedAt])
}
```

- [ ] **Step 2: Agregar la relación inversa en `User`**

Modify `prisma/schema.prisma` — en el modelo `User`, después de la línea `discrepanciesResolved Discrepancy[] @relation("ResolvedBy")`, agregar:
```prisma
  trackers              Tracker[]
```

- [ ] **Step 3: Sincronizar el esquema con Neon y regenerar el cliente**

Run:
```bash
npx prisma db push
```
Expected: "Your database is now in sync with your Prisma schema" + "Generated Prisma Client".

- [ ] **Step 4: Verificar que el cliente compila con los nuevos modelos**

Run:
```bash
npx tsc --noEmit
```
Expected: sin errores de tipo nuevos (los modelos `prisma.tracker` / `prisma.position` ya existen).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Tracker and Position models for position tracking"
```

---

## Task 4: Endpoint de ingesta `POST /api/posiciones` (doble auth)

**Files:**
- Create: `app/api/posiciones/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Eximir `/api/posiciones` del middleware**

Modify `middleware.ts` — en `export const config`, cambiar la línea del matcher de API:
```ts
    '/api/((?!auth).*)',
```
por:
```ts
    '/api/((?!auth|posiciones).*)',
```
> Motivo: los GPS dedicados no tendrán sesión NextAuth; la ruta `/api/posiciones` maneja su propia autenticación (sesión **o** `x-device-key`). `GET /api/posiciones/activas` también queda exenta del middleware pero se autoprotege con un chequeo ADMIN explícito en la Task 5.

- [ ] **Step 2: Crear la ruta de ingesta**

Create `app/api/posiciones/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { validateCoordinates } from '@/lib/tracking'

// POST /api/posiciones — recibe un ping de posición (teléfono o GPS)
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  const { lat, lng, accuracy, source } = body ?? {}

  if (!validateCoordinates(lat, lng)) {
    return apiError('Coordenadas inválidas', 422)
  }

  // Resolver el tracker por uno de dos caminos de autenticación
  let tracker = null

  const deviceKey = req.headers.get('x-device-key')
  if (deviceKey) {
    tracker = await prisma.tracker.findUnique({ where: { deviceKey } })
  } else {
    const session = await getServerSession(authOptions)
    if (!session) return apiError('No autorizado', 401)
    tracker = await prisma.tracker.findUnique({ where: { userId: session.user.id } })
  }

  if (!tracker || !tracker.isActive) {
    return apiError('Tracker no encontrado o inactivo', 404)
  }

  await prisma.position.create({
    data: {
      trackerId: tracker.id,
      lat,
      lng,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      source: source === 'device' ? 'device' : 'phone',
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 3: Verificar tipos**

Run:
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Verificación manual (tras el seed en Task 8)**

> Esta ruta se verifica de extremo a extremo en la Task 8, una vez que existan trackers sembrados. Por ahora basta con que compile.

- [ ] **Step 5: Commit**

```bash
git add app/api/posiciones/route.ts middleware.ts
git commit -m "feat: add position ingestion endpoint with dual auth (session + device-key)"
```

---

## Task 5: Endpoint `GET /api/posiciones/activas` (ADMIN)

**Files:**
- Create: `app/api/posiciones/activas/route.ts`

- [ ] **Step 1: Crear la ruta**

Create `app/api/posiciones/activas/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/posiciones/activas — última posición de cada tracker activo (solo ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  // Prisma `distinct` + orderBy desc → la primera fila por trackerId es la más reciente
  const latest = await prisma.position.findMany({
    where: { tracker: { isActive: true } },
    distinct: ['trackerId'],
    orderBy: { recordedAt: 'desc' },
    include: { tracker: { select: { label: true, kind: true } } },
  })

  const result = latest.map((p) => ({
    trackerId:  p.trackerId,
    label:      p.tracker.label,
    kind:       p.tracker.kind,
    lat:        p.lat,
    lng:        p.lng,
    recordedAt: p.recordedAt,
  }))

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Verificar tipos**

Run:
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/posiciones/activas/route.ts
git commit -m "feat: add active positions endpoint (latest per tracker, admin-only)"
```

---

## Task 6: Endpoint `GET /api/trackers` (ADMIN, solo lectura)

**Files:**
- Create: `app/api/trackers/route.ts`

- [ ] **Step 1: Crear la ruta**

Create `app/api/trackers/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiError } from '@/lib/utils'

// GET /api/trackers — lista de trackers (solo ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return apiError('No autorizado', 401)
  if (session.user.role !== 'ADMIN') return apiError('Acceso denegado', 403)

  const trackers = await prisma.tracker.findMany({
    select: {
      id:       true,
      label:    true,
      type:     true,
      kind:     true,
      isActive: true,
    },
    orderBy: { label: 'asc' },
  })

  return NextResponse.json(trackers)
}
```

- [ ] **Step 2: Verificar tipos**

Run:
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/trackers/route.ts
git commit -m "feat: add read-only trackers list endpoint (admin-only)"
```

---

## Task 7: Hook de ping + montaje en el layout del chofer

**Files:**
- Create: `lib/usePositionPing.ts`
- Create: `components/tracking/PositionPinger.tsx`
- Modify: `app/(chofer)/layout.tsx`

- [ ] **Step 1: Crear el hook de ping**

Create `lib/usePositionPing.ts`:
```ts
'use client'

import { useEffect, useRef } from 'react'

const PING_INTERVAL_MS = 90_000 // 90 s entre envíos

/**
 * Mientras `enabled` sea true y el navegador conceda permiso de geolocalización,
 * envía la posición a /api/posiciones cada ~90 s. Degrada limpio si se niega el permiso.
 */
export function usePositionPing(enabled: boolean) {
  const lastSent = useRef(0)

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const send = (pos: GeolocationPosition) => {
      const now = Date.now()
      if (now - lastSent.current < PING_INTERVAL_MS) return
      lastSent.current = now

      fetch('/api/posiciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source:   'phone',
        }),
      }).catch(() => {
        // Sin red: el próximo watchPosition reintentará
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      send,
      () => {
        // Permiso negado o error: degrada limpio, sin UI molesta
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 30_000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled])
}
```

- [ ] **Step 2: Crear el componente que monta el hook**

Create `components/tracking/PositionPinger.tsx`:
```tsx
'use client'

import { usePositionPing } from '@/lib/usePositionPing'

/** Componente invisible: activa el envío de posición mientras está montado. */
export default function PositionPinger() {
  usePositionPing(true)
  return null
}
```

- [ ] **Step 3: Montar el pinger en el layout del chofer**

Modify `app/(chofer)/layout.tsx`:

Agregar el import después de `import ChoferHeader from '@/components/ui/ChoferHeader'`:
```ts
import PositionPinger from '@/components/tracking/PositionPinger'
```

Dentro del `return`, agregar `<PositionPinger />` justo después de la apertura del `<div className="w-full max-w-[430px] ...">`:
```tsx
      <div className="w-full max-w-[430px] mx-auto flex flex-col flex-1">
        <PositionPinger />
        <ChoferHeader userName={session.user.name ?? 'Chofer'} />
        <main className="flex-1 px-4 pb-28">{children}</main>
      </div>
```

- [ ] **Step 4: Verificar tipos**

Run:
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add lib/usePositionPing.ts components/tracking/PositionPinger.tsx "app/(chofer)/layout.tsx"
git commit -m "feat: send driver geolocation pings from chofer layout"
```

---

## Task 8: Página del mapa + enlace en el sidebar

**Files:**
- Create: `app/(admin)/admin/mapa/page.tsx`
- Create: `app/(admin)/admin/mapa/MapaClient.tsx`
- Create: `app/(admin)/admin/mapa/LeafletMap.tsx`
- Modify: `components/ui/AdminSidebar.tsx`
- Modify: `package.json`

- [ ] **Step 1: Instalar Leaflet y react-leaflet**

Run:
```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```
Expected: instala sin errores (react-leaflet 4.x es compatible con React 18).

- [ ] **Step 2: Crear el leaf que renderiza Leaflet**

Create `app/(admin)/admin/mapa/LeafletMap.tsx`:
```tsx
'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { signalFreshness, minutesSince } from '@/lib/tracking'

export interface TrackerPosition {
  trackerId:  string
  label:      string
  kind:       'CHOFER' | 'RECICLADOR'
  lat:        number
  lng:        number
  recordedAt: string
}

// Centro por defecto: Santiago de Chile (Región Metropolitana)
const DEFAULT_CENTER: [number, number] = [-33.45, -70.66]

export default function LeafletMap({ positions }: { positions: TrackerPosition[] }) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      className="h-[70vh] w-full rounded-2xl overflow-hidden border border-zinc-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.map((p) => {
        const fresh = signalFreshness(p.recordedAt) === 'fresh'
        const color = fresh ? '#10b981' : '#a1a1aa' // emerald-500 / zinc-400
        const radius = p.kind === 'CHOFER' ? 10 : 7
        return (
          <CircleMarker
            key={p.trackerId}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-zinc-900">{p.label}</p>
                <p className="text-zinc-500">{p.kind === 'CHOFER' ? 'Chofer' : 'Reciclador'}</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Última señal: hace {minutesSince(p.recordedAt)} min
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
```

- [ ] **Step 3: Crear el cliente con polling y estados de UI**

Create `app/(admin)/admin/mapa/MapaClient.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TrackerPosition } from './LeafletMap'

// Leaflet toca `window` al cargar → import dinámico sin SSR
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full rounded-2xl bg-zinc-100 animate-pulse" />,
})

const POLL_MS = 15_000

export default function MapaClient() {
  const [positions, setPositions] = useState<TrackerPosition[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/posiciones/activas')
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as TrackerPosition[]
        if (!cancelled) {
          setPositions(data)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true) // conserva el último estado bueno
      }
    }

    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (positions === null && !error) {
    return <div className="h-[70vh] w-full rounded-2xl bg-zinc-100 animate-pulse" />
  }

  if (positions !== null && positions.length === 0) {
    return (
      <div className="h-[70vh] w-full rounded-2xl border border-zinc-200 bg-white flex flex-col items-center justify-center">
        <p className="text-zinc-500 font-medium">Ningún tracker activo en este momento</p>
        <p className="text-zinc-400 text-sm mt-1">Las posiciones aparecerán cuando un chofer abra la app</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-amber-600">Reconectando… mostrando la última información disponible.</p>
      )}
      <LeafletMap positions={positions ?? []} />
    </div>
  )
}
```

- [ ] **Step 4: Crear la página (Server Component)**

Create `app/(admin)/admin/mapa/page.tsx`:
```tsx
import MapaClient from './MapaClient'

export default function MapaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Mapa de posiciones</h1>
        <p className="text-zinc-500 text-sm mt-1">Ubicación de choferes y recicladores activos</p>
      </div>
      <MapaClient />
    </div>
  )
}
```

- [ ] **Step 5: Agregar el enlace "Mapa" al sidebar**

Modify `components/ui/AdminSidebar.tsx`:

En el import de `@phosphor-icons/react`, agregar `MapPin` a la lista:
```ts
  GearSix,
  MapPin,
```

En el array `NAV`, agregar después de la línea de Órdenes:
```ts
  { href: '/admin/mapa',          label: 'Mapa',          icon: MapPin },
```

- [ ] **Step 6: Verificar tipos y build**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: compila sin errores; la ruta `/admin/mapa` aparece en la salida del build.

- [ ] **Step 7: Commit**

```bash
git add "app/(admin)/admin/mapa" components/ui/AdminSidebar.tsx package.json package-lock.json
git commit -m "feat: add admin map page with Leaflet and 15s polling"
```

---

## Task 9: Seed de trackers de demo + verificación end-to-end

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Sembrar trackers y posiciones de demo**

Modify `prisma/seed.ts` — antes de la línea `console.log('Seed completado...')`, agregar:
```ts
  // ── Trackers ──────────────────────────────────────────────
  const trackerChofer1 = await prisma.tracker.upsert({
    where:  { userId: chofer1.id },
    update: {},
    create: { label: chofer1.name, type: 'USUARIO', kind: 'CHOFER', userId: chofer1.id },
  })
  const trackerChofer2 = await prisma.tracker.upsert({
    where:  { userId: chofer2.id },
    update: {},
    create: { label: chofer2.name, type: 'USUARIO', kind: 'CHOFER', userId: chofer2.id },
  })
  // Dispositivo GPS de demo (sin login) para probar el camino x-device-key
  await prisma.tracker.upsert({
    where:  { deviceKey: 'GPS-001-DEMO' },
    update: {},
    create: { label: 'GPS-001', type: 'DISPOSITIVO', kind: 'RECICLADOR', deviceKey: 'GPS-001-DEMO' },
  })

  // ── Posiciones de demo (cerca de Santiago) ────────────────
  await prisma.position.create({
    data: { trackerId: trackerChofer1.id, lat: -33.447, lng: -70.673, source: 'phone' },
  })
  await prisma.position.create({
    data: { trackerId: trackerChofer2.id, lat: -33.421, lng: -70.610, source: 'phone' },
  })
```

- [ ] **Step 2: Correr el seed**

Run:
```bash
npm run db:seed
```
Expected: "Seed completado…" sin errores; se crean los trackers y dos posiciones.

- [ ] **Step 3: Verificar el mapa en el navegador**

Run:
```bash
npm run dev
```
Luego:
1. Inicia sesión como ADMIN (`admin@cooperapro.cl`).
2. Abre `/admin/mapa`.
3. **Esperado:** el mapa de Santiago muestra 2 círculos (Carlos y Ana) con popups que indican "Chofer" y los minutos desde la última señal.

- [ ] **Step 4: Verificar la ingesta del camino dispositivo (x-device-key)**

Con `npm run dev` corriendo, en otra terminal:
```bash
curl -X POST http://localhost:3000/api/posiciones \
  -H "Content-Type: application/json" \
  -H "x-device-key: GPS-001-DEMO" \
  -d '{"lat":-33.46,"lng":-70.64,"source":"device"}'
```
Expected: `{"ok":true}` con status 201. Al refrescar `/admin/mapa` (o esperar 15 s) aparece un tercer círculo "GPS-001" / "Reciclador".

- [ ] **Step 5: Verificar el rechazo de coordenadas inválidas**

```bash
curl -X POST http://localhost:3000/api/posiciones \
  -H "Content-Type: application/json" \
  -H "x-device-key: GPS-001-DEMO" \
  -d '{"lat":999,"lng":0,"source":"device"}'
```
Expected: `{"error":"Coordenadas inválidas"}` con status 422.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed demo trackers and positions for map verification"
```

---

## Notas de implementación

- **Retención de posiciones (privacidad):** el spec define limpiar posiciones de más de 30 días. Queda **fuera de alcance** de este plan (no hay job programado todavía); se implementará como tarea futura. No bloquea esta entrega.
- **Permiso de geolocalización con aviso previo:** el spec menciona un mensaje previo de transparencia al chofer. En esta primera entrega el navegador pide el permiso directamente vía `watchPosition`. El aviso previo explicativo queda como mejora de UX posterior.
- **GPS dedicados futuros:** crear un `Tracker` `type: DISPOSITIVO` con un `deviceKey` real y configurar el dispositivo para `POST /api/posiciones` con header `x-device-key`. Sin cambios de código.
