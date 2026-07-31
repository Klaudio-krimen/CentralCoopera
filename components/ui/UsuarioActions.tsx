"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DotsThree,
  LockSimple,
  LockSimpleOpen,
  PencilSimple,
  Trash,
  SpinnerGap,
} from "@phosphor-icons/react";
import EditarUsuarioModal, { type EditableUser } from "./EditarUsuarioModal";

export default function UsuarioActions({
  user,
}: {
  user: EditableUser & { isActive: boolean };
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const toggleActive = async () => {
    setLoading(true);
    setOpen(false);
    await fetch("/api/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    router.refresh();
    setLoading(false);
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`))
      return;
    setLoading(true);
    setOpen(false);
    const res = await fetch(`/api/usuarios?id=${user.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "No se pudo eliminar el usuario");
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  };

  if (loading) {
    return <SpinnerGap size={16} className="animate-spin text-zinc-400" />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Acciones del usuario"
        className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
      >
        <DotsThree size={18} className="text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl border border-zinc-100 shadow-card-hover py-1 animate-fade-up">
            <button
              onClick={() => {
                setEditOpen(true);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <PencilSimple size={14} />
              Editar
            </button>

            <button
              onClick={toggleActive}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                user.isActive
                  ? "text-red-600 hover:bg-red-50"
                  : "text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {user.isActive ? (
                <>
                  <LockSimple size={14} />
                  Desactivar
                </>
              ) : (
                <>
                  <LockSimpleOpen size={14} />
                  Activar
                </>
              )}
            </button>

            <button
              onClick={eliminar}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash size={14} />
              Eliminar
            </button>
          </div>
        </>
      )}

      {editOpen && (
        <EditarUsuarioModal user={user} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
