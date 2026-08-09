"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Da de baja al trabajador y purga sus datos bancarios y de contacto en el
// servidor, en la misma transacción. Irreversible: no hay ruta que reactive
// a un DESVINCULADO.
export default function DesvincularTrabajadorButton({
  id,
  fullName,
}: {
  id: string;
  fullName: string;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function desvincular() {
    if (
      !confirm(
        `Desvincular a ${fullName}? Se purgarán sus datos bancarios y de contacto y no se puede deshacer.`
      )
    )
      return;

    setCargando(true);
    try {
      const res = await fetch(`/api/finanzas/empleados/${id}/desvincular`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo desvincular");
      toast.success("Trabajador desvinculado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={desvincular}
      disabled={cargando}
      className="text-sm text-[#B91C1C] hover:underline disabled:opacity-50"
    >
      Desvincular
    </button>
  );
}
