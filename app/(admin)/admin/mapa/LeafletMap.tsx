'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { signalFreshness, minutesSince } from '@/lib/tracking'

export interface TrackerPosition {
  trackerId:  string
  label:      string
  kind:       'CHOFER' | 'RECICLADOR'
  lat:        number
  lng:        number
  recordedAt: string
}

// Centro por defecto: Santiago de Chile (Región Metropolitana)
const DEFAULT_CENTER: [number, number] = [-33.45, -70.66]

export default function LeafletMap({ positions }: { positions: TrackerPosition[] }) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      className="h-[70vh] w-full rounded-2xl overflow-hidden border border-zinc-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.map((p) => {
        const fresh = signalFreshness(p.recordedAt) === 'fresh'
        const color = fresh ? '#10b981' : '#a1a1aa' // emerald-500 / zinc-400
        const radius = p.kind === 'CHOFER' ? 10 : 7
        return (
          <CircleMarker
            key={p.trackerId}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-zinc-900">{p.label}</p>
                <p className="text-zinc-500">{p.kind === 'CHOFER' ? 'Chofer' : 'Reciclador'}</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Última señal: hace {minutesSince(p.recordedAt)} min
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
