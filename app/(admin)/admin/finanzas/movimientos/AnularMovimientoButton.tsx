"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Anular nunca borra: fija status: "ANULADO" y conserva la fila.
export default function AnularMovimientoButton({
  id,
  descripcion,
  monto,
}: {
  id: string;
  descripcion: string;
  monto: number;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function anular() {
    const montoFmt = monto.toLocaleString("es-CL");
    if (!confirm(`Anular el movimiento de $ ${montoFmt} — "${descripcion}"?`))
      return;
    setCargando(true);
    try {
      const res = await fetch(`/api/finanzas/transacciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ANULADO" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo anular");
      toast.success("Movimiento anulado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={anular}
      disabled={cargando}
      className="text-sm text-[#B91C1C] hover:underline disabled:opacity-50"
    >
      Anular
    </button>
  );
}
