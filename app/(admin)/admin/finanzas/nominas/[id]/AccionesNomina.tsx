"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// BORRADOR → APROBADA → PAGADA, sin vuelta atrás. PAGADA no muestra botón.
export default function AccionesNomina({
  id,
  status,
  period,
  totalNet,
}: {
  id: string;
  status: string;
  period: string;
  totalNet: number;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function avanzar(destino: "APROBADA" | "PAGADA") {
    const montoFmt = totalNet.toLocaleString("es-CL");
    const pregunta =
      destino === "APROBADA"
        ? `Aprobar la nómina de ${period} por $ ${montoFmt}?`
        : `Marcar pagada la nómina de ${period} por $ ${montoFmt}?`;
    if (!confirm(pregunta)) return;

    setCargando(true);
    try {
      const res = await fetch(`/api/finanzas/nominas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destino }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
      toast.success(
        destino === "APROBADA" ? "Nómina aprobada" : "Nómina marcada pagada"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  if (status === "BORRADOR") {
    return (
      <button
        onClick={() => avanzar("APROBADA")}
        disabled={cargando}
        className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-50"
      >
        Aprobar nómina
      </button>
    );
  }

  if (status === "APROBADA") {
    return (
      <button
        onClick={() => avanzar("PAGADA")}
        disabled={cargando}
        className="rounded-md bg-[#15803D] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#15803D]/90 disabled:opacity-50"
      >
        Marcar pagada
      </button>
    );
  }

  return null;
}
