# API Route: `/api/empresas`

**Archivo:** `app/api/empresas/route.ts` y `app/api/empresas/[id]/route.ts`

## GET `/api/empresas`

- CHOFER obtiene solo empresas activas y los campos necesarios para seleccionar empresa, incluso
  si envía `active=false`.
- Usuarios con acceso CRM (incluido ADMIN según la política general de módulos) reciben los
  campos comerciales necesarios para gestionar empresas.
- Otros roles reciben 403; nunca se amplía el resultado por autenticación solamente.
- Admite filtros de búsqueda y estado activo validados en servidor.

## POST y PATCH

- Requieren acceso CRM comprobado en el handler.
- Validan nombre, campos opcionales y estado; los errores usan `apiError`.
- No aceptan ni retornan campos internos sensibles de usuarios o trabajadores.
