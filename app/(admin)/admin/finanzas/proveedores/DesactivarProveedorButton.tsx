"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Baja lógica: isActive: false. Nunca borrado duro — la fila y sus
// transacciones asociadas se conservan íntegras.
export default function DesactivarProveedorButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function desactivar() {
    if (!confirm(`Dar de baja a "${name}"? Sus movimientos se conservan.`))
      return;
    setCargando(true);
    try {
      const res = await fetch(`/api/finanzas/proveedores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo dar de baja");
      toast.success("Proveedor dado de baja");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={desactivar}
      disabled={cargando}
      className="text-sm text-[#B91C1C] hover:underline disabled:opacity-50"
    >
      Dar de baja
    </button>
  );
}
