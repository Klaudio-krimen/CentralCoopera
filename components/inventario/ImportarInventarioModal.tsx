"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  UploadSimple,
  X,
  SpinnerGap,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";
import { parseCsv, detectarDelimitador } from "@/lib/csv";
import {
  parseCantidad,
  parseMedida,
  parseCondicion,
  mapearCabeceras,
  normalizarCelda,
} from "@/lib/inventario/parse";
import { formatearCantidad } from "./types";

// Orden estándar de la planilla real de bodega. Si el bloque pegado no trae
// una fila de cabecera reconocible (usuario copió sólo las filas de datos),
// se asume este orden en vez de rechazar la importación completa.
const ORDEN_POR_DEFECTO = [
  "numero",
  "name",
  "details",
  "format",
  "color",
  "litros",
  "metros",
  "kilos",
  "cantidad",
  "nuevo",
  "usado",
  "notes",
];

interface FilaPrevia {
  name: string;
  details: string | null;
  format: string | null;
  color: string | null;
  measureValue: number | null;
  measureUnit: string | null;
  quantity: number;
  fillPercent: number | null;
  condition: string | null;
  notes: string | null;
}

function interpretar(texto: string): { filas: FilaPrevia[]; error: string } {
  const delimitador = detectarDelimitador(texto);
  const tabla = parseCsv(texto, delimitador);
  if (tabla.length === 0)
    return { filas: [], error: "No se detectó ninguna fila." };

  let claves = mapearCabeceras(tabla[0]);
  let filasDeDatos = tabla.slice(1);
  if (claves.every((c) => c === null)) {
    // Ninguna cabecera conocida: probablemente pegaron sólo las filas de
    // datos, sin encabezado. Se asume el orden estándar de la planilla.
    claves = ORDEN_POR_DEFECTO.slice(0, tabla[0].length);
    filasDeDatos = tabla;
  }

  const filas: FilaPrevia[] = [];
  for (const fila of filasDeDatos) {
    const celda: Record<string, string> = {};
    claves.forEach((clave, i) => {
      if (clave) celda[clave] = fila[i] ?? "";
    });
    const nombre = normalizarCelda(celda.name);
    if (!nombre) continue; // fila sin nombre: no es un ítem, se ignora

    const { quantity, fillPercent } = parseCantidad(celda.cantidad);
    const { measureValue, measureUnit } = parseMedida(
      celda.litros,
      celda.metros,
      celda.kilos
    );
    const condition = parseCondicion(celda.nuevo, celda.usado);

    filas.push({
      name: nombre,
      details: normalizarCelda(celda.details),
      format: normalizarCelda(celda.format),
      color: normalizarCelda(celda.color),
      measureValue,
      measureUnit,
      quantity,
      fillPercent,
      condition,
      notes: normalizarCelda(celda.notes),
    });
  }

  if (filas.length === 0)
    return { filas: [], error: "No se encontró ninguna fila con nombre." };
  return { filas, error: "" };
}

export default function ImportarInventarioModal() {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<FilaPrevia[]>([]);
  const [parseError, setParseError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hecho, setHecho] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const actualizarTexto = (v: string) => {
    setTexto(v);
    setSubmitError("");
    if (!v.trim()) {
      setFilas([]);
      setParseError("");
      return;
    }
    const { filas: f, error } = interpretar(v);
    setFilas(f);
    setParseError(error);
  };

  const subirArchivo = async (file: File) => {
    const contenido = await file.text();
    actualizarTexto(contenido);
  };

  const cerrar = () => {
    setOpen(false);
    setTexto("");
    setFilas([]);
    setParseError("");
    setSubmitError("");
    setHecho(0);
  };

  const confirmar = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/inventario/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: filas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHecho(data.count);
      router.refresh();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-sm py-2.5 px-4"
      >
        <UploadSimple size={15} />
        Importar
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={cerrar}
            />

            <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-3xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Importar inventario
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Pega la selección directo desde Excel, o sube un archivo
                    .csv
                  </p>
                </div>
                <button
                  onClick={cerrar}
                  aria-label="Cerrar"
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>

              {hecho > 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CheckCircle
                    size={40}
                    className="text-emerald-600"
                    weight="fill"
                  />
                  <p className="text-zinc-900 font-medium">
                    {hecho} ítem{hecho !== 1 ? "s" : ""} importado
                    {hecho !== 1 ? "s" : ""}
                  </p>
                  <button onClick={cerrar} className="btn-primary mt-2">
                    Listo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn-secondary text-sm py-2 px-3.5"
                    >
                      Subir archivo .csv
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) subirArchivo(file);
                        e.target.value = "";
                      }}
                    />
                    <span className="text-xs text-zinc-400">o pega abajo</span>
                  </div>

                  <textarea
                    value={texto}
                    onChange={(e) => actualizarTexto(e.target.value)}
                    placeholder="Pega aquí la selección copiada desde Excel (incluye la fila de encabezados si puedes)..."
                    className="input-base font-mono text-xs h-28 resize-none"
                  />

                  {parseError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                      <Warning size={15} weight="fill" />
                      {parseError}
                    </div>
                  )}

                  {filas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500">
                        Previsualización — {filas.length} fila
                        {filas.length !== 1 ? "s" : ""} interpretada
                        {filas.length !== 1 ? "s" : ""}, así van a quedar:
                      </p>
                      <div className="panel overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-zinc-50">
                            <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              <th className="px-2 py-1.5">Nombre</th>
                              <th className="px-2 py-1.5">Marca/detalles</th>
                              <th className="px-2 py-1.5">Formato</th>
                              <th className="px-2 py-1.5">Medida</th>
                              <th className="px-2 py-1.5 text-right">
                                Cantidad
                              </th>
                              <th className="px-2 py-1.5">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filas.map((f, i) => (
                              <tr key={i} className="border-t border-zinc-100">
                                <td className="px-2 py-1.5 font-medium text-zinc-800">
                                  {f.name}
                                </td>
                                <td className="px-2 py-1.5 text-zinc-600">
                                  {f.details ?? "—"}
                                </td>
                                <td className="px-2 py-1.5 text-zinc-600">
                                  {f.format ?? "—"}
                                </td>
                                <td className="px-2 py-1.5 text-zinc-600 font-mono">
                                  {f.measureValue != null
                                    ? `${f.measureValue} ${f.measureUnit?.toLowerCase()}`
                                    : "—"}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  {formatearCantidad(f)}
                                </td>
                                <td className="px-2 py-1.5 text-zinc-600">
                                  {f.condition === "NUEVO"
                                    ? "Nuevo"
                                    : f.condition === "USADO"
                                      ? "Usado"
                                      : "Sin definir"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                      <Warning size={15} weight="fill" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={cerrar}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={loading || filas.length === 0}
                      onClick={confirmar}
                      className="btn-primary flex-1"
                    >
                      {loading ? (
                        <SpinnerGap size={16} className="animate-spin" />
                      ) : (
                        `Importar ${filas.length || ""} ítem${filas.length !== 1 ? "s" : ""}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
