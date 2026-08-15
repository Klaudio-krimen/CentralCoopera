"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Pause, Play, ShieldCheck } from "@phosphor-icons/react";
import { usePositionPing } from "@/lib/usePositionPing";
import { minutosEnTurno } from "@/lib/turnos";

const POLL_MS = 60_000;

interface EstadoTurno {
  enTurno: boolean;
  startedAt: string | null;
  consentimiento: string | null;
}

/**
 * Interruptor de turno del chofer y única puerta de entrada al rastreo GPS.
 *
 * Antes el rastreo arrancaba solo con abrir cualquier pantalla de /chofer, y el
 * consentimiento vivía en localStorage — por dispositivo, irrevocable y sin
 * registro. Ahora nada se envía hasta que el chofer toca "Iniciar turno", y el
 * aviso se muestra por persona hasta que ella lo acepta.
 *
 * No es sticky a propósito: /chofer/dashboard ya tiene un CTA en `fixed
 * bottom-6` y /chofer/nueva-orden una barra en `sticky bottom-0`. Una tercera
 * capa flotante chocaría con ambas.
 */
export default function TurnoControl() {
  const [estado, setEstado] = useState<EstadoTurno | null>(null);
  const [avisoAbierto, setAvisoAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const enTurno = estado?.enTurno ?? false;
  usePositionPing(enTurno);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/turnos");
      if (!res.ok) return;
      setEstado((await res.json()) as EstadoTurno);
    } catch {
      // Sin red: conserva el último estado conocido y reintenta al próximo tick.
    }
  }, []);

  useEffect(() => {
    cargar();
    // El poll es lo que hace visible el cierre automático por inactividad:
    // si el turno se cerró solo, el chofer lo ve dentro del minuto.
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Reloj propio para que "hace N min" avance sin depender del poll.
  useEffect(() => {
    if (!enTurno) return;
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [enTurno]);

  const iniciar = async () => {
    if (!estado?.consentimiento) {
      setAvisoAbierto(true);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/turnos", { method: "POST" });
      if (res.status === 409) {
        setAvisoAbierto(true);
        return;
      }
      if (!res.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se pudo iniciar el turno. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  const terminar = async () => {
    if (!confirm("¿Terminar el turno? Dejarás de aparecer en el mapa.")) return;
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/turnos", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se pudo terminar el turno. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  const aceptarAviso = async () => {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/ubicacion/consentimiento", {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setAvisoAbierto(false);
      // Aceptar el aviso es la primera mitad de "iniciar turno": el chofer tocó
      // el botón, no debería tener que tocarlo otra vez.
      const inicio = await fetch("/api/turnos", { method: "POST" });
      if (!inicio.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se pudo activar la ubicación. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  const revocar = async () => {
    if (
      !confirm(
        "¿Revocar el permiso de ubicación? No podrás iniciar turno hasta aceptarlo de nuevo."
      )
    )
      return;
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/ubicacion/consentimiento", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se pudo revocar el permiso. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  if (estado === null) {
    return (
      <div className="mx-4 mt-3 h-14 rounded-2xl bg-zinc-100 animate-pulse" />
    );
  }

  return (
    <>
      <div className="mx-4 mt-3">
        <div
          className={`rounded-2xl border p-3 transition-colors ${
            enTurno
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-zinc-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                enTurno ? "bg-emerald-500" : "bg-zinc-100"
              }`}
            >
              <MapPin
                size={16}
                weight="fill"
                className={enTurno ? "text-white" : "text-zinc-400"}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900">
                {enTurno ? "En turno" : "Fuera de turno"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {enTurno && estado.startedAt
                  ? `Compartiendo ubicación · ${minutosEnTurno(estado.startedAt, ahora)} min`
                  : "No se está compartiendo tu ubicación"}
              </p>
            </div>

            <button
              onClick={enTurno ? terminar : iniciar}
              disabled={ocupado}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white transition-all active:translate-y-[1px] disabled:opacity-50 ${
                enTurno
                  ? "bg-zinc-700 hover:bg-zinc-800"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {enTurno ? (
                <Pause size={14} weight="fill" />
              ) : (
                <Play size={14} weight="fill" />
              )}
              {enTurno ? "Terminar" : "Iniciar turno"}
            </button>
          </div>

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

          {!enTurno && estado.consentimiento && (
            <button
              onClick={revocar}
              disabled={ocupado}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 underline mt-2 disabled:opacity-50"
            >
              Revocar permiso de ubicación
            </button>
          )}
        </div>
      </div>

      {avisoAbierto &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4">
            <div className="w-full max-w-[430px] bg-white rounded-2xl border border-zinc-100 shadow-card-hover p-4 animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck
                    size={16}
                    weight="fill"
                    className="text-emerald-600"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    Ubicación durante el turno
                  </p>
                  <ul className="text-xs text-zinc-500 mt-1.5 space-y-1 leading-relaxed list-disc pl-4">
                    <li>
                      Mientras tengas el turno iniciado, Operaciones ve tu
                      ubicación en el mapa.
                    </li>
                    <li>
                      Al terminar el turno o cerrar sesión dejas de aparecer en
                      el mapa de inmediato.
                    </li>
                    <li>
                      Si el teléfono se queda sin señal o sin batería, el turno
                      se cierra solo a los 15 minutos.
                    </li>
                    <li>
                      Fuera del turno no se registra ni se guarda tu ubicación.
                    </li>
                    <li>
                      Puedes revocar este permiso cuando quieras desde esta
                      misma pantalla.
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={aceptarAviso}
                disabled={ocupado}
                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 active:translate-y-[1px] text-white text-sm font-medium rounded-xl py-2.5 transition-all disabled:opacity-50"
              >
                Acepto e inicio el turno
              </button>
              <button
                onClick={() => setAvisoAbierto(false)}
                disabled={ocupado}
                className="mt-1.5 w-full text-zinc-500 hover:text-zinc-700 text-sm rounded-xl py-2 transition-colors disabled:opacity-50"
              >
                Ahora no
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
