# Layout: Auth

**Aplica a:** Rutas bajo `(auth)/`

## Propósito
Layout mínimo para las páginas de autenticación (login).

## Comportamiento
- No incluye navegación ni sidebar
- Fondo con color neutro
- Si el usuario ya tiene sesión activa, el middleware lo redirige ANTES de que este layout se renderice
- Centra el contenido vertical y horizontalmente
