"use client";

import { useState } from "react";
import { toast } from "sonner";

interface LineaPago {
  employeeId: string;
  fullName: string;
  rut: string;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccount: string | null;
  netAmount: number;
}

// Pide GET /api/finanzas/nominas/[id]/pago bajo demanda — la única llamada de
// todo el módulo que descifra cuentas bancarias, y cada clic queda auditado
// en el servidor (action: DESCIFRAR) aunque el usuario nunca cierre este panel.
export default function PanelPago({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [lineas, setLineas] = useState<LineaPago[] | null>(null);

  const disponible = status === "APROBADA" || status === "PAGADA";

  async function verPago() {
    setCargando(true);
    try {
      const res = await fetch(`/api/finanzas/nominas/${id}/pago`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo obtener el pago");
      setLineas(data.lineas);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  if (lineas) {
    return (
      <div className="w-full max-w-full">
        <p className="mb-2 text-right text-[12px] text-[#475569]">
          Cuentas descifradas para el pago — visible sólo mientras esta página
          siga abierta.
        </p>
        <div className="overflow-x-auto rounded-md border border-[#E2E8F0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2">Trabajador</th>
                <th className="px-3 py-2">Banco</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr
                  key={l.employeeId}
                  className="h-10 border-b border-[#E2E8F0] last:border-0"
                >
                  <td className="px-3 py-1.5 font-medium text-[#0F172A]">
                    {l.fullName}
                  </td>
                  <td className="px-3 py-1.5 text-[#475569]">
                    {l.bankName ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-[#475569]">
                    {l.bankAccountType ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[#0F172A]">
                    {l.bankAccount ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[#0F172A]">
                    {l.netAmount.toLocaleString("es-CL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={verPago}
      disabled={!disponible || cargando}
      title={
        disponible
          ? undefined
          : "La nómina debe estar aprobada antes de generar el pago"
      }
      className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {cargando ? "Descifrando…" : "Ver datos de pago"}
    </button>
  );
}
