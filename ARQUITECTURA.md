# Arquitectura del Sistema

## Visión general

TrackResiduos es una aplicación **monolítica full-stack** construida con Next.js. El frontend y el backend conviven en el mismo proyecto. La base de datos es accedida únicamente desde el backend (API Routes). El cliente (navegador) nunca tiene acceso directo a la base de datos.

```
[Celular del chofer]           [PC bodega]              [PC admin]
       |                            |                        |
  Browser (Next.js)          Browser (Next.js)        Browser (Next.js)
       |                            |                        |
       └────────────────────────────┴────────────────────────┘
                                    |
                           [Next.js Server]
                          API Routes + SSR
                                    |
                             [Prisma ORM]
                                    |
                            [PostgreSQL / SQLite]
                                    |
                        [Sistema de archivos local]
                         /public/uploads/ (fotos)
```

---

## Módulos principales

### 1. Autenticación (`app/(auth)/`)
- Login con email y contraseña
- Sesiones manejadas por NextAuth.js
- Middleware de Next.js protege todas las rutas según rol
- No hay registro público — los usuarios son creados por el admin

### 2. Módulo Chofer (`app/(chofer)/`)
- Interfaz optimizada para uso en celular (pantalla táctil)
- Flujo principal: crear orden → agregar ítems → tomar fotos → firma cliente → confirmar
- Guarda borrador automáticamente (localStorage) por si pierde conexión
- Carga las órdenes del día al abrir el dashboard

### 3. Módulo Recepción (`app/(recepcion)/`)
- Interfaz para tablet o PC en bodega
- El receptor busca la orden por código o QR
- Registra lo que físicamente llegó
- El sistema calcula automáticamente las discrepancias

### 4. Módulo Administración (`app/(admin)/`)
- Vista de todas las órdenes con filtros
- Gestión de usuarios (crear/desactivar choferes, receptores)
- Gestión de empresas clientes
- Reportes descargables en CSV
- Vista de discrepancias con estado (pendiente/investigado/resuelto)

### 5. API Backend (`app/api/`)
- REST API con Next.js Route Handlers
- Todas las rutas requieren sesión activa
- Las rutas validan el rol del usuario antes de responder
- Las fotos se reciben como `multipart/form-data` y se guardan en `/public/uploads/`

---

## Seguridad y trazabilidad

### Prevención de robo hormiga

El sistema cierra el ciclo de custodia con estos controles:

1. **Registro de salida:** Chofer declara ítems + peso en empresa cliente
2. **Evidencia fotográfica:** Fotos tomadas en el momento del retiro (con timestamp del servidor, no del celular)
3. **Firma del cliente:** El representante firma en pantalla — se guarda como imagen PNG con metadata
4. **Geolocalización:** Coordenadas GPS del celular al momento del registro
5. **Registro de entrada:** Recepción en bodega registra lo que físicamente llegó
6. **Cálculo automático de discrepancia:** Sistema compara peso/cantidad declarado vs. recibido. Si la diferencia supera un umbral configurable, crea una alerta

### Roles y permisos

| Acción | CHOFER | RECEPCION | ADMIN |
|--------|--------|-----------|-------|
| Crear orden de retiro | ✓ | — | ✓ |
| Ver sus propias órdenes | ✓ | — | ✓ |
| Ver órdenes de otros choferes | — | — | ✓ |
| Registrar recepción | — | ✓ | ✓ |
| Ver reportes | — | — | ✓ |
| Gestionar usuarios | — | — | ✓ |
| Gestionar empresas | — | — | ✓ |

---

## Decisiones de diseño

### Por qué Next.js y no una API separada
- Simplifica el despliegue (un solo proceso)
- Reduce la complejidad para un equipo pequeño
- Se puede separar en el futuro si escala

### Por qué no app nativa (React Native)
- El chofer ya tiene un celular con navegador
- No requiere publicar en App Store/Play Store
- Actualizaciones instantáneas sin que el usuario descargue nada
- Limitación: no funciona offline (se asume conectividad en terreno)

### Por qué Prisma y PostgreSQL
- Prisma provee type-safety y migraciones controladas
- PostgreSQL es robusto para datos de auditoría
- SQLite para desarrollo local (configurado con variable de entorno)

### Almacenamiento de fotos
- Por simplicidad inicial: carpeta `/public/uploads/`
- Nombres de archivo: `{ordenId}_{timestamp}_{random}.jpg`
- Para producción en servidor real, migrar a S3 o similar
- Las rutas se guardan en la base de datos como paths relativos

---

## Consideraciones de rendimiento

- Las fotos se comprimen en el cliente antes de enviar (máx. 1MB por foto, max 5 fotos por orden)
- Los reportes pesados se generan en background (puede requerir un job asíncrono en versión futura)
- Paginación en todas las listas (25 ítems por página)
