'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'

export default function RecepcionSearch() {
  const [code, setCode] = useState('')
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = code.trim().toUpperCase()
    if (!q) return

    const res = await fetch(`/api/ordenes?code=${encodeURIComponent(q)}`)
    const data = await res.json()

    if (data[0]?.id) {
      router.push(`/recepcion/recibir/${data[0].id}`)
    } else {
      alert(`No se encontró la orden "${q}"`)
    }
  }

  return (
    <form onSubmit={handleSearch}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Buscar por código (ej: RET-2026-0042)"
            className="input-base pl-9 uppercase placeholder:normal-case"
          />
        </div>
        <button type="submit" disabled={!code.trim()} className="btn-secondary shrink-0">
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  )
}
