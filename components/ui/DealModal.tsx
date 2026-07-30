"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, Warning } from "@phosphor-icons/react";
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

interface ContactoOption {
  id: string;
  name: string;
}
interface EmpresaOption {
  id: string;
  name: string;
  contacts: ContactoOption[];
}

interface DealInitial {
  id: string;
  title: string;
  value: number;
  probability: number;
  contactId: string | null;
  expectedClose: string | null; // yyyy-mm-dd
  notes: string | null;
}

export default function DealModal({
  companyId,
  contactos,
  empresas,
  initialData,
  trigger,
}: {
  companyId?: string;
  contactos?: ContactoOption[];
  empresas?: EmpresaOption[];
  initialData?: DealInitial;
  trigger?: React.ReactNode;
}) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    companyId: companyId ?? "",
    title: initialData?.title ?? "",
    value: initialData ? String(initialData.value) : "",
    probability: initialData ? String(initialData.probability) : "20",
    contactId: initialData?.contactId ?? "",
    expectedClose: initialData?.expectedClose ?? "",
    notes: initialData?.notes ?? "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const needsCompanySelect = !companyId && !isEdit && empresas;
  const availableContactos = needsCompanySelect
    ? (empresas!.find((e) => e.id === form.companyId)?.contacts ?? [])
    : (contactos ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                id: initialData!.id,
                title: form.title,
                value: form.value || 0,
                probability: form.probability || 0,
                contactId: form.contactId || null,
                expectedClose: form.expectedClose || null,
                notes: form.notes,
              }
            : {
                companyId: companyId ?? form.companyId,
                contactId: form.contactId || null,
                title: form.title,
                value: form.value || 0,
                probability: form.probability || 0,
                expectedClose: form.expectedClose || null,
                notes: form.notes,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      if (!isEdit) {
        setForm({
          companyId: companyId ?? "",
          title: "",
          value: "",
          probability: "20",
          contactId: "",
          expectedClose: "",
          notes: "",
        });
      }
      toast.success(isEdit ? "Deal actualizado" : "Deal creado");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Target size={15} />
          Deal
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar deal" : "Nuevo deal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsCompanySelect && (
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Select
                value={form.companyId}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, companyId: v, contactId: "" }))
                }
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
            <Label htmlFor="deal-title">Título *</Label>
            <Input
              id="deal-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ej: Suministro mensual de pallets"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Valor (CLP)</Label>
              <Input
                id="deal-value"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-probability">Probabilidad (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => set("probability", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contacto</Label>
            <Select
              value={form.contactId}
              onValueChange={(v) => set("contactId", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin contacto asignado" />
              </SelectTrigger>
              <SelectContent>
                {availableContactos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-close">Cierre estimado</Label>
            <Input
              id="deal-close"
              type="date"
              value={form.expectedClose ?? ""}
              onChange={(e) => set("expectedClose", e.target.value)}
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
              disabled={loading || !form.title}
              className="flex-1"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
