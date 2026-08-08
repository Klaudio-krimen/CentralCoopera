"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

async function marcar(id: string, status: "PAGADO" | "ANULADO") {
  const res = await fetch(`/api/finanzas/anticipos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
}

// Acciones para un anticipo PENDIENTE: marcar pagado o anular. Un anticipo
// PAGADO, DESCONTADO o ANULADO no muestra estos botones (ver page.tsx).
export default function AccionesAnticipo({ id }: { id: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function accionar(status: "PAGADO" | "ANULADO") {
    setCargando(true);
    try {
      await marcar(id, status);
      toast.success(
        status === "PAGADO" ? "Anticipo marcado pagado" : "Anticipo anulado"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex justify-end gap-3">
      <button
        onClick={() => accionar("PAGADO")}
        disabled={cargando}
        className="text-sm text-[#15803D] hover:underline disabled:opacity-50"
      >
        Marcar pagado
      </button>
      <button
        onClick={() => accionar("ANULADO")}
        disabled={cargando}
        className="text-sm text-[#B91C1C] hover:underline disabled:opacity-50"
      >
        Anular
      </button>
    </div>
  );
}
