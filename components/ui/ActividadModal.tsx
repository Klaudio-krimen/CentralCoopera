"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClockClockwise, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/crm/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/crm/ui/dialog";
import { Input } from "@/components/crm/ui/input";
import { Label } from "@/components/crm/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/crm/ui/select";

const TIPOS = [
  { value: "LLAMADA", label: "Llamada" },
  { value: "EMAIL", label: "Email" },
  { value: "REUNION", label: "Reunión" },
  { value: "NOTA", label: "Nota" },
  { value: "SEGUIMIENTO", label: "Seguimiento" },
];

interface EmpresaOption {
  id: string;
  name: string;
}

export default function ActividadModal({
  companyId,
  contactId,
  dealId,
  empresas,
}: {
  companyId?: string;
  contactId?: string;
  dealId?: string;
  empresas?: EmpresaOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    companyId: companyId ?? "",
    type: "NOTA",
    description: "",
    scheduledAt: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const needsCompanySelect = !companyId && empresas;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: companyId ?? form.companyId,
          contactId: contactId || null,
          dealId: dealId || null,
          type: form.type,
          description: form.description,
          scheduledAt: form.scheduledAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setForm({
        companyId: companyId ?? "",
        type: "NOTA",
        description: "",
        scheduledAt: "",
      });
      toast.success("Actividad registrada");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ClockClockwise size={15} />
        Registrar
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar actividad</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsCompanySelect && (
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Select
                value={form.companyId}
                onValueChange={(v) => v && set("companyId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas!.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v) => v && set("type", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actividad-desc">Descripción *</Label>
            <Input
              id="actividad-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ej: Llamada para coordinar visita al taller"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actividad-scheduled">
              Programada para (opcional)
            </Label>
            <Input
              id="actividad-scheduled"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-crm-destructive/10 border border-crm-destructive/20 text-sm text-crm-destructive">
              <Warning size={15} weight="fill" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.description}
              className="flex-1"
            >
              {loading ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
