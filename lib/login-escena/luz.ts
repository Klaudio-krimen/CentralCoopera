import { WIDTH, HEIGHT, DISCO } from "./escala";
import { C } from "./paleta";
import { R, type Pincel } from "./pincel";
import type { EstadoEscena } from "./maquina";
import { FIX } from "./fondo";
import { EMBLEMA, dibujarEmblema } from "./emblema";

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => v / 16
);
/** Ocho tonos de la variante aprobada y un noveno para el barrido de luz plena. */
const LV = [
  [0.25, 0.24, 0.34],
  [0.36, 0.33, 0.42],
  [0.48, 0.43, 0.49],
  [0.6, 0.53, 0.55],
  [0.72, 0.63, 0.61],
  [0.84, 0.74, 0.67],
  [0.94, 0.84, 0.72],
  [1, 0.92, 0.78],
  [1, 1, 1],
] as const;
const DISK_MASK = new Uint8Array(WIDTH * HEIGHT);
for (let y = DISCO.cy - DISCO.r; y <= DISCO.cy + DISCO.r; y++)
  for (let x = DISCO.cx - DISCO.r; x <= DISCO.cx + DISCO.r; x++)
    if ((x - DISCO.cx) ** 2 + (y - DISCO.cy) ** 2 <= DISCO.r ** 2)
      DISK_MASK[y * WIDTH + x] = 1;

export function crearTablaSombreado() {
  const cache = new Map<number, Uint32Array>();
  return (color: number) => {
    const existing = cache.get(color);
    if (existing) return existing;
    const r = color & 255,
      g = (color >>> 8) & 255,
      b = (color >>> 16) & 255;
    const shades = new Uint32Array(LV.length);
    for (let i = 0; i < LV.length; i++)
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
/** Nombre conservado por compatibilidad; el mapa ahora representa la ventana al alba. */
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
export const mapaVentana = mapaLuna;
export function posicionLuz(s: EstadoEscena) {
  return {
    x: Math.round(184 + Math.sin(s.lamp.a) * 20),
    y: Math.round(12 + Math.cos(s.lamp.a) * 20) + 7,
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
  if (x < s.light.sweep) return 8;
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
    Math.min(
      7,
      Math.floor(v * 7 + 0.5 + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.65)
    )
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
  const center = nivelLuz(DISCO.cx, DISCO.cy, s, 0, hand, lamp);
  // El azul aprobado permanece exacto al encenderse; todo el disco comparte nivel,
  // sin Bayer ni puntos de polvo sobre el área de texto.
  const diskLevel = center >= 7 ? 8 : center;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const level = DISK_MASK[i]
        ? diskLevel
        : nivelLuz(x, y, s, moon[i], hand, lamp);
      pixels[i] = shades(pixels[i])[level];
    }
}
const GLINT = Array.from({ length: 24 }, (_, i) => {
  const p = i / 23;
  const channels = [
    91 + (182 - 91) * p,
    189 + (255 - 189) * p,
    47 + (138 - 47) * p,
  ];
  return (
    "#" +
    channels.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
});
export function dibujarEmisivos(
  p: Pincel,
  s: EstadoEscena,
  hand: { x: number; y: number }
) {
  const lamp = posicionLuz(s);
  if (s.light.I > 0.6) {
    R(p, lamp.x - 2, lamp.y - 1, 4, 2, C.bulb);
    R(p, lamp.x - 1, lamp.y + 1, 2, 1, C.glow);
  }
  if (s.ch.torch && s.light.I < 0.9) R(p, hand.x, hand.y, 1, 1, C.bulb);
  for (const x of FIX) if (s.light.sweep > x) R(p, x + 1, 14, 22, 2, C.tube);
  if (s.light.sweep > EMBLEMA.cx + EMBLEMA.r) dibujarEmblema(p, true);
  if (nivelLuz(DISCO.cx, DISCO.cy, s, 0, hand, lamp) >= 7) {
    const sweep =
      (((s.reducido ? 1300 : s.reloj) / 2600) % 1) * Math.PI * 2 - Math.PI / 2;
    for (let a = -0.5; a <= 0.5; a += 0.02) {
      const theta = sweep + a;
      const color = GLINT[Math.round((1 - Math.abs(a) / 0.5) ** 2 * 23)];
      R(
        p,
        Math.round(DISCO.cx + Math.cos(theta) * (DISCO.r - 5.5)),
        Math.round(DISCO.cy + Math.sin(theta) * (DISCO.r - 5.5)),
        1,
        1,
        color
      );
    }
  }
  if (!s.reducido && s.light.I > 0)
    for (let i = 0; i < 34; i++) {
      const x = Math.round(
        120 + ((i * 37) % 170) + Math.sin(s.reloj / 1400 + i) * 2
      );
      const y = Math.round(
        150 - ((i * 19 + s.reloj * 0.004 * (0.6 + (i % 8) / 10)) % 116)
      );
      if (
        x < 214 &&
        !DISK_MASK[y * WIDTH + x] &&
        nivelLuz(x, y, s, 0, hand, lamp) >= 6
      )
        R(p, x, y, 1, 1, C.dust);
    }
}
