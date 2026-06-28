'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TrackerPosition } from './LeafletMap'

// Leaflet toca `window` al cargar → import dinámico sin SSR
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full rounded-2xl bg-zinc-100 animate-pulse" />,
})

const POLL_MS = 15_000

export default function MapaClient() {
  const [positions, setPositions] = useState<TrackerPosition[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/posiciones/activas')
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as TrackerPosition[]
        if (!cancelled) {
          setPositions(data)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true) // conserva el último estado bueno
      }
    }

    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (positions === null && !error) {
    return <div className="h-[70vh] w-full rounded-2xl bg-zinc-100 animate-pulse" />
  }

  if (positions !== null && positions.length === 0) {
    return (
      <div className="h-[70vh] w-full rounded-2xl border border-zinc-200 bg-white flex flex-col items-center justify-center">
        <p className="text-zinc-500 font-medium">Ningún tracker activo en este momento</p>
        <p className="text-zinc-400 text-sm mt-1">Las posiciones aparecerán cuando un chofer abra la app</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-amber-600">Reconectando… mostrando la última información disponible.</p>
      )}
      <LeafletMap positions={positions ?? []} />
    </div>
  )
}
