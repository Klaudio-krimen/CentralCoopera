# API Route: configuración del webhook CRM

**Archivo:** `app/api/configuracion/webhook/route.ts`

- GET y PATCH requieren sesión y acceso CRM en el handler.
- GET entrega endpoint, nombre del header y estado; nunca retorna el secreto almacenado.
- PATCH acepta solo `enabled` booleano y/o `regenerate: true`.
- Un secreto regenerado se devuelve una sola vez, fuera de la URL, con `Cache-Control: no-store, private`.
- Los errores de autenticación, autorización y entrada inválida pasan por `apiError`.
