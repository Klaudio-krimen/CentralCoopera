"use client";
import { useEffect, useRef } from "react";
import localFont from "next/font/local";
import { WIDTH, HEIGHT, calcularEscala } from "../../lib/login-escena/escala";
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
import { pintarCielo } from "../../lib/login-escena/cielo";
import { crearCapaLuz } from "./capaLuz";

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
    const low = document.createElement("canvas");
    low.width = WIDTH;
    low.height = HEIGHT;
    const lowCtx = low.getContext("2d");
    if (!lowCtx) {
      onFallo();
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let primera = false;
    try {
      primera = localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      /* Intro corta. */
    }
    let state = crearEstado(primera, media.matches);
    let stopped = false,
      frameId = 0,
      previous = 0,
      frozen = false;
    let monitor = crearMonitor(),
      scale = 0;
    let layer: ReturnType<typeof crearCapaLuz> | null = null;
    try {
      layer = crearCapaLuz();
    } catch {
      /* La escena pixel es autónoma. */
    }
    const background = new Uint32Array(WIDTH * HEIGHT);
    const pixels = new Uint32Array(WIDTH * HEIGHT);
    const brush = crearPincel(pixels),
      moon = mapaLuna(),
      shades = crearTablaSombreado();
    dibujarFondo(crearPincel(background));
    const image = new ImageData(
      new Uint8ClampedArray(pixels.buffer),
      WIDTH,
      HEIGHT
    );
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let successTimer: ReturnType<typeof setTimeout> | undefined;
    let completeSuccess: (() => void) | undefined;
    function finishSuccess() {
      clearTimeout(successTimer);
      successTimer = undefined;
      const resolve = completeSuccess;
      completeSuccess = undefined;
      resolve?.();
    }
    function markViewed() {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* Decoración opcional. */
      }
    }
    function sizePresentation() {
      const next = Math.min(
        12,
        calcularEscala(window.innerWidth, window.innerHeight).escala
      );
      if (next !== scale) {
        scale = next;
        element!.width = WIDTH * scale;
        element!.height = HEIGHT * scale;
      }
    }
    function drawPixel() {
      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.filter = "none";
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
      ctx!.imageSmoothingEnabled = false;
      ctx!.drawImage(low, 0, 0, WIDTH * scale, HEIGHT * scale);
      ctx!.restore();
    }
    function draw() {
      if (stopped) return;
      sizePresentation();
      pixels.set(background);
      dibujarPalanca(brush, state.lever);
      dibujarLampara(brush, state.lamp);
      const hand = dibujarOperaria(brush, state.ch);
      aplicarLuz(pixels, state, moon, hand, shades);
      pintarCielo(pixels, state.alba, state.reducido ? 0 : state.reloj);
      dibujarEmisivos(brush, state, hand);
      lowCtx!.putImageData(image, 0, 0);
      const hdStart = performance.now();
      if (layer) {
        try {
          layer.presentar(ctx!, low, state, scale);
        } catch {
          try {
            layer.destruir();
          } catch {
            /* Se libera sin afectar el acceso. */
          }
          layer = null;
          drawPixel();
        }
      } else drawPixel();
      element!.dataset.state = state.fase;
      element!.dataset.alba = state.alba.toFixed(2);
      element!.dataset.effects = layer ? "hd" : "pixel";
      element!.dataset.hdMs = String(performance.now() - hdStart);
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
      finishSuccess();
      onListo(null);
      onFallo();
    }
    function resetIdle() {
      clearTimeout(idleTimer);
      // El bucle lleva el reloj animado; sólo el modo estático necesita temporizador.
      if (!state.reducido) return;
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
    function staticState() {
      const focus = state.foco,
        terminal = state.fase === "EXITO";
      state = crearEstado(false, true);
      if (focus)
        state = transicion(
          state,
          focus === "correo" ? "FOCO_CORREO" : "FOCO_CLAVE"
        );
      if (terminal) {
        state = transicion(state, "EXITO");
        finishSuccess();
      }
    }
    function animate(now: number) {
      if (stopped || state.reducido) return;
      const raw = previous ? now - previous : 0;
      previous = now;
      try {
        const start = performance.now();
        state = paso(state, Math.min(50, raw));
        draw();
        monitor = registrarFrame(
          monitor,
          now,
          Math.max(raw, performance.now() - start)
        );
        if (monitor.estatico) {
          frozen = true;
          staticState();
          draw();
          resetIdle();
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
            successTimer = setTimeout(finishSuccess, SUCCESS_MS);
          });
      },
    };
    function reducedChanged() {
      if (stopped) return;
      cancelAnimationFrame(frameId);
      previous = 0;
      monitor = crearMonitor();
      if (media.matches || frozen) staticState();
      else
        state = {
          ...state,
          reducido: false,
          reloj: Math.max(14000, state.reloj),
        };
      try {
        draw();
        resetIdle();
        if (!state.reducido) frameId = requestAnimationFrame(animate);
      } catch {
        fail();
      }
    }
    function resized() {
      if (stopped) return;
      try {
        draw();
      } catch {
        fail();
      }
    }
    function visibilityChanged() {
      previous = 0;
      monitor = crearMonitor();
    }
    media.addEventListener("change", reducedChanged);
    window.addEventListener("resize", resized);
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
      finishSuccess();
      try {
        layer?.destruir();
      } catch {
        /* Liberación de la capa opcional. */
      }
      low.width = low.height = 0;
      onListo(null);
      media.removeEventListener("change", reducedChanged);
      window.removeEventListener("resize", resized);
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
