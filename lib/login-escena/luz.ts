import { WIDTH, HEIGHT } from "./escala";
import { C } from "./paleta";
import { R, type Pincel } from "./pincel";
import type { EstadoEscena } from "./maquina";
import { FIX } from "./fondo";
import { EMBLEMA, dibujarEmblema } from "./emblema";

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => v / 16
);
const LV = [
  [0.16, 0.18, 0.3],
  [0.42, 0.45, 0.6],
  [1, 0.91, 0.74],
  [1, 1, 1],
];
export function crearTablaSombreado() {
  const cache = new Map<number, Uint32Array>();
  return (color: number) => {
    const existing = cache.get(color);
    if (existing) return existing;
    const r = color & 255,
      g = (color >>> 8) & 255,
      b = (color >>> 16) & 255;
    const shades = new Uint32Array(4);
    for (let i = 0; i < 4; i++)
      shades[i] =
        (0xff000000 |
          (Math.floor(b * LV[i][2]) << 16) |
          (Math.floor(g * LV[i][1]) << 8) |
          Math.floor(r * LV[i][0])) >>>
        0;
    cache.set(color, shades);
    return shades;
  };
}
export function mapaLuna() {
  const map = new Float32Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      if (x >= 22 && x < 62 && y >= 24 && y < 48) map[y * WIDTH + x] = 0.55;
      else if (
        y >= 50 &&
        x >= 22 + (y - 48) * 0.55 &&
        x <= 62 + (y - 48) * 0.85
      )
        map[y * WIDTH + x] = y > 142 ? 0.26 : 0.3;
    }
  return map;
}
export function posicionLuz(s: EstadoEscena) {
  return {
    x: Math.round(184 + Math.sin(s.lamp.a) * 52),
    y: Math.round(12 + Math.cos(s.lamp.a) * 52) + 7,
  };
}
export function nivelLuz(
  x: number,
  y: number,
  s: EstadoEscena,
  moon: number,
  hand: { x: number; y: number },
  lamp = posicionLuz(s)
) {
  if (x < s.light.sweep) return 3;
  let v = moon;
  if (s.light.I > 0 && s.light.R > 0) {
    const dx = x - lamp.x,
      dy = y - lamp.y;
    const d2 = dx * dx + dy * dy * (dy < 0 ? 5 : 0.75);
    if (d2 < s.light.R * s.light.R)
      v = Math.max(v, (1 - Math.sqrt(d2) / s.light.R) * s.light.I * 1.7);
  }
  if (s.ch.torch && s.light.I < 0.9) {
    const tx = x - hand.x,
      ty = y - hand.y;
    if (tx * s.ch.face > -2)
      v = Math.max(v, (1 - Math.sqrt(tx * tx + ty * ty * 1.6) / 38) * 1.45);
  }
  return Math.max(
    0,
    Math.min(2, Math.floor(v * 2 + BAYER[(y & 3) * 4 + (x & 3)]))
  );
}
export function aplicarLuz(
  pixels: Uint32Array,
  s: EstadoEscena,
  moon: Float32Array,
  hand: { x: number; y: number },
  shades: ReturnType<typeof crearTablaSombreado>
) {
  const lamp = posicionLuz(s);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      pixels[i] = shades(pixels[i])[nivelLuz(x, y, s, moon[i], hand, lamp)];
    }
}
export function dibujarEmisivos(
  p: Pincel,
  s: EstadoEscena,
  hand: { x: number; y: number }
) {
  for (let yy = -3; yy <= 3; yy++)
    for (let xx = -3; xx <= 3; xx++)
      if (xx * xx + yy * yy <= 9.5) R(p, 54 + xx, 30 + yy, 1, 1, C.moon);
  const lamp = posicionLuz(s);
  if (s.light.I > 0.6) {
    R(p, lamp.x - 2, lamp.y - 1, 4, 2, C.bulb);
    R(p, lamp.x - 1, lamp.y + 1, 2, 1, C.glow);
  }
  if (s.ch.torch && s.light.I < 0.9) R(p, hand.x, hand.y, 1, 1, C.bulb);
  for (const x of FIX) if (s.light.sweep > x) R(p, x + 1, 14, 22, 2, C.tube);
  if (s.light.sweep > EMBLEMA.cx + EMBLEMA.r) dibujarEmblema(p, true);
  if (!s.reducido && s.light.I > 0)
    for (let i = 0; i < 34; i++) {
      const x = Math.round(
        120 + ((i * 37) % 170) + Math.sin(s.reloj / 1400 + i) * 2
      );
      const y = Math.round(
        150 - ((i * 19 + s.reloj * 0.004 * (0.6 + (i % 8) / 10)) % 116)
      );
      if (x < 214 && nivelLuz(x, y, s, 0, hand, lamp) >= 2)
        R(p, x, y, 1, 1, C.dust);
    }
}
