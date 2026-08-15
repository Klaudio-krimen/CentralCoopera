"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { minutesSince, signalFreshness } from "@/lib/tracking";

export interface TrackerPosition {
  trackerId: string;
  label: string;
  kind: "CHOFER" | "RECICLADOR";
  lat: number;
  lng: number;
  recordedAt: string;
  /** Desde cuándo tiene turno abierto. `null` en los GPS físicos, que no tienen turno. */
  enTurnoDesde: string | null;
}

// Centro por defecto: Santiago de Chile (Región Metropolitana)
const DEFAULT_CENTER: [number, number] = [-33.45, -70.66];

// El pulso significa "esta posición es de ahora mismo" y por eso NO es
// incondicional: un marcador con la señal atrasada se pinta ámbar y quieto.
// Antes todos pulsaban igual, así que un punto viejo era indistinguible de uno
// en vivo — `signalFreshness` existía y estaba testeado, pero no lo usaba nadie.
// CHOFER un poco más grande que RECICLADOR.
function trackerIcon(kind: "CHOFER" | "RECICLADOR", fresh: boolean) {
  const core = kind === "CHOFER" ? 16 : 13;
  const color = fresh ? "#2563eb" : "#d97706"; // blue-600 / amber-600
  return L.divIcon({
    className: "tr-pulse-icon",
    html: `<span class="tr-pulse" style="--core:${core}px;--color:${color}">
             ${fresh ? '<span class="tr-pulse-ring"></span>' : ""}
             <span class="tr-pulse-core"></span>
           </span>`,
    iconSize: [core, core],
    iconAnchor: [core / 2, core / 2],
    popupAnchor: [0, -core / 2],
  });
}

export default function LeafletMap({
  positions,
}: {
  positions: TrackerPosition[];
}) {
  return (
    <>
      <style>{`
        .tr-pulse-icon { background: transparent; border: none; }
        .tr-pulse { position: relative; display: block; width: 100%; height: 100%; }
        .tr-pulse-core {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: var(--core); height: var(--core); border-radius: 9999px;
          background: var(--color); border: 2px solid #ffffff;
          box-shadow: 0 1px 5px rgba(0,0,0,0.35);
        }
        .tr-pulse-ring {
          position: absolute; left: 50%; top: 50%;
          width: var(--core); height: var(--core);
          margin-left: calc(var(--core) / -2); margin-top: calc(var(--core) / -2);
          border-radius: 9999px; background: var(--color);
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
        {positions.map((p) => {
          const fresh = signalFreshness(p.recordedAt) === "fresh";
          return (
            <Marker
              key={p.trackerId}
              position={[p.lat, p.lng]}
              icon={trackerIcon(p.kind, fresh)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-zinc-900">{p.label}</p>
                  <p className="text-zinc-500">
                    {p.kind === "CHOFER" ? "Chofer" : "Reciclador"}
                  </p>
                  {p.enTurnoDesde && (
                    <p className="text-emerald-600 text-xs mt-1">
                      En turno hace {minutesSince(p.enTurnoDesde)} min
                    </p>
                  )}
                  <p
                    className={`text-xs mt-1 ${fresh ? "text-zinc-400" : "text-amber-600 font-medium"}`}
                  >
                    {fresh
                      ? `Última señal: hace ${minutesSince(p.recordedAt)} min`
                      : `Sin señal hace ${minutesSince(p.recordedAt)} min`}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
