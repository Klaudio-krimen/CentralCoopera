"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Package,
  PencilSimple,
  X,
  SpinnerGap,
  Warning,
} from "@phosphor-icons/react";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  type InventoryItemRow,
  type InventoryCategory,
  type InventoryMeasureUnit,
  type InventoryCondition,
} from "./types";

const MEDIDAS: { value: InventoryMeasureUnit | ""; label: string }[] = [
  { value: "", label: "Sin medida" },
  { value: "LITROS", label: "Litros" },
  { value: "METROS", label: "Metros" },
  { value: "KILOS", label: "Kilos" },
];

interface FormState {
  name: string;
  category: InventoryCategory;
  details: string;
  format: string;
  color: string;
  measureValue: string;
  measureUnit: InventoryMeasureUnit | "";
  quantity: string;
  fillPercent: string;
  condition: InventoryCondition | "";
  notes: string;
}

function itemToForm(item?: InventoryItemRow): FormState {
  if (!item) {
    return {
      name: "",
      category: "OTRO",
      details: "",
      format: "",
      color: "",
      measureValue: "",
      measureUnit: "",
      quantity: "1",
      fillPercent: "",
      condition: "",
      notes: "",
    };
  }
  return {
    name: item.name,
    category: item.category,
    details: item.details ?? "",
    format: item.format ?? "",
    color: item.color ?? "",
    measureValue: item.measureValue != null ? String(item.measureValue) : "",
    measureUnit: item.measureUnit ?? "",
    quantity: String(item.quantity),
    fillPercent: item.fillPercent != null ? String(item.fillPercent) : "",
    condition: item.condition ?? "",
    notes: item.notes ?? "",
  };
}

export default function ItemFormModal({ item }: { item?: InventoryItemRow }) {
  const isEdit = !!item;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState<FormState>(itemToForm(item));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openModal = () => {
    setForm(itemToForm(item));
    setError("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      category: form.category,
      details: form.details.trim() || null,
      format: form.format.trim() || null,
      color: form.color.trim() || null,
      measureValue: form.measureUnit
        ? parseFloat(form.measureValue.replace(",", ".")) || null
        : null,
      measureUnit: form.measureUnit || null,
      quantity: parseFloat(form.quantity.replace(",", ".")) || 0,
      fillPercent:
        form.fillPercent !== ""
          ? Math.min(100, Math.max(0, parseInt(form.fillPercent, 10)))
          : null,
      condition: form.condition || null,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/inventario/${item!.id}` : "/api/inventario",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isEdit ? (
        <button
          onClick={openModal}
          aria-label={`Editar ${item!.name}`}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <PencilSimple size={13} weight="bold" />
          Editar
        </button>
      ) : (
        <button onClick={openModal} className="btn-primary">
          <Package size={17} />
          Nuevo ítem
        </button>
      )}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-lg p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {isEdit ? "Editar ítem" : "Nuevo ítem de bodega"}
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ej: ESMALTE AL AGUA"
                    className="input-base"
                    autoFocus
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Marca / detalles
                    </label>
                    <input
                      type="text"
                      value={form.details}
                      onChange={(e) => set("details", e.target.value)}
                      placeholder="HILTI, 20 pulgadas..."
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Formato
                    </label>
                    <input
                      type="text"
                      value={form.format}
                      onChange={(e) => set("format", e.target.value)}
                      placeholder="TARRO, BOLSA, MALETA..."
                      className="input-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Color
                    </label>
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => set("color", e.target.value)}
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Categoría
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        set("category", e.target.value as InventoryCategory)
                      }
                      className="input-base"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORIA_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Medida (formato del envase)
                    </label>
                    <select
                      value={form.measureUnit}
                      onChange={(e) =>
                        set(
                          "measureUnit",
                          e.target.value as InventoryMeasureUnit | ""
                        )
                      }
                      className="input-base"
                    >
                      {MEDIDAS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.measureUnit && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-zinc-700">
                        Valor
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.measureValue}
                        onChange={(e) => set("measureValue", e.target.value)}
                        placeholder="3,7"
                        className="input-base font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Cantidad (unidades)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                      className="input-base font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-700">
                      Nivel del envase (%)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      value={form.fillPercent}
                      onChange={(e) => set("fillPercent", e.target.value)}
                      placeholder="Sólo envases abiertos"
                      className="input-base font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Estado
                  </label>
                  <div className="flex gap-4">
                    {(["NUEVO", "USADO"] as const).map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="radio"
                          name="condition"
                          checked={form.condition === c}
                          onChange={() => set("condition", c)}
                        />
                        {c === "NUEVO" ? "Nuevo" : "Usado"}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm text-zinc-500">
                      <input
                        type="radio"
                        name="condition"
                        checked={form.condition === ""}
                        onChange={() => set("condition", "")}
                      />
                      Sin definir
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Comentario
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Ej: con 3 baterías, sin cable..."
                    className="input-base"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    <Warning size={15} weight="fill" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.name}
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <SpinnerGap size={16} className="animate-spin" />
                    ) : isEdit ? (
                      "Guardar cambios"
                    ) : (
                      "Crear ítem"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
