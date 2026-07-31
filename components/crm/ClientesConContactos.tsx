"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/crm/ui/input";
import { Button } from "@/components/crm/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/crm/ui/table";
import TemperatureBadge from "@/components/ui/TemperatureBadge";
import { CONTACT_SOURCE_LABELS, formatDate } from "@/lib/utils";

export interface ContactoDeEmpresa {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  temperature: "FRIO" | "TIBIO" | "CALIENTE";
  score: number;
  source: keyof typeof CONTACT_SOURCE_LABELS;
  createdAt: string | Date;
}

// La ciudad del scraper no tiene columna propia en Contact — el importador
// de CSV (Apify) la guarda como línea legible dentro de "notes" (ver
// app/api/contactos/import/route.ts). Se extrae acá en vez de migrar el
// schema, porque ya está disponible para todos los contactos importados
// sin necesitar un backfill de datos existentes.
function extractNoteField(notes: string | null, label: string): string | null {
  if (!notes) return null;
  const match = notes.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : null;
}

export interface EmpresaConContactos {
  id: string;
  name: string;
  isActive: boolean;
  contacts: ContactoDeEmpresa[];
}

interface Row {
  key: string;
  companyId: string;
  companyName: string;
  companyActive: boolean;
  contact: ContactoDeEmpresa | null;
}

type Temp = "FRIO" | "TIBIO" | "CALIENTE";

const TEMP_FILTERS: { value: Temp | null; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "CALIENTE", label: "Caliente" },
  { value: "TIBIO", label: "Tibio" },
  { value: "FRIO", label: "Frío" },
];

function flatten(empresas: EmpresaConContactos[]): Row[] {
  const rows: Row[] = [];
  for (const e of empresas) {
    if (e.contacts.length === 0) {
      rows.push({
        key: `empresa-${e.id}`,
        companyId: e.id,
        companyName: e.name,
        companyActive: e.isActive,
        contact: null,
      });
    } else {
      for (const c of e.contacts) {
        rows.push({
          key: c.id,
          companyId: e.id,
          companyName: e.name,
          companyActive: e.isActive,
          contact: c,
        });
      }
    }
  }
  return rows;
}

export default function ClientesConContactos({
  empresas,
}: {
  empresas: EmpresaConContactos[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<Temp | null>(null);

  const rows = useMemo(() => flatten(empresas), [empresas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tempFilter && r.contact?.temperature !== tempFilter) return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        (r.contact?.name.toLowerCase().includes(q) ?? false) ||
        (r.contact?.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, tempFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa o contacto..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {TEMP_FILTERS.map((f) => (
              <Button
                key={f.label}
                type="button"
                size="sm"
                variant={tempFilter === f.value ? "default" : "outline"}
                onClick={() => setTempFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/contactos/export")}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="crm-card text-center py-16">
          <p className="text-crm-foreground font-medium">Sin resultados</p>
          <p className="text-crm-muted text-sm mt-1">
            Prueba con otro nombre de empresa o contacto
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-crm-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Ciudad</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead className="hidden md:table-cell">Score</TableHead>
                <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.key}
                  className={`cursor-pointer ${!r.companyActive ? "opacity-50" : ""}`}
                  onClick={() =>
                    router.push(
                      r.contact
                        ? `/admin/crm/contactos/${r.contact.id}`
                        : `/admin/crm/clientes/${r.companyId}`
                    )
                  }
                >
                  <TableCell>
                    <p className="font-medium text-crm-foreground">
                      {r.contact?.name ?? r.companyName}
                      {!r.companyActive && (
                        <span className="text-crm-muted font-normal">
                          {" "}
                          · inactiva
                        </span>
                      )}
                    </p>
                    {r.contact?.email ? (
                      <p className="text-xs text-crm-muted">
                        {r.contact.email}
                      </p>
                    ) : !r.contact ? (
                      <p className="text-xs text-crm-muted">
                        Sin contacto registrado
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-crm-foreground">
                    {r.companyName}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-crm-muted">
                    {(r.contact &&
                      extractNoteField(r.contact.notes, "Ciudad")) ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    {r.contact ? (
                      <TemperatureBadge
                        temperature={r.contact.temperature}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-crm-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.contact ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-crm-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-crm-primary rounded-full"
                            style={{ width: `${r.contact.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-crm-muted font-mono tabular-nums">
                          {r.contact.score}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-crm-muted text-xs">
                    {r.contact ? formatDate(r.contact.createdAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-crm-muted">
        {filtered.length} de {rows.length} filas
      </p>
    </div>
  );
}
