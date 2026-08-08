"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Categoria {
  id: string;
  name: string;
  kind: string;
}

export default function CategoriasPanel({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("EGRESO");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/finanzas/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "No se pudo crear la categoría");
      toast.success("Categoría creada");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
      >
        Categorías
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)]">
          <p className="mb-2 text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
            Categorías activas
          </p>
          <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm">
            {categorias.length === 0 && (
              <li className="text-[#475569]">Ninguna todavía.</li>
            )}
            {categorias.map((c) => (
              <li key={c.id} className="flex justify-between text-[#0F172A]">
                <span>{c.name}</span>
                <span className="text-[#475569]">{c.kind}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={crear} className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              required
              className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-sm text-[#0F172A]"
            >
              <option value="EGRESO">Egreso</option>
              <option value="INGRESO">Ingreso</option>
            </select>
            {error && <p className="text-sm text-[#B91C1C]">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-md bg-[#1D4ED8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1D4ED8]/90 disabled:opacity-50"
            >
              {cargando ? "Creando…" : "Agregar categoría"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
