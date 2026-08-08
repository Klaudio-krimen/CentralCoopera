"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FORM_VACIO = {
  name: "",
  rut: "",
  email: "",
  phone: "",
  bankName: "",
  bankAccount: "",
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

export default function NuevoProveedorForm() {
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
      const res = await fetch("/api/finanzas/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          rut: form.rut || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          bankName: form.bankName || undefined,
          bankAccount: form.bankAccount || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "No se pudo crear el proveedor");
      toast.success("Proveedor creado");
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
        Nuevo proveedor
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-[#0F172A]">
          Nuevo proveedor
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
          <Campo id="np-name" label="Razón social o nombre" required>
            <input
              id="np-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </Campo>
        </div>
        <Campo id="np-rut" label="RUT">
          <input
            id="np-rut"
            placeholder="76.543.210-1"
            value={form.rut}
            onChange={(e) => set("rut", e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo id="np-phone" label="Teléfono">
          <input
            id="np-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo id="np-email" label="Correo">
          <input
            id="np-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo id="np-bankName" label="Banco">
          <input
            id="np-bankName"
            value={form.bankName}
            onChange={(e) => set("bankName", e.target.value)}
            className={inputClass}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="np-bankAccount" label="N° de cuenta">
            <input
              id="np-bankAccount"
              value={form.bankAccount}
              onChange={(e) => set("bankAccount", e.target.value)}
              className={`${inputClass} font-mono`}
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
            {cargando ? "Guardando…" : "Crear proveedor"}
          </button>
        </div>
      </form>
    </div>
  );
}
