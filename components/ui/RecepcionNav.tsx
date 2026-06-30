'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Recycle, SignOut, Truck, ClipboardText } from '@phosphor-icons/react'

const NAV = [
  { href: '/recepcion/dashboard', label: 'Recepcionar', icon: Truck },
  { href: '/recepcion/historial', label: 'Historial',   icon: ClipboardText },
]

export default function RecepcionNav({ userName }: { userName: string }) {
  const path = usePathname()

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-zinc-100 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            <Recycle size={15} weight="bold" className="text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm tracking-tight">Central Coopera</span>
          <span className="text-zinc-300 text-sm">·</span>
          <span className="text-xs text-zinc-500 font-medium">Recepción</span>
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500 hidden sm:block truncate max-w-[120px]">{userName}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 transition-colors"
          >
            <SignOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
