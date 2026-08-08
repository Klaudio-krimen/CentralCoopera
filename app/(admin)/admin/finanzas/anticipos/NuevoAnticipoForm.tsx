"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Empleado {
  id: string;
  fullName: string;
}

const FORM_VACIO = {
  employeeId: "",
  amount: "",
  requestedAt: "",
  notes: "",
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

export default function NuevoAnticipoForm({
  empleados,
}: {
  empleados: Empleado[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(FORM_VACIO);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/finanzas/anticipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          amount: Number(form.amount),
          requestedAt: form.requestedAt,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "No se pudo crear el anticipo");
      toast.success("Anticipo registrado");
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
        Nuevo anticipo
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-[#0F172A]">
          Nuevo anticipo
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
        <div className="sm:col-span-2">
          <Campo id="na-employeeId" label="Trabajador" required>
            <select
              id="na-employeeId"
              required
              value={form.employeeId}
              onChange={(e) => set("employeeId", e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="na-amount" label="Monto (CLP)" required>
          <input
            id="na-amount"
            type="number"
            min={1}
            step={1}
            required
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={`${inputClass} text-right font-mono tabular-nums`}
          />
        </Campo>
        <Campo id="na-requestedAt" label="Fecha de solicitud" required>
          <input
            id="na-requestedAt"
            type="date"
            required
            value={form.requestedAt}
            onChange={(e) => set("requestedAt", e.target.value)}
            className={inputClass}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="na-notes" label="Notas">
            <input
              id="na-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
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
            {cargando ? "Guardando…" : "Registrar anticipo"}
          </button>
        </div>
      </form>
    </div>
  );
}
