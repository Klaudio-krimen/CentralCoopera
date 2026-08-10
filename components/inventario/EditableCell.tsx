"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Celda de la tabla de Inventario que se edita como en Excel: click entra en
 * modo edición, Enter o blur confirma, Escape cancela sin guardar. No sabe
 * nada de PATCH ni de optimismo — sólo entrega el valor final a `onCommit`;
 * quien la usa decide qué hacer con él (ver TablaInventario.tsx).
 */
export default function EditableCell({
  value,
  placeholder,
  align = "left",
  inputMode = "text",
  onCommit,
  className,
}: {
  value: string;
  placeholder?: string;
  align?: "left" | "right" | "center";
  inputMode?: "text" | "decimal" | "numeric";
  onCommit: (raw: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`w-full min-w-0 rounded-md border border-emerald-400 bg-white px-1.5 py-1 text-sm font-mono outline-none ring-2 ring-emerald-500/15 ${alignClass} ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`w-full min-w-0 truncate rounded-md px-1.5 py-1 text-sm hover:bg-zinc-100 transition-colors ${alignClass} ${
        value ? "text-zinc-800" : "text-zinc-300"
      } ${className ?? ""}`}
      title="Click para editar"
    >
      {value || placeholder || "—"}
    </button>
  );
}
