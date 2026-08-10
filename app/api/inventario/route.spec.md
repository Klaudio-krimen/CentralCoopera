# API Route: /api/inventario

**Archivo:** `app/api/inventario/route.ts`, `app/api/inventario/[id]/route.ts`,
`app/api/inventario/import/route.ts`, `app/api/inventario/export/route.ts`,
`app/api/inventario/movimientos/route.ts`

Acceso a todos los métodos: `hasModuleAccess(session.user, "INVENTARIO")` (bypass de ADMIN
incluido — a diferencia de Finanzas, este módulo sí lo permite).

## GET /api/inventario

Lista paginada de `InventoryItem` activos (`isActive: true`), ordenados por `numero`
(correlativo visible de la planilla de bodega).

**Query params:** `q` (busca en `name` y `details`, insensible a mayúsculas), `category`,
`condition`, `page`, `pageSize` — paginación resuelta con `resolverPaginacion()` de
`lib/finanzas/paginacion.ts`, tope duro 100 filas.

**Respuesta:** `{ data: InventoryItem[], meta: MetaPaginacion }`

## POST /api/inventario

Crea un ítem. `numero` se asigna dentro de la transacción como `max(numero) + 1` — nunca se
reutiliza ni se renumera, es el número por el que la bodega ubica las cosas.

## PATCH /api/inventario/[id]

Edición en línea, campo por campo (todos opcionales en el body). Reglas:

- `isActive: false` (archivar) exige `session.user.role === "ADMIN"`.
- Si el body cambia `quantity`, se crea un `InventoryMovement` tipo `AJUSTE` en la **misma**
  `prisma.$transaction`, con `quantityBefore`/`quantityAfter` y `userId` del servidor.
- Si el body cambia `fillPercent`, se crea un `InventoryMovement` tipo `NIVEL`, misma regla.
- Ninguna otra edición de campo (nombre, marca, formato, color, notas) genera movimiento — sólo
  cantidad y nivel de envase, para que la página de Movimientos siga siendo legible.

## DELETE /api/inventario/[id]

Borrado duro. Exige `session.user.role === "ADMIN"`. Se rechaza con `409` si el ítem tiene algún
`InventoryMovement` (`InventoryMovement.itemId` es `onDelete: Cascade`, así que borrar un ítem
con historial real se lo llevaría — para esos casos corresponde archivar, no eliminar). Pensado
para duplicados recién creados o recién importados que nunca se tocaron.

## POST /api/inventario/import

Recibe filas **ya interpretadas por el cliente** (`{ items: FilaImportada[] }`) — el parseo de
la planilla pegada/subida vive en `lib/inventario/parse.ts` y corre en el navegador para poder
mostrar la previsualización antes de confirmar. El servidor valida cada fila y las crea todas
en una sola transacción, asignando `numero` consecutivo desde el máximo existente. Tope 500
filas por importación.

## GET /api/inventario/export

CSV con las mismas 12 columnas de la planilla original de bodega (`NUMERO`, `NOMBRE`,
`MARCA-DETALLES`, `FORMATO`, `COLOR`, `LITROS`, `METROS`, `KILOS`, `CANTIDAD`, `NUEVO`, `USADO`,
`COMENTARIO`) más `CATEGORIA`. Usa `toCsv()` de `lib/csv.ts`.

## GET /api/inventario/movimientos

Últimos 100 movimientos, más reciente primero. Incluye `item.name`, `user.name`.

## POST /api/inventario/movimientos

Movimiento explícito (no edición en línea): `ENTRADA` suma, `SALIDA` resta (rechaza si deja el
stock negativo), `AJUSTE` fija el valor exacto. Guarda `quantityBefore`/`quantityAfter`. `NIVEL`
no se acepta aquí — sólo lo genera `PATCH /api/inventario/[id]` al editar `fillPercent`.
