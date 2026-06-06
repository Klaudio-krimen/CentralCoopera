# Librería: Autenticación

**Archivo:** `lib/auth.ts`

## Propósito
Configuración de NextAuth.js y utilidades relacionadas con autenticación.

## Configuración de NextAuth

### Provider
- `CredentialsProvider` — login con email y contraseña
- No usar OAuth en V1

### Lógica de authorize
1. Recibe `email` y `password` del formulario
2. Busca el usuario en la base de datos por email
3. Verifica que el usuario esté activo (`active = true`)
4. Compara la contraseña con el hash usando `bcrypt.compare()`
5. Si todo es válido, retorna `{ id, name, email, role }`
6. Si no, retorna `null` (NextAuth lo interpreta como error de credenciales)

### Session callback
- Agrega `role` y `id` del usuario a la sesión, para que el frontend pueda leer el rol
- La sesión contiene: `{ id, name, email, role }`

### JWT callback
- Persiste `role` e `id` en el JWT token

## Middleware (`middleware.ts` en la raíz del proyecto)

Protege rutas según rol:
- `/chofer/*` → requiere rol CHOFER
- `/recepcion/*` → requiere rol RECEPCION
- `/admin/*` → requiere rol ADMIN
- `/login` → redirige a dashboard si ya hay sesión activa
- Si el usuario está autenticado pero intenta acceder a una ruta de otro rol → redirige a su propio dashboard

## Utilidad: `getSessionOrRedirect()`
Helper de server component que obtiene la sesión y redirige si no hay ninguna.
Evita repetir el mismo código en cada página.

## Contraseñas
- Hash con `bcryptjs` (no `bcrypt` nativo — evita problemas de compilación en Next.js)
- Rounds: 10
