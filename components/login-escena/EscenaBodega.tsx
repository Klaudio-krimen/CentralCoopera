"use client";
import { useEffect, useRef } from "react";
import localFont from "next/font/local";
import { WIDTH, HEIGHT } from "../../lib/login-escena/escala";
import {
  crearEstado,
  paso,
  transicion,
  INTRO,
  SUCCESS_MS,
  type EventoEscena,
  type Fase,
} from "../../lib/login-escena/maquina";
import { crearPincel } from "../../lib/login-escena/pincel";
import {
  crearMonitor,
  registrarFrame,
} from "../../lib/login-escena/rendimiento";
import { dibujarFondo } from "../../lib/login-escena/fondo";
import { dibujarOperaria } from "../../lib/login-escena/operaria";
import { dibujarLampara, dibujarPalanca } from "../../lib/login-escena/lampara";
import {
  mapaLuna,
  crearTablaSombreado,
  aplicarLuz,
  dibujarEmisivos,
} from "../../lib/login-escena/luz";

// Fuente autoalojada (Fontsource, OFL — ver fonts/PressStart2P-OFL.txt): el build no depende de
// Google Fonts y cumple font-src 'self' de la CSP.
const pixel = localFont({
  src: "./fonts/press-start-2p-latin-400-normal.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});
const STORAGE_KEY = "login-escena-vista";
export interface ControlEscena {
  enviar(evento: EventoEscena): void | Promise<void>;
  fuente: string;
}
interface Props {
  onListo(control: ControlEscena | null): void;
  onEstado(fase: Fase, opacity: number): void;
  onFallo(): void;
}
export default function EscenaBodega({ onListo, onEstado, onFallo }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!ctx || !element) {
      onFallo();
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let primera = false;
    try {
      primera = localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      /* Sin almacenamiento, intro corta. */
    }
    let state = crearEstado(primera, media.matches),
      stopped = false,
      frameId = 0,
      previous = 0;
    let monitor = crearMonitor(),
      frozen = false;
    const background = new Uint32Array(WIDTH * HEIGHT),
      pixels = new Uint32Array(WIDTH * HEIGHT);
    const brush = crearPincel(pixels),
      moon = mapaLuna(),
      shades = crearTablaSombreado();
    dibujarFondo(crearPincel(background));
    const image = new ImageData(
      new Uint8ClampedArray(pixels.buffer),
      WIDTH,
      HEIGHT
    );
    let idleTimer: ReturnType<typeof setTimeout>,
      successTimer: ReturnType<typeof setTimeout> | undefined;
    let completeSuccess: (() => void) | undefined;
    function markViewed() {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* Preferencia decorativa opcional. */
      }
    }
    function draw() {
      if (stopped) return;
      pixels.set(background);
      dibujarPalanca(brush, state.lever);
      dibujarLampara(brush, state.lamp);
      const hand = dibujarOperaria(brush, state.ch);
      aplicarLuz(pixels, state, moon, hand, shades);
      dibujarEmisivos(brush, state, hand);
      ctx!.putImageData(image, 0, 0);
      element!.dataset.state = state.fase;
      element!.dataset.motion = state.reducido
        ? frozen
          ? "performance-static"
          : "reduced"
        : "animated";
      onEstado(state.fase, state.formOp);
      if (!INTRO.has(state.fase)) markViewed();
    }
    function fail() {
      stopped = true;
      cancelAnimationFrame(frameId);
      clearTimeout(idleTimer);
      onListo(null);
      onFallo();
    }
    function resetIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (stopped || state.fase === "EXITO") return;
        try {
          state = paso(state, 30000);
          draw();
        } catch {
          fail();
        }
      }, 30000);
    }
    function animate(now: number) {
      if (stopped || state.reducido) return;
      const raw = previous ? now - previous : 0,
        dt = Math.min(50, raw);
      previous = now;
      try {
        const start = performance.now();
        state = paso(state, dt);
        draw();
        monitor = registrarFrame(
          monitor,
          now,
          Math.max(raw, performance.now() - start)
        );
        if (monitor.estatico) {
          frozen = true;
          const foco = state.foco;
          state = crearEstado(false, true);
          if (foco)
            state = transicion(
              state,
              foco === "correo" ? "FOCO_CORREO" : "FOCO_CLAVE"
            );
          draw();
          return;
        }
        frameId = requestAnimationFrame(animate);
      } catch {
        fail();
      }
    }
    const control: ControlEscena = {
      fuente: pixel.style.fontFamily,
      enviar(evento) {
        if (stopped || state.fase === "EXITO") return;
        try {
          state = transicion(state, evento);
          resetIdle();
          draw();
        } catch {
          fail();
          return;
        }
        if (evento === "EXITO" && !state.reducido)
          return new Promise<void>((resolve) => {
            completeSuccess = resolve;
            successTimer = setTimeout(() => {
              completeSuccess = undefined;
              resolve();
            }, SUCCESS_MS);
          });
      },
    };
    function reducedChanged() {
      if (stopped) return;
      cancelAnimationFrame(frameId);
      previous = 0;
      const foco = state.foco,
        terminal = state.fase === "EXITO";
      state = crearEstado(false, media.matches || frozen);
      if (foco)
        state = transicion(
          state,
          foco === "correo" ? "FOCO_CORREO" : "FOCO_CLAVE"
        );
      if (terminal) state = transicion(state, "EXITO");
      try {
        draw();
        if (!state.reducido) frameId = requestAnimationFrame(animate);
      } catch {
        fail();
      }
    }
    function visibilityChanged() {
      previous = 0;
      monitor = crearMonitor();
    }
    media.addEventListener("change", reducedChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    try {
      draw();
      onListo(control);
      resetIdle();
      if (!state.reducido) frameId = requestAnimationFrame(animate);
    } catch {
      fail();
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      clearTimeout(idleTimer);
      clearTimeout(successTimer);
      completeSuccess?.();
      onListo(null);
      media.removeEventListener("change", reducedChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [onListo, onEstado, onFallo]);
  return (
    <canvas
      ref={canvas}
      width={WIDTH}
      height={HEIGHT}
      className="login-scene-canvas"
      aria-hidden="true"
    />
  );
}
