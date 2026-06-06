# TrackResiduos — Sistema de Trazabilidad de Materiales

## Propósito

TrackResiduos es una aplicación web diseñada para **Coopera Pro** que registra la cadena de custodia de materiales reciclables o residuos desde que son retirados de una empresa cliente hasta que ingresan a la bodega de destino.

**Problema que resuelve:** El "robo hormiga" — sustracción parcial de materiales por parte del chofer (o en el trayecto) antes de la entrega oficial.

**Solución:** Registro digital con evidencia fotográfica, firma del cliente, geolocalización y control cruzado entre lo declarado en el retiro y lo recibido en destino.

---

## Actores del sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `CHOFER` | Realiza el retiro en la empresa cliente | App móvil (web responsive) |
| `CLIENTE` | Representante de la empresa que entrega los materiales | Firma en pantalla del chofer |
| `RECEPCION` | Persona en bodega que recibe el material | Panel web de recepción |
| `ADMIN` | Supervisor que gestiona usuarios, reportes y discrepancias | Panel web de administración |

---

## Stack tecnológico

- **Framework:** Next.js 14+ con App Router
- **ORM:** Prisma
- **Base de datos:** PostgreSQL (producción) / SQLite (desarrollo)
- **Autenticación:** NextAuth.js con sesiones
- **Estilos:** Tailwind CSS
- **Almacenamiento de fotos:** Sistema de archivos local (carpeta `/public/uploads`) — puede migrarse a S3
- **Firma digital:** Canvas HTML5 + librería signature_pad
- **Geolocalización:** Browser Geolocation API

---

## Estructura del proyecto

```
track-residuos/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rutas de autenticación
│   ├── (chofer)/           # Interfaz del chofer
│   ├── (recepcion)/        # Interfaz de recepción/bodega
│   ├── (admin)/            # Panel de administración
│   └── api/                # API Routes (backend)
├── components/             # Componentes React reutilizables
├── lib/                    # Lógica de negocio y utilidades
├── prisma/                 # Esquema de base de datos
└── public/uploads/         # Almacenamiento de fotos y firmas
```

---

## Documentación relacionada

- [ARQUITECTURA.md](./ARQUITECTURA.md) — Diseño técnico y decisiones de arquitectura
- [ESQUEMA_BASE_DATOS.md](./ESQUEMA_BASE_DATOS.md) — Modelos de datos y relaciones
- [FLUJOS_DE_USUARIO.md](./FLUJOS_DE_USUARIO.md) — Pasos que sigue cada actor
- [ESPECIFICACION_API.md](./ESPECIFICACION_API.md) — Endpoints del backend
- [VARIABLES_ENTORNO.md](./VARIABLES_ENTORNO.md) — Variables de configuración necesarias

---

## Cómo empezar (para Claude Code)

1. Leer `ESQUEMA_BASE_DATOS.md` para entender los modelos
2. Leer `FLUJOS_DE_USUARIO.md` para entender los casos de uso
3. Leer `ESPECIFICACION_API.md` para los endpoints requeridos
4. Implementar en este orden:
   - Prisma schema + migraciones
   - API routes
   - Autenticación (NextAuth)
   - Interfaz del chofer (prioridad 1)
   - Interfaz de recepción
   - Panel de administración
