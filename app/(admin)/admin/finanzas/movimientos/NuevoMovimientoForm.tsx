"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const METODOS = ["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "TARJETA", "OTRO"];

interface Categoria {
  id: string;
  name: string;
  kind: string;
}

interface Proveedor {
  id: string;
  name: string;
}

const FORM_VACIO = {
  kind: "EGRESO",
  amount: "",
  date: "",
  description: "",
  categoryId: "",
  supplierId: "",
  method: "TRANSFERENCIA",
  reference: "",
};

type FormState = typeof FORM_VACIO;

function Campo({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[12px] font-medium text-[#475569]"
      >
        {label} {required && "*"}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]";

export default function NuevoMovimientoForm({
  categorias,
  proveedores,
}: {
  categorias: Categoria[];
  proveedores: Proveedor[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(FORM_VACIO);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const categoriasDelTipo = categorias.filter((c) => c.kind === form.kind);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/finanzas/transacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          amount: Number(form.amount),
          date: form.date,
          description: form.description,
          categoryId: form.categoryId || undefined,
          supplierId: form.supplierId || undefined,
          method: form.method,
          reference: form.reference || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "No se pudo crear el movimiento");
      toast.success("Movimiento creado");
      setAbierto(false);
      setForm(FORM_VACIO);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]/90"
      >
        Nuevo movimiento
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-[#0F172A]">
            Nuevo movimiento
          </h3>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-sm text-[#475569] hover:text-[#0F172A]"
          >
            Cancelar
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Campo id="nm-kind" label="Tipo" required>
            <select
              id="nm-kind"
              value={form.kind}
              onChange={(e) => set("kind", e.target.value)}
              className={inputClass}
            >
              <option value="EGRESO">Egreso</option>
              <option value="INGRESO">Ingreso</option>
            </select>
          </Campo>
          <Campo id="nm-amount" label="Monto (CLP)" required>
            <input
              id="nm-amount"
              type="number"
              min={1}
              step={1}
              required
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className={`${inputClass} text-right font-mono tabular-nums`}
            />
          </Campo>
          <Campo id="nm-date" label="Fecha" required>
            <input
              id="nm-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputClass}
            />
          </Campo>
          <Campo id="nm-method" label="Método" required>
            <select
              id="nm-method"
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
              className={inputClass}
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="nm-description" label="Descripción" required>
              <input
                id="nm-description"
                required
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputClass}
              />
            </Campo>
          </div>
          <Campo id="nm-categoryId" label="Categoría">
            <select
              id="nm-categoryId"
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">Sin categoría</option>
              {categoriasDelTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Campo>
          {form.kind === "EGRESO" && (
            <Campo id="nm-supplierId" label="Proveedor">
              <select
                id="nm-supplierId"
                value={form.supplierId}
                onChange={(e) => set("supplierId", e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <div className="sm:col-span-2">
            <Campo
              id="nm-reference"
              label="N° de factura / boleta / comprobante"
            >
              <input
                id="nm-reference"
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                className={inputClass}
              />
            </Campo>
          </div>

          {error && (
            <div className="rounded-md border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2 text-sm text-[#B91C1C] sm:col-span-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#475569] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-50"
            >
              {cargando ? "Guardando…" : "Crear movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
