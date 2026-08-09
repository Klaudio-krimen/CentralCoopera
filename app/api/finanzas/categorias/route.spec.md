# API Route: /api/finanzas/categorias

**Archivo:** `app/api/finanzas/categorias/route.ts`

## GET /api/finanzas/categorias

**Acceso:** `hasFinanceAccess`. Lista completa de categorías activas (`isActive: true`), sin
paginar — es una lista corta para poblar selects. **No audita.**

## POST /api/finanzas/categorias

**Acceso:** `canWriteFinance`.

**Cuerpo:** `crearCategoriaSchema` (`name`, `kind`: `INGRESO` | `EGRESO`).

**Implementación:**

1. Crea la `FinanceCategory` y audita `CREAR` (`entityType: "FinanceCategory"`) en la misma
   transacción.
2. `409` si ya existe una categoría con ese `[name, kind]` — lo resuelve el índice único de la
   base (`P2002`), no un `findUnique` previo que podría correr en carrera con otra request.

Devuelve la categoría con `201`.
