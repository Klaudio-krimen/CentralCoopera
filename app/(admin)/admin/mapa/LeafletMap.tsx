'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { minutesSince } from '@/lib/tracking'

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

// Punto azul intenso con pulso tipo radar y borde blanco para destacar
// sobre cualquier parte del mapa. CHOFER un poco más grande que RECICLADOR.
function pulsingIcon(kind: 'CHOFER' | 'RECICLADOR') {
  const core = kind === 'CHOFER' ? 16 : 13
  return L.divIcon({
    className: 'tr-pulse-icon',
    html: `<span class="tr-pulse" style="--core:${core}px">
             <span class="tr-pulse-ring"></span>
             <span class="tr-pulse-core"></span>
           </span>`,
    iconSize:   [core, core],
    iconAnchor: [core / 2, core / 2],
    popupAnchor: [0, -core / 2],
  })
}

export default function LeafletMap({ positions }: { positions: TrackerPosition[] }) {
  return (
    <>
      <style>{`
        .tr-pulse-icon { background: transparent; border: none; }
        .tr-pulse { position: relative; display: block; width: 100%; height: 100%; }
        .tr-pulse-core {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: var(--core); height: var(--core); border-radius: 9999px;
          background: #2563eb; border: 2px solid #ffffff;
          box-shadow: 0 1px 5px rgba(0,0,0,0.35);
        }
        .tr-pulse-ring {
          position: absolute; left: 50%; top: 50%;
          width: var(--core); height: var(--core);
          margin-left: calc(var(--core) / -2); margin-top: calc(var(--core) / -2);
          border-radius: 9999px; background: #2563eb;
          animation: tr-pulse 1.8s ease-out infinite;
        }
        @keyframes tr-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        className="h-[70vh] w-full rounded-2xl overflow-hidden border border-zinc-200"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.map((p) => (
          <Marker key={p.trackerId} position={[p.lat, p.lng]} icon={pulsingIcon(p.kind)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-zinc-900">{p.label}</p>
                <p className="text-zinc-500">{p.kind === 'CHOFER' ? 'Chofer' : 'Reciclador'}</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Última señal: hace {minutesSince(p.recordedAt)} min
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
