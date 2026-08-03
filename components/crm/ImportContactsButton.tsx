"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { parseCsv } from "@/lib/csv";

// Cubre tanto el formato manual simple (nombre/empresa/...) como el formato
// real que exporta el pipeline de scraping de leads en Apify (negocio/
// contacto/puesto/sitio_web/instagram/linkedin/ciudad/rating/resenas/
// senal_de_calificacion/fuente/fecha).
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nombre", "name", "contacto"],
  email: ["email", "correo"],
  phone: ["telefono", "teléfono", "phone"],
  role: ["cargo", "role", "puesto"],
  company: ["empresa", "company", "negocio"],
  temperature: ["temperatura", "temperature"],
  source: ["fuente", "source"],
  notes: ["notas", "notes"],
  website: ["sitio_web", "website", "web"],
  instagram: ["instagram"],
  linkedin: ["linkedin"],
  city: ["ciudad", "city"],
  rating: ["rating"],
  reviews: ["resenas", "reseñas", "reviews"],
  qualification: [
    "senal_de_calificacion",
    "señal_de_calificación",
    "qualification",
  ],
  date: ["fecha", "date"],
};

function mapHeaders(headerRow: string[]) {
  const normalized = headerRow.map((h) => h.trim().toLowerCase());
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

export default function ImportContactsButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const table = parseCsv(text);
      if (table.length < 2) {
        toast.error("El archivo no tiene filas de datos");
        return;
      }

      const [header, ...dataRows] = table;
      const map = mapHeaders(header);
      if (map.company === undefined) {
        toast.error('El CSV necesita una columna "empresa" o "negocio"');
        return;
      }

      const get = (field: string, r: string[]) =>
        map[field] !== undefined ? r[map[field]] : undefined;

      const rows = dataRows.map((r) => ({
        name: get("name", r) ?? "",
        company: get("company", r) ?? "",
        email: get("email", r),
        phone: get("phone", r),
        role: get("role", r),
        temperature: get("temperature", r),
        source: get("source", r),
        notes: get("notes", r),
        website: get("website", r),
        instagram: get("instagram", r),
        linkedin: get("linkedin", r),
        city: get("city", r),
        rating: get("rating", r),
        reviews: get("reviews", r),
        qualification: get("qualification", r),
        date: get("date", r),
      }));

      const res = await fetch("/api/contactos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar");

      const parts = [
        `${data.created} contacto${data.created !== 1 ? "s" : ""} creado${data.created !== 1 ? "s" : ""}`,
      ];
      if (data.companiesCreated > 0) {
        parts.push(
          `${data.companiesCreated} empresa${data.companiesCreated !== 1 ? "s" : ""} nueva${data.companiesCreated !== 1 ? "s" : ""}`
        );
      }
      if (data.errors?.length > 0) {
        parts.push(
          `${data.errors.length} fila${data.errors.length !== 1 ? "s" : ""} con error`
        );
      }
      toast.success(parts.join(" · "));
      if (data.errors?.length > 0)
        console.warn("Errores de importación CSV:", data.errors);

      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo importar el archivo"
      );
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="crm-btn-outline"
      >
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Importando..." : "Importar CSV"}
      </button>
    </div>
  );
}
