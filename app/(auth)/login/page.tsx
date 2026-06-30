'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeSlash,
  ArrowRight,
  Recycle,
  Warning,
} from '@phosphor-icons/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result?.error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] bg-zinc-950 relative overflow-hidden flex-col justify-between p-14">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Emerald bloom */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]">
            <Recycle size={20} weight="bold" className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-base leading-none tracking-tight">Central Coopera</p>
            <p className="text-zinc-500 text-xs mt-1 leading-none">Intranet operativa</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-medium mb-4">
            Cadena de custodia
          </p>
          <h1 className="text-[3.25rem] font-semibold tracking-tight text-white leading-[1.05] mb-5">
            Trazabilidad<br />
            <span className="text-emerald-400">Interna.</span>
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-[340px]">
            Registro completo, sistema de operación y GPS track de vehículos de la empresa.
          </p>

          {/* Módulos */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { name: 'Operaciones', desc: 'Choferes · GPS' },
              { name: 'CRM', desc: 'Clientes' },
              { name: 'Inventario', desc: 'Pallets · stock' },
            ].map((m) => (
              <div
                key={m.name}
                className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40 backdrop-blur-sm"
              >
                <p className="text-emerald-400 font-semibold text-[15px] tracking-tight leading-none">{m.name}</p>
                <p className="text-zinc-500 text-[11px] mt-1.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Coopera Pro</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16 bg-zinc-50">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Recycle size={17} weight="bold" className="text-white" />
            </div>
            <p className="text-zinc-900 font-semibold tracking-tight">Central Coopera</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Iniciar sesión
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@cooperapro.cl"
                className="input-base"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-12"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <Warning size={16} className="text-red-500 shrink-0" weight="fill" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={17} weight="bold" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-8">
            ¿No tienes cuenta? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  )
}
