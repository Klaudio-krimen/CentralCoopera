"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowsLeftRight,
  MagnifyingGlass,
  Archive,
  Package,
  Warning,
} from "@phosphor-icons/react";
import EditableCell from "./EditableCell";
import ItemFormModal from "./ItemFormModal";
import ImportarInventarioModal from "./ImportarInventarioModal";
import AjustarStockModal from "@/components/ui/AjustarStockModal";
import { parseCantidad } from "@/lib/inventario/parse";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  MEDIDA_LABEL,
  formatearCantidad,
  type InventoryItemRow,
  type InventoryMeasureUnit,
} from "./types";

const MEDIDA_COLUMNAS: InventoryMeasureUnit[] = ["LITROS", "METROS", "KILOS"];

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function TablaInventario({
  initialItems,
  initialMeta,
  isAdmin,
}: {
  initialItems: InventoryItemRow[];
  initialMeta: Meta;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const cargar = async (opts: {
    q: string;
    category: string;
    page: number;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts.q) params.set("q", opts.q);
      if (opts.category) params.set("category", opts.category);
      params.set("page", String(opts.page));
      const res = await fetch(`/api/inventario?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.data);
      setMeta(data.meta);
    } catch {
      setError("No se pudo cargar la lista. Reintenta.");
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda con debounce; filtro de categoría y cambio de página, inmediatos.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cargar({ q, category, page: 1 });
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const cambiarPagina = (p: number) => {
    setPage(p);
    cargar({ q, category, page: p });
  };

  /** PATCH optimista: aplica el cambio en pantalla, revierte si la API falla. */
  const commitField = async (
    item: InventoryItemRow,
    patch: Record<string, unknown>
  ) => {
    const anterior = items;
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, ...(patch as Partial<InventoryItemRow>) }
          : it
      )
    );
    setError("");
    try {
      const res = await fetch(`/api/inventario/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e: any) {
      setItems(anterior);
      setError(
        `No se pudo guardar el cambio en "${item.name}". Se revirtió. ${e.message ?? ""}`
      );
    }
  };

  const archivar = async (item: InventoryItemRow) => {
    if (
      !confirm(
        `¿Archivar "${item.name}"? Deja de verse en Stock, pero su historial se conserva.`
      )
    )
      return;
    const anterior = items;
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      const res = await fetch(`/api/inventario/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e: any) {
      setItems(anterior);
      setError(`No se pudo archivar "${item.name}". ${e.message ?? ""}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up">
        <div className="relative flex-1 min-w-0">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="input-base pl-10 py-2.5"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <button
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              category === ""
                ? "bg-amber-100 text-amber-800"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? "" : c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? "bg-amber-100 text-amber-800"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {CATEGORIA_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/inventario/movimientos"
            className="btn-secondary text-sm py-2.5 px-4"
          >
            <ArrowsLeftRight size={15} />
            Movimientos
          </Link>
          <ImportarInventarioModal />
          <a
            href="/api/inventario/export"
            className="btn-secondary text-sm py-2.5 px-4"
          >
            Exportar
          </a>
          <ItemFormModal />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 animate-fade-up">
          <Warning size={15} weight="fill" />
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="panel text-center py-16 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Package size={22} className="text-zinc-400" />
          </div>
          <p className="text-zinc-700 font-medium">Sin ítems registrados</p>
          <p className="text-zinc-500 text-sm mt-1">
            {q || category
              ? "Nada calza con ese filtro."
              : "Agrega el primer ítem o importa tu planilla."}
          </p>
        </div>
      ) : (
        <div className="panel overflow-x-auto animate-fade-up">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                <th className="sticky left-0 bg-white px-3 py-2 w-14">N°</th>
                <th className="sticky left-14 bg-white px-3 py-2 min-w-[180px]">
                  Nombre
                </th>
                <th className="px-2 py-2 min-w-[140px]">Marca / detalles</th>
                <th className="px-2 py-2 min-w-[100px]">Formato</th>
                <th className="px-2 py-2 min-w-[90px]">Color</th>
                <th className="px-2 py-2 w-16 text-right">Litros</th>
                <th className="px-2 py-2 w-16 text-right">Metros</th>
                <th className="px-2 py-2 w-16 text-right">Kilos</th>
                <th className="px-2 py-2 w-20 text-right">Cantidad</th>
                <th className="px-2 py-2 w-14 text-center">Nuevo</th>
                <th className="px-2 py-2 w-14 text-center">Usado</th>
                <th className="px-2 py-2 min-w-[160px]">Comentario</th>
                <th className="px-2 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <FilaInventario
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onCommit={(patch) => commitField(item, patch)}
                  onArchive={() => archivar(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 animate-fade-up">
          <button
            disabled={page <= 1}
            onClick={() => cambiarPagina(page - 1)}
            className="btn-secondary text-sm py-2 px-3.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-zinc-500 font-mono">
            {page} / {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => cambiarPagina(page + 1)}
            className="btn-secondary text-sm py-2 px-3.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

function FilaInventario({
  item,
  isAdmin,
  onCommit,
  onArchive,
}: {
  item: InventoryItemRow;
  isAdmin: boolean;
  onCommit: (patch: Record<string, unknown>) => void;
  onArchive: () => void;
}) {
  return (
    <tr className="h-10 border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 group">
      <td className="sticky left-0 bg-white group-hover:bg-zinc-50/60 px-3 py-1 font-mono text-xs text-zinc-500 tabular-nums">
        {item.numero ?? "—"}
      </td>
      <td className="sticky left-14 bg-white group-hover:bg-zinc-50/60 px-1 py-1">
        <EditableCell
          value={item.name}
          onCommit={(v) => onCommit({ name: v })}
          className="font-medium"
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.details ?? ""}
          onCommit={(v) => onCommit({ details: v || null })}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.format ?? ""}
          onCommit={(v) => onCommit({ format: v || null })}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.color ?? ""}
          onCommit={(v) => onCommit({ color: v || null })}
        />
      </td>

      {MEDIDA_COLUMNAS.map((unidad) => (
        <td key={unidad} className="px-1 py-1">
          <EditableCell
            value={
              item.measureUnit === unidad && item.measureValue != null
                ? String(item.measureValue)
                : ""
            }
            align="right"
            inputMode="decimal"
            onCommit={(raw) => {
              const limpio = raw.trim();
              if (!limpio) {
                if (item.measureUnit === unidad)
                  onCommit({ measureValue: null, measureUnit: null });
                return;
              }
              const num = parseFloat(limpio.replace(",", "."));
              if (isNaN(num)) return;
              onCommit({ measureValue: num, measureUnit: unidad });
            }}
          />
        </td>
      ))}

      <td className="px-1 py-1">
        <EditableCell
          value={formatearCantidad(item)}
          align="right"
          inputMode="decimal"
          onCommit={(raw) => {
            const { quantity, fillPercent } = parseCantidad(raw);
            onCommit({ quantity, fillPercent });
          }}
        />
      </td>

      <td className="px-1 py-1 text-center">
        <input
          type="checkbox"
          checked={item.condition === "NUEVO"}
          onChange={() =>
            onCommit({ condition: item.condition === "NUEVO" ? null : "NUEVO" })
          }
          className="w-4 h-4 accent-emerald-600"
          aria-label={`${item.name} nuevo`}
        />
      </td>
      <td className="px-1 py-1 text-center">
        <input
          type="checkbox"
          checked={item.condition === "USADO"}
          onChange={() =>
            onCommit({ condition: item.condition === "USADO" ? null : "USADO" })
          }
          className="w-4 h-4 accent-amber-600"
          aria-label={`${item.name} usado`}
        />
      </td>

      <td className="px-1 py-1">
        <EditableCell
          value={item.notes ?? ""}
          onCommit={(v) => onCommit({ notes: v || null })}
        />
      </td>

      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-2.5">
          <AjustarStockModal
            itemId={item.id}
            itemName={item.name}
            unit={item.measureUnit ? MEDIDA_LABEL[item.measureUnit] : "un"}
          />
          <ItemFormModal item={item} />
          {isAdmin && (
            <button
              onClick={onArchive}
              aria-label={`Archivar ${item.name}`}
              className="text-zinc-400 hover:text-red-600 transition-colors"
              title="Archivar"
            >
              <Archive size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
