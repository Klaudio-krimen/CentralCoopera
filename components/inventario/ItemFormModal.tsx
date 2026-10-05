"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import {
  Package,
  PencilSimple,
  SpinnerGap,
  Warning,
} from "@phosphor-icons/react";
import { type InventoryItemRow } from "./types";
import ItemFormFields, { type FormState } from "./ItemFormFields";

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
  const formId = useId();

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
    if (loading) return;
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
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "No se pudo guardar el ítem."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) openModal();
        else setOpen(false);
      }}
      busy={loading}
      title={isEdit ? "Editar ítem" : "Nuevo ítem de bodega"}
      size="lg"
      trigger={
        isEdit ? (
          <button
            type="button"
            aria-label={`Editar ${item!.name}`}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <PencilSimple size={13} weight="bold" aria-hidden="true" />
            Editar
          </button>
        ) : (
          <button type="button" className="btn-primary">
            <Package size={17} aria-hidden="true" />
            Nuevo ítem
          </button>
        )
      }
    >
      <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
        <ItemFormFields form={form} formId={formId} onChange={set} />

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"
          >
            <Warning size={15} weight="fill" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
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
              <>
                <SpinnerGap
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Guardando…
              </>
            ) : isEdit ? (
              "Guardar cambios"
            ) : (
              "Crear ítem"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
