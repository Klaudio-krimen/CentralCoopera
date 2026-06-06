# API Route: /api/empresas

**Archivo:** `app/api/empresas/route.ts` y `app/api/empresas/[id]/route.ts`

## GET /api/empresas
**Acceso:** CHOFER (para el selector) y ADMIN  
**Query params:** `active` (boolean, default true)

Retorna lista de empresas. CHOFER solo recibe `id` y `name` (no datos de contacto).

## POST /api/empresas
**Acceso:** Solo ADMIN  
**Cuerpo:** `name`, `address`, `contactName`, `contactPhone`

## PATCH /api/empresas/[id]
**Acceso:** Solo ADMIN  
**Cuerpo (campos opcionales):** `name`, `address`, `contactName`, `contactPhone`, `active`
