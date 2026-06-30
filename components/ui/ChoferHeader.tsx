'use client'

import { signOut } from 'next-auth/react'
import { Recycle, SignOut, User } from '@phosphor-icons/react'
import { useState } from 'react'

export default function ChoferHeader({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 bg-zinc-50/90 backdrop-blur-md border-b border-zinc-100 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            <Recycle size={15} weight="bold" className="text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm tracking-tight">Central Coopera</span>
        </div>

        {/* Avatar menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 hover:bg-zinc-300 active:translate-y-[1px] transition-all"
          >
            {initials || <User size={14} />}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl border border-zinc-100 shadow-card-hover py-1 overflow-hidden animate-fade-up">
                <div className="px-3 py-2 border-b border-zinc-50">
                  <p className="text-xs font-medium text-zinc-900 truncate">{userName}</p>
                  <p className="text-[11px] text-zinc-400">Chofer</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <SignOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
