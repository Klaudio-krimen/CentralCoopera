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
`category` acepta `EPP`. El servidor asigna `EPP` si el nombre corresponde a un artículo de
protección personal, aunque el cliente envíe otra categoría.

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
filas por importación. La previsualización incluye categoría y tanto ella como el servidor clasifican
automáticamente los nombres EPP; el servidor vuelve a determinarla para no confiar en el cliente.

## Clasificación de EPP

`lib/inventario/category.ts` es la fuente única de categorías, sugerencias y detección por nombre.
`POST`, `PATCH` e importación guardan `EPP` para los nombres reconocidos. El backfill de filas
existentes es explícito y sólo escribe con `--apply` (`scripts/backfill-epp-inventario.ts`).

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

## Concurrencia y validación AUD-002

PATCH y movimientos explícitos adquieren el mismo bloqueo de fila con increment:0 dentro de
la transacción antes de leer stock. El historial usa el valor previo exacto bloqueado y el valor
persistido, sin reconstrucción por resta de floats. Entradas usan increment; salidas decrement
condicionado a quantity >= cantidad. Conflicto de stock responde 409. Ajustes absolutos se
serializan con entradas/salidas. Cantidades finitas; ENTRADA/SALIDA >0 y AJUSTE >=0.
PATCH valida esquema y enum, porcentajes enteros 0..100 o null, cantidades no negativas.
