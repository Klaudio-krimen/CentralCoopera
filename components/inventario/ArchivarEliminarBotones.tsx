"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash, SpinnerGap } from "@phosphor-icons/react";

/**
 * Archivar / Eliminar para contextos sin lista local optimista (tarjetas de
 * celular, renderizadas por un server component): hace la mutación y deja que
 * `router.refresh()` traiga la lista actualizada, en vez de reconciliar
 * estado a mano. Ver TablaInventario.tsx para el equivalente con revert
 * optimista, usado en escritorio.
 */
export default function ArchivarEliminarBotones({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"archivar" | "eliminar" | null>(null);
  const [error, setError] = useState("");

  const archivar = async () => {
    if (
      !confirm(
        `¿Archivar "${itemName}"? Deja de verse en Stock, pero su historial se conserva.`
      )
    )
      return;
    setLoading("archivar");
    setError("");
    try {
      const res = await fetch(`/api/inventario/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const eliminar = async () => {
    if (
      !confirm(
        `¿Eliminar "${itemName}" definitivamente? No se puede deshacer. Sólo funciona si el ítem no tiene movimientos — si los tiene, usa Archivar.`
      )
    )
      return;
    setLoading("eliminar");
    setError("");
    try {
      const res = await fetch(`/api/inventario/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204)
        throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={archivar}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-amber-700 transition-colors disabled:opacity-50"
      >
        {loading === "archivar" ? (
          <SpinnerGap size={13} className="animate-spin" />
        ) : (
          <Archive size={13} />
        )}
        Archivar
      </button>
      <button
        onClick={eliminar}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors disabled:opacity-50"
      >
        {loading === "eliminar" ? (
          <SpinnerGap size={13} className="animate-spin" />
        ) : (
          <Trash size={13} />
        )}
        Eliminar
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
