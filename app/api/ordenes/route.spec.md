# API Route: `/api/ordenes`

**Archivo:** `app/api/ordenes/route.ts`

## GET

- Requiere sesión y acceso a Operaciones; cuenta sin acceso recibe 401/403 mediante `apiError`.
- CHOFER siempre queda filtrado por su propio `driverId`, aunque envíe otro ID.
- ADMIN, RECEPCION y roles con acceso al módulo pueden listar según filtros válidos.
- Estado se valida contra el enum de Prisma; búsqueda y paginación tienen límites.
- Respuesta paginada incluye los datos necesarios de conductor, empresa y conteo, sin secretos.

## POST

- Solo CHOFER puede crear una orden; `driverId`, estado inicial, código y fechas se derivan en servidor.
- La empresa debe existir y estar activa.
- Contador anual y orden se crean en una transacción para evitar códigos duplicados por concurrencia.
- Toda entrada inválida y error controlado utiliza `apiError`; no se acepta rol/módulo desde el cuerpo.
