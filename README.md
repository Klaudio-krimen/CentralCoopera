# TrackResiduos — Intranet de Coopera Pro

## Propósito

TrackResiduos es la intranet operativa de **Coopera Pro** (Santiago, Chile). Nació para registrar la cadena de custodia de materiales reciclables desde que se retiran de una empresa cliente hasta que ingresan a la bodega de destino, y hoy cubre cuatro módulos.

**Problema original:** el "robo hormiga" — sustracción parcial de materiales por parte del chofer (o en el trayecto) antes de la entrega oficial.

**Solución:** registro digital con evidencia fotográfica, firma del cliente, geolocalización y control cruzado entre lo declarado en el retiro y lo recibido en destino.

---

## Módulos

| Módulo                                                              | Quién lo usa                      |
| ------------------------------------------------------------------- | --------------------------------- |
| **Operaciones** — órdenes de retiro, evidencias, discrepancias, GPS | `CHOFER`, `RECEPCION`, `ADMIN`    |
| **Inventario** — stock de materia prima y pallets                   | `BODEGA`                          |
| **CRM** — empresas, contactos, deals, outreach, lista de llamadas   | `VENTAS`                          |
| **Finanzas** — sueldos, anticipos, proveedores, cuadre              | `moduleAccess` propio (sin ADMIN) |

El rol (`UserRole`) define quién es el usuario; `ModuleAccess[]` define qué módulos ve. `ADMIN` ve Operaciones, Inventario y CRM sin depender de la lista, **pero no Finanzas**: ese acceso se concede de forma explícita.

---

## Stack tecnológico

- **Framework:** Next.js 14 (App Router) + TypeScript 5
- **ORM / BD:** Prisma 5 sobre PostgreSQL (Neon)
- **Autenticación:** NextAuth v4 (credenciales + bcrypt), protección por `middleware.ts`
- **Estilos / UI:** Tailwind 3, `@base-ui/react`, Phosphor y Lucide
- **Imágenes (firmas y evidencias):** Vercel Blob en producción; carpeta local `public/uploads` solo como respaldo de desarrollo
- **Mapas y gráficos:** Leaflet · Recharts
- **Correo (outreach):** SMTP vía `nodemailer`
- **Despliegue / tests:** Vercel · Vitest

---

## Estructura del proyecto

```
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login
│   ├── (chofer)/           # Interfaz del chofer (móvil)
│   ├── (recepcion)/        # Interfaz de recepción/bodega
│   ├── (admin)/            # Panel: Operaciones, Inventario, CRM, Finanzas
│   └── api/                # API Routes (backend)
├── components/             # Componentes React reutilizables
├── lib/                    # Lógica de negocio y utilidades (lib/finanzas y lib/outreach son puros)
├── prisma/                 # Esquema de base de datos
├── scripts/                # Importadores y seeds manuales
└── blueprints/             # Diseños de cambios grandes (Finanzas, Radar Pallets)
```

---

## Comandos

```bash
npm run dev          # desarrollo
npm run typecheck    # tsc --noEmit — correr siempre antes de dar algo por terminado
npm run test         # vitest run
npm run build        # prisma generate && next build
```

Una tarea se da por terminada solo si `npm run typecheck && npm run test && npm run build` pasa.

---

## Documentación

Las reglas técnicas y de seguridad viven en [CLAUDE.md](./CLAUDE.md) (fuente de verdad); [AGENTS.md](./AGENTS.md) es su resumen para otros agentes. El trabajo compartido entre agentes se registra en [REGISTRO_TRABAJO.md](./REGISTRO_TRABAJO.md).

- [ARQUITECTURA.md](./ARQUITECTURA.md) — Diseño técnico y decisiones de arquitectura
- [ESQUEMA_BASE_DATOS.md](./ESQUEMA_BASE_DATOS.md) — Modelos de datos y relaciones
- [FLUJOS_DE_USUARIO.md](./FLUJOS_DE_USUARIO.md) — Pasos que sigue cada actor
- [ESPECIFICACION_API.md](./ESPECIFICACION_API.md) — Endpoints del backend
- [VARIABLES_ENTORNO.md](./VARIABLES_ENTORNO.md) — Variables de configuración necesarias
- [RASTREO_GPS.md](./RASTREO_GPS.md) — Turnos, consentimiento de ubicación y mapa en vivo
- [PROSPECCION_OUTREACH.md](./PROSPECCION_OUTREACH.md) — Prospección y correo frío del taller de pallets
- [IMPORTACION_RADAR_PALLETS.md](./IMPORTACION_RADAR_PALLETS.md) — Importación del Radar de Clientes Pallets
- [PRODUCT.md](./PRODUCT.md) — Usuarios, personalidad y principios de diseño

> `ESQUEMA_BASE_DATOS.md`, `ESPECIFICACION_API.md` y `FLUJOS_DE_USUARIO.md` describen solo Operaciones (el enum de roles ahí es `CHOFER RECEPCION ADMIN`); no cubren CRM, Inventario, Finanzas ni GPS por turnos. Ante la duda, el código y `prisma/schema.prisma` ganan.
