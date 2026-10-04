"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { signOut } from "next-auth/react";
import {
  List,
  X,
  Recycle,
  ChartBar,
  Warning,
  Truck,
  Users,
  FileText,
  MapPin,
  SignOut,
  Target,
  Briefcase,
  ListChecks,
  Buildings,
  GearSix,
  Package,
  ArrowsLeftRight,
  PaperPlaneTilt,
  PhoneCall,
  HandCoins,
  Money,
  MagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";
import { hasFinanceAccess } from "@/lib/access";
import { isActiveNavHref } from "@/lib/navigation";

// ── Module definitions ───────────────────────────────────────────────────────

type ModuleKey = "operaciones" | "crm" | "inventario" | "finanzas";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: "discrepancias";
}

interface ModuleDef {
  key: ModuleKey;
  label: string;
  tag: string;
  activeBg: string;
  activeText: string;
  activeIcon: string;
  nav: NavItem[];
}

const MODULES: ModuleDef[] = [
  {
    key: "operaciones",
    label: "Operaciones",
    tag: "Operaciones",
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-700",
    activeIcon: "text-emerald-600",
    nav: [
      { href: "/admin/dashboard", label: "Panel De Control", icon: ChartBar },
      { href: "/admin/ordenes", label: "Órdenes", icon: Truck },
      { href: "/admin/mapa", label: "Mapa", icon: MapPin },
      {
        href: "/admin/discrepancias",
        label: "Discrepancias",
        icon: Warning,
        badge: "discrepancias",
      },
      { href: "/admin/choferes", label: "Equipo", icon: Users },
      { href: "/admin/reportes", label: "Reportes", icon: FileText },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    tag: "CRM · Clientes",
    activeBg: "bg-blue-50",
    activeText: "text-blue-700",
    activeIcon: "text-blue-600",
    nav: [
      {
        href: "/admin/crm/dashboard",
        label: "Panel de control",
        icon: ChartBar,
      },
      { href: "/admin/crm/clientes", label: "Clientes", icon: Buildings },
      { href: "/admin/crm/pipeline", label: "Pizarra", icon: Target },
      { href: "/admin/crm/deals", label: "Cierre", icon: Briefcase },
      {
        href: "/admin/crm/actividades",
        label: "Actividades",
        icon: ListChecks,
      },
      {
        href: "/admin/crm/outreach",
        label: "Outreach",
        icon: PaperPlaneTilt,
      },
      { href: "/admin/crm/llamadas", label: "Llamadas", icon: PhoneCall },
      {
        href: "/admin/crm/configuracion",
        label: "Configuración",
        icon: GearSix,
      },
    ],
  },
  {
    key: "inventario",
    label: "Inventario",
    tag: "Inventario",
    activeBg: "bg-amber-50",
    activeText: "text-amber-700",
    activeIcon: "text-amber-600",
    nav: [
      { href: "/admin/inventario/stock", label: "Stock", icon: Package },
      {
        href: "/admin/inventario/movimientos",
        label: "Movimientos",
        icon: ArrowsLeftRight,
      },
    ],
  },
  {
    key: "finanzas",
    label: "Finanzas",
    tag: "Finanzas",
    activeBg: "bg-indigo-50",
    activeText: "text-indigo-700",
    activeIcon: "text-indigo-600",
    nav: [
      { href: "/admin/finanzas", label: "Resumen", icon: ChartBar },
      {
        href: "/admin/finanzas/movimientos",
        label: "Movimientos",
        icon: ArrowsLeftRight,
      },
      {
        href: "/admin/finanzas/proveedores",
        label: "Proveedores",
        icon: Buildings,
      },
      {
        href: "/admin/finanzas/trabajadores",
        label: "Trabajadores",
        icon: Users,
      },
      {
        href: "/admin/finanzas/anticipos",
        label: "Anticipos",
        icon: HandCoins,
      },
      { href: "/admin/finanzas/nominas", label: "Nóminas", icon: Money },
      {
        href: "/admin/finanzas/auditoria",
        label: "Auditoría",
        icon: MagnifyingGlass,
      },
    ],
  },
];

// Módulos con bypass de ADMIN vía hasModuleAccess(): Operaciones, CRM e
// Inventario siguen viéndose completos aunque no haya moduleAccess explícito.
const MODULES_CON_BYPASS_ADMIN: ModuleKey[] = [
  "operaciones",
  "crm",
  "inventario",
];

// Convierte la key del módulo (minúscula, uso interno) al valor del enum
// ModuleAccess en la base de datos (mayúscula). Finanzas no entra aquí: se
// resuelve con hasFinanceAccess() porque admite dos grants (FINANZAS y
// FINANZAS_LECTURA), no uno solo.
const MODULE_ACCESS_KEY: Record<Exclude<ModuleKey, "finanzas">, string> = {
  operaciones: "OPERACIONES",
  crm: "CRM",
  inventario: "INVENTARIO",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminSidebar({
  userName,
  email,
  role,
  moduleAccess,
  discrepanciasCount = 0,
}: {
  userName: string;
  email: string;
  role: string;
  moduleAccess: string[];
  discrepanciasCount?: number;
}) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = role === "ADMIN";

  // Finanzas se filtra siempre por moduleAccess, incluso para ADMIN — a
  // diferencia de los otros tres módulos, que conservan el bypass. Partimos
  // la lista en el grupo con bypass y el grupo sin bypass, y concatenamos.
  const modulosConBypass = MODULES.filter((m) =>
    MODULES_CON_BYPASS_ADMIN.includes(m.key)
  );
  const modulosSinBypass = MODULES.filter(
    (m) => !MODULES_CON_BYPASS_ADMIN.includes(m.key)
  );

  const visibleModules = [
    ...(isAdmin
      ? modulosConBypass
      : modulosConBypass.filter((m) =>
          moduleAccess.includes(
            MODULE_ACCESS_KEY[m.key as Exclude<ModuleKey, "finanzas">]
          )
        )),
    ...modulosSinBypass.filter(() => hasFinanceAccess({ role, moduleAccess })),
  ];

  const active: ModuleKey = path.startsWith("/admin/crm")
    ? "crm"
    : path.startsWith("/admin/inventario")
      ? "inventario"
      : path.startsWith("/admin/finanzas")
        ? "finanzas"
        : "operaciones";

  useEffect(() => setMobileOpen(false), [path]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const mod = visibleModules.find((m) => m.key === active) ?? visibleModules[0];

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  if (!mod) return null;

  const navigation = (
    <>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-700">
            <Recycle
              size={16}
              weight="bold"
              className="text-white"
              aria-hidden="true"
            />
          </div>
          <div className="leading-none">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">
              Central Coopera
            </p>
            <p className="mt-1 text-xs text-zinc-500">{mod.tag}</p>
          </div>
        </div>
      </div>

      {visibleModules.length > 1 && (
        <nav
          aria-label="Módulos"
          className="mx-4 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100/80 p-1"
        >
          {visibleModules.map((m) => (
            <Link
              key={m.key}
              href={m.nav[0].href}
              onClick={() => setMobileOpen(false)}
              aria-current={m.key === active ? "location" : undefined}
              className={`rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                m.key === active
                  ? "bg-white text-zinc-900"
                  : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
      )}

      <nav
        aria-label={`Secciones de ${mod.label}`}
        className="flex-1 space-y-0.5 px-3 py-1"
      >
        {mod.nav.map(({ href, label, icon: Icon, badge }) => {
          const itemActive = isActiveNavHref(path, href);
          const showCount = badge === "discrepancias" && discrepanciasCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={itemActive ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                itemActive
                  ? `${mod.activeBg} ${mod.activeText} font-medium`
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon
                size={17}
                weight={itemActive ? "fill" : "regular"}
                className={itemActive ? mod.activeIcon : "text-zinc-400"}
                aria-hidden="true"
              />
              {label}
              {showCount && (
                <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-red-700">
                  {discrepanciasCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 space-y-1 border-t border-zinc-200/70 px-3 pb-4 pt-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
            {initials || "CC"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-zinc-900">
              {userName}
            </p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <SignOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <Dialog.Trigger
            aria-label="Abrir menú de navegación"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <List size={22} aria-hidden="true" />
          </Dialog.Trigger>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">
              Central Coopera
            </p>
            <p className="text-xs text-zinc-500">{mod.tag}</p>
          </div>
        </header>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-80 max-w-[calc(100%-3rem)] flex-col overflow-y-auto overscroll-contain bg-white shadow-xl outline-none transition-transform duration-200 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full motion-reduce:transition-none">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <Dialog.Title className="text-sm font-semibold text-zinc-900">
                Navegación
              </Dialog.Title>
              <Dialog.Close
                aria-label="Cerrar menú de navegación"
                className="flex size-11 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
            {navigation}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <aside
        aria-label="Navegación principal"
        className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-200/70 bg-white lg:flex"
      >
        {navigation}
      </aside>
    </>
  );
}
