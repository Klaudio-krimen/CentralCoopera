"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Buildings, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/crm/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/crm/ui/dialog";
import { Input } from "@/components/crm/ui/input";
import { Label } from "@/components/crm/ui/label";

export default function NuevaEmpresaModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    address: "",
    contactName: "",
    contactPhone: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setForm({ name: "", address: "", contactName: "", contactPhone: "" });
      toast.success("Empresa creada");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Buildings size={17} />
        Nueva empresa
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva empresa cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="empresa-name">Nombre de la empresa *</Label>
            <Input
              id="empresa-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Vidrios del Sur SA"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="empresa-address">Dirección</Label>
            <Input
              id="empresa-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Ej: Av. Pajaritos 3500, Maipú"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="empresa-contact-name">Contacto</Label>
              <Input
                id="empresa-contact-name"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-contact-phone">Teléfono</Label>
              <Input
                id="empresa-contact-phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="+56 9 xxxx xxxx"
              />
            </div>
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
              {loading ? "Guardando..." : "Agregar empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
