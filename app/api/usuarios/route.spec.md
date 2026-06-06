# API Route: /api/usuarios

**Archivo:** `app/api/usuarios/route.ts` y `app/api/usuarios/[id]/route.ts`  
**Todos los endpoints requieren rol ADMIN.**

## GET /api/usuarios
**Query params:** `role` (opcional), `active` (boolean, default true)

Retorna lista de usuarios. No retorna el campo `password`.

## POST /api/usuarios
**Cuerpo:** `name`, `email`, `role`, `password`

**Implementación:**
1. Verificar que el email no esté en uso
2. Hashear la contraseña con `bcryptjs.hash(password, 10)`
3. Crear el usuario con `active = true`
4. Retornar el usuario creado sin el campo `password`

## PATCH /api/usuarios/[id]
**Cuerpo (campos opcionales):** `name`, `email`, `active`, `password`

**Implementación:**
1. Si se envía `password`: hashear antes de guardar
2. Si se cambia `email`: verificar que no esté en uso por otro usuario
3. Guardar cambios
4. Retornar el usuario actualizado sin `password`
