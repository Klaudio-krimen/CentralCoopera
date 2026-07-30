"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Warning } from "@phosphor-icons/react";
import { CONTACT_SOURCE_LABELS } from "@/lib/utils";
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

interface ContactoInitial {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  temperature?: "FRIO" | "TIBIO" | "CALIENTE";
  score?: number;
  source?: keyof typeof CONTACT_SOURCE_LABELS;
}

interface EmpresaOption {
  id: string;
  name: string;
}

export default function ContactoModal({
  companyId,
  empresas,
  initialData,
  trigger,
}: {
  companyId?: string;
  empresas?: EmpresaOption[];
  initialData?: ContactoInitial;
  trigger?: React.ReactNode;
}) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    companyId: companyId ?? "",
    name: initialData?.name ?? "",
    role: initialData?.role ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    notes: initialData?.notes ?? "",
    temperature: initialData?.temperature ?? "FRIO",
    score: String(initialData?.score ?? 0),
    source: initialData?.source ?? "OTRO",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = isEdit
        ? { id: initialData!.id, ...form }
        : { ...form, companyId: companyId ?? form.companyId };
      const res = await fetch("/api/contactos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      toast.success(isEdit ? "Contacto actualizado" : "Contacto creado");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const needsCompanySelect = !companyId && !isEdit && empresas;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <UserPlus size={15} />
          Contacto
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar contacto" : "Nuevo contacto"}
          </DialogTitle>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contacto-name">Nombre *</Label>
              <Input
                id="contacto-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nombre completo"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contacto-role">Cargo</Label>
              <Input
                id="contacto-role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Ej: Jefe de compras"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contacto-email">Email</Label>
              <Input
                id="contacto-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="correo@empresa.cl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contacto-phone">Teléfono</Label>
              <Input
                id="contacto-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+56 9 xxxx xxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select
                value={form.temperature}
                onValueChange={(v) => v && set("temperature", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRIO">Frío</SelectItem>
                  <SelectItem value="TIBIO">Tibio</SelectItem>
                  <SelectItem value="CALIENTE">Caliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contacto-score">Score (0-100)</Label>
              <Input
                id="contacto-score"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={form.score}
                onChange={(e) => set("score", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select
              value={form.source}
              onValueChange={(v) => v && set("source", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contacto-notes">Notas</Label>
            <Input
              id="contacto-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Opcional"
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
              disabled={loading || !form.name}
              className="flex-1"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear contacto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
