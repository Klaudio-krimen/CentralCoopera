"use client";

// Editor in-line del estado de gestión telefónica de un Contact
// (IMPORTACION_RADAR_PALLETS.md §4). Replica el patrón de
// `components/crm/CompletarActividadButton.tsx`: `useState(loading)` +
// `useRouter()` + `fetch` PATCH + `if (!res.ok) throw` + `toast` +
// `router.refresh()`, con `.finally(() => setLoading(false))` para no dejar el
// control colgado en `loading` tras un error de red. NO escribe `Activity`
// (el `callStatus` es un estado, no una línea de tiempo).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SpinnerGap } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/crm/ui/select";

const OPCIONES = [
  { value: "POR_LLAMAR", label: "Por llamar" },
  { value: "LLAMADA", label: "Llamada" },
  { value: "SIN_RESPUESTA", label: "Sin respuesta" },
  { value: "CORREO_CONSEGUIDO", label: "Correo conseguido" },
] as const;

export default function CallStatusSelect({
  contactId,
  value,
}: {
  contactId: string;
  value: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // El control NO se desmonta mientras guarda: conserva ancho (sin saltos de
  // layout) y foco de teclado. `readOnly` bloquea el cambio sin quitar el foco
  // (a diferencia de `disabled`); el spinner reemplaza visualmente al chevron.
  return (
    <div className="relative inline-flex">
      <Select
        readOnly={loading}
        value={value ?? undefined}
        onValueChange={(v) => {
          if (loading || !v || v === value) return;
          setLoading(true);
          fetch("/api/llamadas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: contactId, callStatus: v }),
          })
            .then(async (res) => {
              if (!res.ok) throw new Error((await res.json()).error);
              toast.success("Estado actualizado");
              router.refresh();
            })
            .catch(() => toast.error("No se pudo actualizar el estado"))
            .finally(() => setLoading(false));
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="Estado de la llamada"
          aria-busy={loading}
          className={loading ? "w-[150px] [&>svg]:opacity-0" : "w-[150px]"}
        >
          <SelectValue placeholder="Sin estado" />
        </SelectTrigger>
        <SelectContent>
          {OPCIONES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <SpinnerGap
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-crm-muted"
        />
      )}
      {/* Anuncia el guardado a lectores de pantalla; el toast ya anuncia el resultado. */}
      <span role="status" className="sr-only">
        {loading ? "Guardando estado…" : ""}
      </span>
    </div>
  );
}
