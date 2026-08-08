"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { calcularLiquido } from "@/lib/finanzas/payroll";

interface Empleado {
  id: string;
  fullName: string;
  baseSalary: number;
  afp: string | null;
  health: string | null;
}

interface FilaState {
  afpAmount: string;
  healthAmount: string;
  otherDeductions: string;
}

function filaVacia(): FilaState {
  return { afpAmount: "0", healthAmount: "0", otherDeductions: "0" };
}

const inputClass =
  "w-24 rounded-md border border-[#E2E8F0] px-2 py-1 text-right font-mono tabular-nums text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]";

export default function NuevaNominaForm({
  empleados,
}: {
  empleados: Empleado[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("");
  const [filas, setFilas] = useState<Record<string, FilaState>>(() =>
    Object.fromEntries(empleados.map((e) => [e.id, filaVacia()]))
  );

  const setCampo = (
    employeeId: string,
    campo: keyof FilaState,
    valor: string
  ) =>
    setFilas((f) => ({
      ...f,
      [employeeId]: { ...f[employeeId], [campo]: valor },
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const lineas = empleados.map((emp) => {
        const fila = filas[emp.id];
        return {
          employeeId: emp.id,
          afpAmount: Number(fila.afpAmount) || 0,
          healthAmount: Number(fila.healthAmount) || 0,
          otherDeductions: Number(fila.otherDeductions) || 0,
        };
      });

      const res = await fetch("/api/finanzas/nominas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, lineas }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "No se pudo generar la nómina");
      toast.success(`Nómina de ${period} generada`);
      setAbierto(false);
      setPeriod("");
      setFilas(Object.fromEntries(empleados.map((e) => [e.id, filaVacia()])));
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
        disabled={empleados.length === 0}
        className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-50"
      >
        Generar nómina
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-medium text-[#0F172A]">
            Generar nómina
          </h3>
          <p className="mt-0.5 text-[12px] text-[#475569]">
            El bruto viene de la ficha de cada trabajador. Escribe el descuento
            de AFP y salud del mes; no se puede editar después de generar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="nom-period"
            className="text-[12px] font-medium text-[#475569]"
          >
            Período *
          </label>
          <input
            id="nom-period"
            type="month"
            required
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto rounded-md border border-[#E2E8F0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2">Trabajador</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2">AFP</th>
                <th className="px-3 py-2 text-right">Descuento AFP</th>
                <th className="px-3 py-2">Salud</th>
                <th className="px-3 py-2 text-right">Descuento salud</th>
                <th className="px-3 py-2 text-right">Otras deducciones</th>
                <th className="px-3 py-2 text-right">Líquido estimado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp) => {
                const fila = filas[emp.id];
                const liquidoEstimado = calcularLiquido({
                  grossAmount: emp.baseSalary,
                  afpAmount: Number(fila.afpAmount) || 0,
                  healthAmount: Number(fila.healthAmount) || 0,
                  otherDeductions: Number(fila.otherDeductions) || 0,
                  advancesApplied: 0,
                });
                return (
                  <tr
                    key={emp.id}
                    className="h-10 border-b border-[#E2E8F0] last:border-0"
                  >
                    <td className="px-3 py-1.5 font-medium text-[#0F172A]">
                      {emp.fullName}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[#0F172A]">
                      {emp.baseSalary.toLocaleString("es-CL")}
                    </td>
                    <td className="px-3 py-1.5 text-[#475569]">
                      {emp.afp ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <label className="sr-only" htmlFor={`afp-${emp.id}`}>
                        Descuento AFP de {emp.fullName}
                      </label>
                      <input
                        id={`afp-${emp.id}`}
                        type="number"
                        min={0}
                        step={1}
                        value={fila.afpAmount}
                        onChange={(e) =>
                          setCampo(emp.id, "afpAmount", e.target.value)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-[#475569]">
                      {emp.health ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <label className="sr-only" htmlFor={`salud-${emp.id}`}>
                        Descuento de salud de {emp.fullName}
                      </label>
                      <input
                        id={`salud-${emp.id}`}
                        type="number"
                        min={0}
                        step={1}
                        value={fila.healthAmount}
                        onChange={(e) =>
                          setCampo(emp.id, "healthAmount", e.target.value)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <label className="sr-only" htmlFor={`otras-${emp.id}`}>
                        Otras deducciones de {emp.fullName}
                      </label>
                      <input
                        id={`otras-${emp.id}`}
                        type="number"
                        min={0}
                        step={1}
                        value={fila.otherDeductions}
                        onChange={(e) =>
                          setCampo(emp.id, "otherDeductions", e.target.value)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[#0F172A]">
                      {liquidoEstimado.toLocaleString("es-CL")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
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
            {cargando ? "Generando…" : "Generar nómina"}
          </button>
        </div>
      </form>
    </div>
  );
}
