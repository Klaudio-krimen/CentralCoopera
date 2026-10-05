"use client";

import {
  Buildings,
  CheckCircle,
  MagnifyingGlass,
  SpinnerGap,
} from "@phosphor-icons/react";
import type { Empresa } from "./nueva-orden-types";

export default function SeleccionEmpresaStep({
  query,
  empresas,
  empresa,
  loading,
  onSearch,
  onSelect,
}: {
  query: string;
  empresas: Empresa[];
  empresa: Empresa | null;
  loading: boolean;
  onSearch: (query: string) => void;
  onSelect: (empresa: Empresa) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
          Seleccionar empresa
        </h2>
        <p className="text-sm text-zinc-500">
          ¿De qué empresa estás retirando?
        </p>
      </div>

      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        {loading && (
          <SpinnerGap
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin"
          />
        )}
        <input
          type="text"
          placeholder="Buscar empresa..."
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          className="input-base pl-9"
          autoFocus
        />
      </div>

      {empresas.length > 0 && (
        <div className="space-y-1.5">
          {empresas.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => onSelect(result)}
              className="w-full text-left card px-4 py-3 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Buildings size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {result.name}
                  </p>
                  {result.address && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[240px]">
                      {result.address}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {empresa && (
        <div className="card p-4 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <CheckCircle
              size={20}
              weight="fill"
              className="text-emerald-500 shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {empresa.name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Empresa seleccionada
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
