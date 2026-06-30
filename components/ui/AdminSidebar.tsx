'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Recycle,
  ChartBar,
  Warning,
  Truck,
  Users,
  Buildings,
  FileText,
  MapPin,
  SignOut,
  AddressBook,
  Stack,
  Package,
  ArrowsLeftRight,
  Lock,
  type Icon,
} from '@phosphor-icons/react'

// ── Module definitions ───────────────────────────────────────────────────────

type ModuleKey = 'operaciones' | 'crm' | 'inventario'

interface NavItem {
  href: string
  label: string
  icon: Icon
  badge?: 'discrepancias'
}

interface ModuleDef {
  key: ModuleKey
  label: string
  tag: string
  live: boolean
  // accent classes per module — Operaciones=emerald, CRM=blue, Finanzas=amber
  dot: string
  activeBg: string
  activeText: string
  activeIcon: string
  nav: NavItem[]
}

const MODULES: ModuleDef[] = [
  {
    key: 'operaciones',
    label: 'Operaciones',
    tag: 'Operaciones',
    live: true,
    dot: 'bg-emerald-500',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700',
    activeIcon: 'text-emerald-600',
    nav: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: ChartBar },
      { href: '/admin/ordenes', label: 'Órdenes', icon: Truck },
      { href: '/admin/mapa', label: 'Mapa', icon: MapPin },
      { href: '/admin/discrepancias', label: 'Discrepancias', icon: Warning, badge: 'discrepancias' },
      { href: '/admin/choferes', label: 'Choferes', icon: Users },
      { href: '/admin/empresas', label: 'Empresas', icon: Buildings },
      { href: '/admin/reportes', label: 'Reportes', icon: FileText },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    tag: 'CRM · Clientes',
    live: false,
    dot: 'bg-blue-500',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700',
    activeIcon: 'text-blue-600',
    nav: [
      { href: '#', label: 'Clientes', icon: AddressBook },
      { href: '#', label: 'Taller de pallets', icon: Stack },
      { href: '#', label: 'Contactos', icon: Users },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    tag: 'Inventario',
    live: false,
    dot: 'bg-amber-500',
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-700',
    activeIcon: 'text-amber-600',
    nav: [
      { href: '#', label: 'Stock', icon: Package },
      { href: '#', label: 'Pallets', icon: Stack },
      { href: '#', label: 'Movimientos', icon: ArrowsLeftRight },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminSidebar({
  userName,
  email,
  discrepanciasCount = 0,
}: {
  userName: string
  email: string
  discrepanciasCount?: number
}) {
  const path = usePathname()
  const [active, setActive] = useState<ModuleKey>('operaciones')
  const mod = MODULES.find((m) => m.key === active)!

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-zinc-200/70 min-h-[100dvh] sticky top-0">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            <Recycle size={16} weight="bold" className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-semibold text-zinc-900 tracking-tight">Central Coopera</p>
            <p className="text-[11px] text-zinc-500 mt-1">{mod.tag}</p>
          </div>
        </div>
      </div>

      {/* Module switcher — segmented control */}
      <div className="px-4 pb-3">
        <div className="flex gap-0.5 p-1 rounded-xl bg-zinc-100/80" role="tablist" aria-label="Módulos">
          {MODULES.map((m) => {
            const on = m.key === active
            return (
              <button
                key={m.key}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(m.key)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                  on
                    ? 'bg-white text-zinc-900 shadow-[0_1px_2px_-1px_rgba(24,24,27,0.12)]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {m.label}
                {!m.live && <Lock size={9} weight="bold" className="text-zinc-400" aria-label="próximamente" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {!mod.live && (
          <p className="px-3 pt-2 pb-3 text-[11px] text-zinc-400 leading-relaxed">
            Módulo en construcción. Estructura planificada:
          </p>
        )}
        {mod.nav.map(({ href, label, icon: Icon, badge }) => {
          const active = mod.live && path.startsWith(href)
          const showCount = badge === 'discrepancias' && discrepanciasCount > 0

          const inner = (
            <>
              <Icon
                size={17}
                weight={active ? 'fill' : 'regular'}
                className={active ? mod.activeIcon : mod.live ? 'text-zinc-400' : 'text-zinc-300'}
              />
              {label}
              {showCount && (
                <span className="ml-auto text-[11px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full tabular-nums">
                  {discrepanciasCount}
                </span>
              )}
            </>
          )

          if (!mod.live) {
            return (
              <div
                key={label}
                aria-disabled="true"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-400 cursor-default border border-dashed border-zinc-200/80"
              >
                {inner}
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                active
                  ? `${mod.activeBg} ${mod.activeText} font-medium`
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              {inner}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-zinc-200/70 mt-2 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-semibold text-zinc-600 shrink-0">
            {initials || 'CC'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-zinc-500 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Cerrar sesión"
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <SignOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
