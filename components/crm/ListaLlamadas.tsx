"use client";

// Tabla cliente de la vista `/admin/crm/llamadas` (E2-T6). Recibe los contactos
// con teléfono ya materializados por la page (server component); acá sólo se
// filtra en memoria (búsqueda + estado) y se edita el `callStatus` in-line.
// Una fila = un contacto; click en la fila (fuera del `<Select>`) abre la ficha
// de su empresa. Sólo tokens/clases `crm-*` y primitivos de `components/crm/ui/*`.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall } from "@phosphor-icons/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/crm/ui/table";
import { Button } from "@/components/crm/ui/button";
import CallStatusSelect from "@/components/crm/CallStatusSelect";

type CallStatus =
  "POR_LLAMAR" | "LLAMADA" | "SIN_RESPUESTA" | "CORREO_CONSEGUIDO";

export interface LlamadaContacto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  callStatus: CallStatus | null;
  company: { id: string; name: string; segment: string | null };
}

const FILTROS: { value: CallStatus | null; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "POR_LLAMAR", label: "Por llamar" },
  { value: "LLAMADA", label: "Llamada" },
  { value: "SIN_RESPUESTA", label: "Sin respuesta" },
  { value: "CORREO_CONSEGUIDO", label: "Correo conseguido" },
];

export default function ListaLlamadas({ data }: { data: LlamadaContacto[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [callStatusFilter, setCallStatusFilter] = useState<CallStatus | null>(
    null
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (callStatusFilter !== null && c.callStatus !== callStatusFilter) {
        return false;
      }
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.company.name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data, search, callStatusFilter]);

  // Empty state: sin contactos con teléfono en absoluto — no una tabla vacía.
  if (data.length === 0) {
    return (
      <div className="crm-card text-center py-16">
        <PhoneCall
          size={32}
          weight="duotone"
          className="mx-auto text-crm-muted"
        />
        <p className="text-crm-muted text-sm mt-3">
          No hay contactos con teléfono para llamar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por contacto o empresa…"
          className="crm-input w-full max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <Button
              key={f.label}
              size="sm"
              variant={callStatusFilter === f.value ? "default" : "outline"}
              onClick={() => setCallStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="crm-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() =>
                  router.push("/admin/crm/clientes/" + c.company.id)
                }
              >
                <TableCell className="font-medium text-crm-foreground">
                  {c.company.name}
                </TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="tabular-nums">{c.phone}</TableCell>
                {/* El click en el <Select> no debe navegar a la ficha. */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CallStatusSelect contactId={c.id} value={c.callStatus} />
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-crm-muted"
                >
                  Ningún contacto coincide con el filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
