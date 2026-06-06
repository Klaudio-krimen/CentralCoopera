# API Route: /api/auth/[...nextauth]

**Archivo:** `app/api/auth/[...nextauth]/route.ts`

## Propósito
Catch-all route de NextAuth.js. Maneja login, logout, y la API de sesiones.

## Implementación
- Importar el handler de NextAuth configurado en `lib/auth.ts`
- Exportar como `GET` y `POST`
- No agregar lógica aquí — toda la configuración va en `lib/auth.ts`

## Rutas que maneja NextAuth automáticamente
- `POST /api/auth/signin/credentials` — login con email y contraseña
- `POST /api/auth/signout` — logout
- `GET /api/auth/session` — obtener sesión actual
- `GET /api/auth/csrf` — token CSRF
