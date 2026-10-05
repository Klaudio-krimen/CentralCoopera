# Backfill de EPP del inventario

**Archivo:** `scripts/backfill-epp-inventario.ts`

- El modo predeterminado es de solo lectura y lista los ítems que coinciden con las reglas de EPP.
- Sólo `--apply` actualiza categoría; conserva cantidades, movimientos, correlativos y demás campos.
- Es idempotente: una segunda ejecución no vuelve a modificar artículos ya clasificados como EPP.
- Requiere que el enum `InventoryCategory.EPP` ya exista en la base; aplicar el schema requiere
  respaldo verificado conforme a `AGENTS.md`.
- Usa exactamente las mismas reglas puras de `lib/inventario/category.ts` que el formulario y las APIs.
