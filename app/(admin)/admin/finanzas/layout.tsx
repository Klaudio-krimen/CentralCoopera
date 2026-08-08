import { ReactNode } from "react";
import Link from "next/link";

const NAV = [
  { href: "/admin/finanzas", label: "Resumen" },
  { href: "/admin/finanzas/movimientos", label: "Movimientos" },
  { href: "/admin/finanzas/proveedores", label: "Proveedores" },
  { href: "/admin/finanzas/trabajadores", label: "Trabajadores" },
  { href: "/admin/finanzas/anticipos", label: "Anticipos" },
  { href: "/admin/finanzas/nominas", label: "Nóminas" },
  { href: "/admin/finanzas/auditoria", label: "Auditoría" },
];

// Shell del módulo: navegación entre las nueve pantallas. La protección de
// acceso vive en middleware.ts (hasFinanceAccess) y en cada ruta de API;
// este layout es sólo presentación, igual que el de CRM.
export default function FinanzasLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="mb-6 border-b border-[#E2E8F0] pb-3">
        <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-[#0F172A]">
          Finanzas
        </h1>
        <nav
          aria-label="Navegación de Finanzas"
          className="mt-3 flex flex-wrap gap-1"
        >
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
