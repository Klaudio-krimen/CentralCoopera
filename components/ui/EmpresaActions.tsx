"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DotsThree,
  ToggleLeft,
  ToggleRight,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useDropdownPosition } from "./useDropdownPosition";

export default function EmpresaActions({
  empresaId,
  isActive,
}: {
  empresaId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pos = useDropdownPosition(triggerRef, open, {
    placement: "above",
    menuWidth: 176, // w-44
    menuHeight: 52, // py-1 container + 1 item (Activar/Desactivar)
    onDismiss: () => setOpen(false),
  });

  const toggle = async () => {
    const verb = isActive ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${verb} esta empresa?`)) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/empresas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: empresaId, isActive: !isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(isActive ? "Empresa desactivada" : "Empresa activada");
      router.refresh();
    } catch {
      toast.error(`No se pudo ${verb} la empresa`);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <SpinnerGap size={14} className="animate-spin text-crm-muted" />;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-label="Acciones de la empresa"
        className="w-7 h-7 rounded-lg hover:bg-crm-secondary flex items-center justify-center transition-colors"
      >
        <DotsThree size={18} className="text-crm-muted" weight="bold" />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              style={{ top: pos.top, left: pos.left, bottom: pos.bottom }}
              className="fixed z-50 w-44 bg-crm-card rounded-xl border border-crm-border shadow-card-hover py-1 animate-fade-up"
            >
              <button
                onClick={toggle}
                className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-crm-muted hover:bg-crm-secondary"
                    : "text-crm-success hover:bg-crm-secondary"
                }`}
              >
                {isActive ? (
                  <>
                    <ToggleLeft size={15} />
                    Desactivar empresa
                  </>
                ) : (
                  <>
                    <ToggleRight size={15} />
                    Activar empresa
                  </>
                )}
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
