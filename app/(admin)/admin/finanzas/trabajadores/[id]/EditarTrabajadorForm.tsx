"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EmployeeSerializado } from "@/lib/finanzas/serialize";
import DesvincularTrabajadorButton from "./DesvincularTrabajadorButton";

const TIPOS_CUENTA = ["CORRIENTE", "VISTA", "AHORRO", "RUT"];

const inputClass =
  "w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]";

function Campo({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[12px] font-medium text-[#475569]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function fechaInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

const FILAS_LECTURA = (e: EmployeeSerializado): Array<[string, string]> => [
  ["RUT", e.rut],
  ["Estado", e.status],
  ["Correo", e.email ?? "—"],
  ["Teléfono", e.phone ?? "—"],
  ["AFP", e.afp ?? "—"],
  ["Salud", e.health ?? "—"],
  ["Sueldo base", e.baseSalary.toLocaleString("es-CL")],
  ["Banco", e.bankName ?? "—"],
  ["Tipo de cuenta", e.bankAccountType ?? "—"],
  ["Cuenta (últimos 4)", e.bankAccountLast4 ?? "—"],
];

export default function EditarTrabajadorForm({
  empleado,
}: {
  empleado: EmployeeSerializado;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: empleado.fullName,
    rut: empleado.rut,
    email: empleado.email ?? "",
    phone: empleado.phone ?? "",
    hiredAt: fechaInput(empleado.hiredAt),
    baseSalary: String(empleado.baseSalary),
    afp: empleado.afp ?? "",
    health: empleado.health ?? "",
    bankName: empleado.bankName ?? "",
    bankAccountType: empleado.bankAccountType ?? "",
    bankAccount: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/finanzas/empleados/${empleado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          rut: form.rut,
          email: form.email || null,
          phone: form.phone || null,
          hiredAt: form.hiredAt,
          baseSalary: Number(form.baseSalary),
          afp: form.afp || null,
          health: form.health || null,
          bankName: form.bankName || null,
          bankAccountType: form.bankAccountType || null,
          ...(form.bankAccount ? { bankAccount: form.bankAccount } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Trabajador actualizado");
      setEditando(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  if (!editando) {
    return (
      <div>
        <dl className="mb-3 divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0] bg-white">
          {FILAS_LECTURA(empleado).map(([label, valor]) => (
            <div
              key={label}
              className="flex justify-between px-4 py-2.5 text-sm"
            >
              <dt className="text-[#475569]">{label}</dt>
              <dd className="font-medium text-[#0F172A]">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditando(true)}
            className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Editar
          </button>
          {empleado.status === "ACTIVO" && (
            <DesvincularTrabajadorButton
              id={empleado.id}
              fullName={empleado.fullName}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2"
    >
      <Campo id="et-fullName" label="Nombre completo">
        <input
          id="et-fullName"
          required
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-rut" label="RUT">
        <input
          id="et-rut"
          required
          value={form.rut}
          onChange={(e) => set("rut", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-hiredAt" label="Fecha de contratación">
        <input
          id="et-hiredAt"
          type="date"
          required
          value={form.hiredAt}
          onChange={(e) => set("hiredAt", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-baseSalary" label="Sueldo base bruto (CLP)">
        <input
          id="et-baseSalary"
          type="number"
          min={1}
          step={1}
          required
          value={form.baseSalary}
          onChange={(e) => set("baseSalary", e.target.value)}
          className={`${inputClass} text-right font-mono tabular-nums`}
        />
      </Campo>
      <Campo id="et-email" label="Correo">
        <input
          id="et-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-phone" label="Teléfono">
        <input
          id="et-phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-afp" label="AFP">
        <input
          id="et-afp"
          value={form.afp}
          onChange={(e) => set("afp", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-health" label="Salud (Fonasa / isapre)">
        <input
          id="et-health"
          value={form.health}
          onChange={(e) => set("health", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-bankName" label="Banco">
        <input
          id="et-bankName"
          value={form.bankName}
          onChange={(e) => set("bankName", e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="et-bankAccountType" label="Tipo de cuenta">
        <select
          id="et-bankAccountType"
          value={form.bankAccountType}
          onChange={(e) => set("bankAccountType", e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {TIPOS_CUENTA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Campo>
      <div className="sm:col-span-2">
        <Campo
          id="et-bankAccount"
          label={`N° de cuenta nuevo (dejar vacío para no cambiar — termina en ${
            empleado.bankAccountLast4 ?? "----"
          })`}
        >
          <input
            id="et-bankAccount"
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
          onClick={() => setEditando(false)}
          className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#475569] hover:bg-[#F8FAFC]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-50"
        >
          {cargando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
