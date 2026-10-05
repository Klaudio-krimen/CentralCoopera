"use client";

import { Archive, Trash } from "@phosphor-icons/react";
import AjustarStockModal from "@/components/ui/AjustarStockModal";
import { parseCantidad } from "@/lib/inventario/parse";
import EditableCell from "./EditableCell";
import ItemFormModal from "./ItemFormModal";
import {
  MEDIDA_LABEL,
  formatearCantidad,
  type InventoryItemRow,
  type InventoryMeasureUnit,
} from "./types";

const MEDIDA_COLUMNAS: InventoryMeasureUnit[] = ["LITROS", "METROS", "KILOS"];

export default function FilaInventario({
  item,
  isAdmin,
  onCommit,
  onArchive,
  onDelete,
}: {
  item: InventoryItemRow;
  isAdmin: boolean;
  onCommit: (patch: Partial<InventoryItemRow>) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="h-10 border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 group">
      <td className="sticky left-0 bg-white group-hover:bg-zinc-50/60 px-3 py-1 font-mono text-xs text-zinc-500 tabular-nums">
        {item.numero ?? "—"}
      </td>
      <td className="sticky left-14 bg-white group-hover:bg-zinc-50/60 px-1 py-1">
        <EditableCell
          value={item.name}
          onCommit={(value) => onCommit({ name: value })}
          className="font-medium"
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.details ?? ""}
          onCommit={(value) => onCommit({ details: value || null })}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.format ?? ""}
          onCommit={(value) => onCommit({ format: value || null })}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.color ?? ""}
          onCommit={(value) => onCommit({ color: value || null })}
        />
      </td>

      {MEDIDA_COLUMNAS.map((unidad) => (
        <td key={unidad} className="px-1 py-1">
          <EditableCell
            value={
              item.measureUnit === unidad && item.measureValue != null
                ? String(item.measureValue)
                : ""
            }
            align="right"
            inputMode="decimal"
            onCommit={(raw) => {
              const limpio = raw.trim();
              if (!limpio) {
                if (item.measureUnit === unidad)
                  onCommit({ measureValue: null, measureUnit: null });
                return;
              }
              const num = parseFloat(limpio.replace(",", "."));
              if (Number.isNaN(num)) return;
              onCommit({ measureValue: num, measureUnit: unidad });
            }}
          />
        </td>
      ))}

      <td className="px-1 py-1">
        <EditableCell
          value={formatearCantidad(item)}
          align="right"
          inputMode="decimal"
          onCommit={(raw) => {
            const { quantity, fillPercent } = parseCantidad(raw);
            onCommit({ quantity, fillPercent });
          }}
        />
      </td>

      <td className="px-1 py-1 text-center">
        <input
          type="checkbox"
          checked={item.condition === "NUEVO"}
          onChange={() =>
            onCommit({ condition: item.condition === "NUEVO" ? null : "NUEVO" })
          }
          className="w-4 h-4 accent-emerald-600"
          aria-label={`${item.name} nuevo`}
        />
      </td>
      <td className="px-1 py-1 text-center">
        <input
          type="checkbox"
          checked={item.condition === "USADO"}
          onChange={() =>
            onCommit({ condition: item.condition === "USADO" ? null : "USADO" })
          }
          className="w-4 h-4 accent-amber-600"
          aria-label={`${item.name} usado`}
        />
      </td>

      <td className="px-1 py-1">
        <EditableCell
          value={item.notes ?? ""}
          onCommit={(value) => onCommit({ notes: value || null })}
        />
      </td>

      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-2.5">
          <AjustarStockModal
            itemId={item.id}
            itemName={item.name}
            unit={item.measureUnit ? MEDIDA_LABEL[item.measureUnit] : "un"}
          />
          <ItemFormModal item={item} />
          {isAdmin && (
            <>
              <button
                onClick={onArchive}
                aria-label={`Archivar ${item.name}`}
                className="text-zinc-400 hover:text-amber-600 transition-colors"
                title="Archivar"
              >
                <Archive size={15} />
              </button>
              <button
                onClick={onDelete}
                aria-label={`Eliminar ${item.name}`}
                className="text-zinc-400 hover:text-red-600 transition-colors"
                title="Eliminar (sólo si no tiene movimientos)"
              >
                <Trash size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
