"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UserCirclePlus, X, SpinnerGap, Warning } from "@phosphor-icons/react";

const ROLES = [
  { value: "CHOFER", label: "Chofer" },
  { value: "RECEPCION", label: "Recepcionista" },
  { value: "VENTAS", label: "Encargada de Ventas (CRM)" },
  { value: "BODEGA", label: "Bodeguero encargado (Inventario)" },
  { value: "ADMIN", label: "Administrador" },
];

export default function NuevoUsuarioModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CHOFER",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "CHOFER" });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <UserCirclePlus size={17} />
        Nuevo usuario
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <div className="relative z-10 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-md p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Nuevo usuario
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ej: María González Pérez"
                    className="input-base"
                    autoCapitalize="words"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="usuario@cooperapro.cl"
                    className="input-base"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Contraseña temporal
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="input-base"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-zinc-400">
                    El usuario deberá cambiarla en el primer ingreso.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Rol
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => set("role", e.target.value)}
                    className="input-base"
                    required
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    <Warning size={15} weight="fill" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading || !form.name || !form.email || !form.password
                    }
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <SpinnerGap size={16} className="animate-spin" />
                    ) : (
                      "Crear usuario"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
