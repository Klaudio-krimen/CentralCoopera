"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { UserCirclePlus, SpinnerGap, Warning } from "@phosphor-icons/react";

const ROLES = [
  { value: "CHOFER", label: "Chofer" },
  { value: "RECEPCION", label: "Recepcionista" },
  { value: "VENTAS", label: "Encargada de Ventas (CRM)" },
  { value: "BODEGA", label: "Bodeguero encargado (Inventario)" },
  { value: "ADMIN", label: "Administrador" },
];

const MODULES = [
  { value: "OPERACIONES", label: "Operaciones" },
  { value: "CRM", label: "CRM" },
  { value: "INVENTARIO", label: "Inventario" },
];

// Roles cuyo acceso a módulos se puede personalizar. CHOFER/RECEPCION no
// usan el panel admin; ADMIN ya ve todo sin importar moduleAccess.
const CUSTOMIZABLE_ROLES = ["VENTAS", "BODEGA"];

function defaultModulesForRole(role: string): string[] {
  if (role === "VENTAS") return ["CRM"];
  if (role === "BODEGA") return ["INVENTARIO"];
  return [];
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "CHOFER",
  moduleAccess: [] as string[],
};

export default function NuevoUsuarioModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const formId = useId();

  const [form, setForm] = useState(EMPTY_FORM);

  const set = (k: "name" | "email" | "password", v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setRole = (role: string) =>
    setForm((f) => ({ ...f, role, moduleAccess: defaultModulesForRole(role) }));

  const toggleModule = (module: string) =>
    setForm((f) => ({
      ...f,
      moduleAccess: f.moduleAccess.includes(module)
        ? f.moduleAccess.filter((m) => m !== module)
        : [...f.moduleAccess, module],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setError("");
        setOpen(nextOpen);
      }}
      busy={loading}
      title="Nuevo usuario"
      trigger={
        <button type="button" className="btn-primary">
          <UserCirclePlus size={17} aria-hidden="true" />
          Nuevo usuario
        </button>
      }
    >
      <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-name`}
            className="block text-sm font-medium text-zinc-700"
          >
            Nombre completo
          </label>
          <input
            id={`${formId}-name`}
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
          <label
            htmlFor={`${formId}-email`}
            className="block text-sm font-medium text-zinc-700"
          >
            Correo electrónico
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="usuario@cooperapro.cl"
            className="input-base"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-password`}
            className="block text-sm font-medium text-zinc-700"
          >
            Contraseña temporal
          </label>
          <input
            id={`${formId}-password`}
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="input-base"
            minLength={8}
            required
          />
          <p className="text-xs text-zinc-500">
            El usuario deberá cambiarla en el primer ingreso.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-role`}
            className="block text-sm font-medium text-zinc-700"
          >
            Rol
          </label>
          <select
            id={`${formId}-role`}
            value={form.role}
            onChange={(e) => setRole(e.target.value)}
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

        {CUSTOMIZABLE_ROLES.includes(form.role) && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              Acceso a módulos
            </label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => {
                const checked = form.moduleAccess.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleModule(m.value)}
                    aria-pressed={checked}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      checked
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium"
                        : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              Puede combinar más de un módulo (ej: Operaciones + CRM para un
              supervisor).
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"
          >
            <Warning size={15} weight="fill" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !form.name || !form.email || !form.password}
            className="btn-primary flex-1"
          >
            {loading ? (
              <>
                <SpinnerGap
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Creando usuario…
              </>
            ) : (
              "Crear usuario"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
