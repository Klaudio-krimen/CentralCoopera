# Página: Login

**Ruta:** `/login`  
**Acceso:** Público (redirige a dashboard si ya hay sesión)

## Propósito
Formulario de inicio de sesión para todos los tipos de usuario.

## Interfaz
- Campo email
- Campo contraseña (con toggle mostrar/ocultar)
- Botón "Ingresar"
- Mensaje de error si las credenciales son incorrectas

## Comportamiento

### Al enviar el formulario
1. Llama a `signIn("credentials", { email, password })` de NextAuth
2. Si éxito: redirige según el rol del usuario:
   - CHOFER → `/chofer/dashboard`
   - RECEPCION → `/recepcion/dashboard`
   - ADMIN → `/admin/dashboard`
3. Si error: muestra mensaje "Email o contraseña incorrectos"

### Si el usuario ya tiene sesión activa
- El middleware redirige automáticamente a su dashboard antes de llegar a esta página

## Diseño
- Pantalla completa centrada (mobile-first)
- Logo de Coopera Pro en la parte superior
- Sin opción de registro (los usuarios son creados por el admin)
- Sin opción de recuperar contraseña en versión inicial
