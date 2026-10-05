"use client";

import { Package, Plus, Trash } from "@phosphor-icons/react";
import type { MaterialItem, MaterialType } from "./nueva-orden-types";

export default function MaterialesOrdenStep({
  empresaNombre,
  items,
  materialTypes,
  onAdd,
  onUpdate,
  onRemove,
}: {
  empresaNombre?: string;
  items: MaterialItem[];
  materialTypes: MaterialType[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof MaterialItem, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
          Materiales
        </h2>
        <p className="text-sm text-zinc-500">
          Declara qué materiales y cuánto retiras de{" "}
          <span className="font-medium text-zinc-700">{empresaNombre}</span>.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500">
                Material {index + 1}
              </p>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Eliminar material ${index + 1}`}
                className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors group"
              >
                <Trash
                  size={14}
                  className="text-zinc-500 group-hover:text-red-500 transition-colors"
                />
              </button>
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-medium text-zinc-600"
                htmlFor={`${item.id}-type`}
              >
                Tipo
              </label>
              <select
                id={`${item.id}-type`}
                value={item.materialTypeId}
                onChange={(event) =>
                  onUpdate(item.id, "materialTypeId", event.target.value)
                }
                className="input-base text-sm"
              >
                <option value="">Selecciona un tipo...</option>
                {materialTypes.map((materialType) => (
                  <option key={materialType.id} value={materialType.id}>
                    {materialType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-zinc-600"
                  htmlFor={`${item.id}-quantity`}
                >
                  Cantidad
                </label>
                <input
                  id={`${item.id}-quantity`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={item.quantity}
                  onChange={(event) =>
                    onUpdate(item.id, "quantity", event.target.value)
                  }
                  placeholder="0"
                  className="input-base text-sm"
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-zinc-600"
                  htmlFor={`${item.id}-unit`}
                >
                  Unidad
                </label>
                <input
                  id={`${item.id}-unit`}
                  type="text"
                  value={item.unit}
                  onChange={(event) =>
                    onUpdate(item.id, "unit", event.target.value)
                  }
                  className="input-base text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 border-dashed border-zinc-300 hover:border-emerald-400 hover:bg-emerald-50/40 text-sm text-zinc-500 hover:text-emerald-600 transition-all"
      >
        <Plus size={16} weight="bold" />
        Agregar material
      </button>

      {items.length === 0 && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Package size={14} />
          <span>Agrega al menos un material para continuar</span>
        </div>
      )}
    </div>
  );
}
