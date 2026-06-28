'use client'

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
  GearSix,
} from '@phosphor-icons/react'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: ChartBar },
  { href: '/admin/ordenes',       label: 'Órdenes',       icon: Truck },
  { href: '/admin/mapa',          label: 'Mapa',          icon: MapPin },
  { href: '/admin/discrepancias', label: 'Discrepancias', icon: Warning },
  { href: '/admin/choferes',      label: 'Choferes',      icon: Users },
  { href: '/admin/empresas',      label: 'Empresas',      icon: Buildings },
  { href: '/admin/reportes',      label: 'Reportes',      icon: FileText },
]

export default function AdminSidebar({ userName, email }: { userName: string; email: string }) {
  const path = usePathname()

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-zinc-100 min-h-[100dvh] sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Recycle size={16} weight="bold" className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 leading-none">TrackResiduos</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              <Icon
                size={17}
                weight={active ? 'fill' : 'regular'}
                className={active ? 'text-emerald-600' : 'text-zinc-400'}
              />
              {label}
              {href === '/admin/discrepancias' && (
                <span className="ml-auto text-[11px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  !
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-zinc-50 pt-4 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-zinc-900 truncate">{userName}</p>
          <p className="text-[11px] text-zinc-400 truncate">{email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <SignOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
