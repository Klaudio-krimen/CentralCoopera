"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "@phosphor-icons/react";
import { usePositionPing } from "@/lib/usePositionPing";

const CONSENT_KEY = "chofer-location-consent";

/**
 * Antes de activar el envío de posición, muestra un aviso de transparencia
 * una sola vez por dispositivo (persistido en localStorage). Mientras no se
 * acepte, usePositionPing queda deshabilitado y el navegador nunca pide el
 * permiso de geolocalización.
 */
export default function PositionPinger() {
  const [ready, setReady] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(localStorage.getItem(CONSENT_KEY) === "1");
    setReady(true);
  }, []);

  usePositionPing(ready && consented);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "1");
    setConsented(true);
  };

  if (!ready || consented || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="w-full max-w-[430px] bg-white rounded-2xl border border-zinc-100 shadow-card-hover p-4 animate-fade-up">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <MapPin size={16} weight="fill" className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Compartir ubicación
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              Central Coopera usa tu ubicación mientras tienes la app abierta,
              para que el equipo de Operaciones te vea en el mapa. No se
              comparte cuando la cierras.
            </p>
          </div>
        </div>
        <button
          onClick={accept}
          className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 active:translate-y-[1px] text-white text-sm font-medium rounded-xl py-2.5 transition-all"
        >
          Entendido, activar ubicación
        </button>
      </div>
    </div>,
    document.body
  );
}
