"use client";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import BrandLogo from "@/components/ui/BrandLogo";
import LoginForm from "@/components/login/LoginForm";
import type { ControlEscena } from "@/components/login-escena/EscenaBodega";
import type { EventoEscena, Fase } from "@/lib/login-escena/maquina";
import "./login.css";

const EscenaBodega = dynamic(
  () => import("@/components/login-escena/EscenaBodega"),
  { ssr: false }
);
class SceneBoundary extends Component<
  { children: ReactNode; onFallo(): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFallo();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function LoginPage() {
  const [desktop, setDesktop] = useState(false),
    [fallback, setFallback] = useState(false);
  const host = useRef<HTMLElement>(null),
    control = useRef<ControlEscena | null>(null);
  const pending = useRef<EventoEscena | null>(null);
  const pendingFocus = useRef<EventoEscena | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const enviar = useCallback((event: EventoEscena) => {
    pending.current = event;
    if (event === "FOCO_CORREO" || event === "FOCO_CLAVE" || event === "BLUR")
      pendingFocus.current = event;
    return control.current?.enviar(event);
  }, []);
  const onListo = useCallback((value: ControlEscena | null) => {
    control.current = value;
    if (host.current) host.current.dataset.sceneReady = String(!!value);
    if (value) {
      host.current?.style.setProperty("--font-night", value.fuente);
      if (pending.current) void value.enviar(pending.current);
      if (pendingFocus.current && pendingFocus.current !== pending.current)
        void value.enviar(pendingFocus.current);
    }
  }, []);
  const onEstado = useCallback((fase: Fase, opacity: number) => {
    if (host.current) {
      host.current.dataset.sceneState = fase;
      host.current.style.setProperty("--scene-form-opacity", String(opacity));
    }
  }, []);
  const onFallo = useCallback(() => {
    control.current = null;
    setFallback(true);
  }, []);
  useEffect(() => {
    if (!desktop || fallback) return;
    const skip = () => {
      void enviar("SALTAR");
    };
    document.addEventListener("keydown", skip);
    document.addEventListener("pointerdown", skip);
    return () => {
      document.removeEventListener("keydown", skip);
      document.removeEventListener("pointerdown", skip);
    };
  }, [desktop, fallback, enviar]);
  return (
    <main
      ref={host}
      className={`login-page${fallback ? " login-fallback" : ""}`}
      data-scene-enabled={desktop && !fallback}
    >
      <div className="login-stage">
        {desktop && !fallback && (
          <SceneBoundary onFallo={onFallo}>
            <EscenaBodega
              onListo={onListo}
              onEstado={onEstado}
              onFallo={onFallo}
            />
          </SceneBoundary>
        )}
        <div className="login-npc-name" aria-hidden="true">
          ELIZABETH CABRERA
        </div>
        <div className="login-edition" aria-hidden="true">
          COOPERA PRO · EL COMIENZO DE UNA NUEVA JORNADA
        </div>
      </div>
      <div className="login-classic min-h-[100dvh] flex">
        {/* ── Left panel ─────────────────────────────────────── */}
        <div className="login-classic-panel hidden lg:flex lg:w-[46%] bg-zinc-950 relative overflow-hidden flex-col justify-between p-14">
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `
              linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          {/* Emerald bloom */}
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <BrandLogo size={56} decorative priority />
            <div>
              <p className="text-white font-semibold text-base leading-none tracking-tight">
                Central Coopera
              </p>
              <p className="text-zinc-500 text-xs mt-1 leading-none">
                Intranet operativa
              </p>
            </div>
          </div>

          {/* Hero text */}
          <div className="relative z-10">
            <p className="text-zinc-500 text-xs uppercase tracking-[0.15em] font-medium mb-4">
              Cadena de custodia
            </p>
            <h1 className="text-[3.25rem] font-semibold tracking-tight text-white leading-[1.05] mb-5">
              Trazabilidad
              <br />
              <span className="text-emerald-400">Interna.</span>
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed max-w-[340px]">
              Registro completo, sistema de operación y GPS track de vehículos
              de la empresa.
            </p>

            {/* Módulos */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { name: "Operaciones", desc: "Choferes · GPS" },
                { name: "CRM", desc: "Clientes" },
                { name: "Inventario", desc: "Pallets · stock" },
              ].map((m) => (
                <div
                  key={m.name}
                  className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40 backdrop-blur-sm"
                >
                  <p className="text-emerald-400 font-semibold text-[15px] tracking-tight leading-none">
                    {m.name}
                  </p>
                  <p className="text-zinc-500 text-[11px] mt-1.5">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <p className="text-zinc-700 text-xs">
              © {new Date().getFullYear()} Coopera Pro
            </p>
          </div>
        </div>

        {/* ── Right panel — form ──────────────────────────────── */}
        <div className="login-form-panel flex-1 flex items-center justify-center px-6 lg:px-16 bg-zinc-50">
          <div className="login-form-wrapper w-full max-w-[400px]">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <BrandLogo size={48} decorative priority />
              <p className="text-zinc-900 font-semibold tracking-tight">
                Central Coopera
              </p>
            </div>

            <LoginForm onEscenaEvento={enviar} />
          </div>
        </div>
      </div>
    </main>
  );
}
