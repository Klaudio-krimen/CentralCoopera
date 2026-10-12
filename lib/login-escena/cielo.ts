import { WIDTH } from "./escala";
type RGB = readonly [number, number, number];
const hx = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => v / 16 - 0.47
);
const bay = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
/** Dieciséis niveles por canal; tramado aplicado sólo al vidrio, nunca al formulario. */
function pack(c: RGB, x: number, y: number) {
  const d = bay(x, y) * 14;
  const q = (v: number) =>
    Math.max(0, Math.min(255, Math.round((v + d) / 17) * 17));
  return (0xff000000 | (q(c[2]) << 16) | (q(c[1]) << 8) | q(c[0])) >>> 0;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const PRE = [
  "#121534",
  "#1c1f47",
  "#2b2656",
  "#433066",
  "#61386a",
  "#7c4468",
].map(hx);
const SOL = [
  "#39407c",
  "#62549a",
  "#a8679f",
  "#e9848a",
  "#ffac78",
  "#ffd596",
].map(hx);
const GLOW = hx("#ffd7a0"),
  SUN_EDGE = hx("#ffe9b8"),
  SUN_CENTER = hx("#fff6dc");
const STAR = hx("#e6e0ff"),
  MOUNTAIN_PRE = hx("#2a2148"),
  MOUNTAIN_DAY = hx("#6a4a7e"),
  RIDGE_GLOW = hx("#ff9fa8");
const CLOUD_TOP_PRE = hx("#5a4a86"),
  CLOUD_TOP_DAY = hx("#c88aa8");
const CLOUD_LOW_PRE = hx("#7a4c78"),
  CLOUD_LOW_DAY = hx("#ffb38a");
export const PANE = { x0: 22, x1: 62, y0: 24, y1: 48 } as const;
const SUN_X = 50;
const RIDGE = new Int8Array(64);
for (let x = 0; x < RIDGE.length; x++)
  RIDGE[x] = Math.round(
    44.6 -
      (2.3 * Math.sin(x * 0.29 + 0.6) +
        1.3 * Math.sin(x * 0.83 + 2) +
        0.7 * Math.sin(x * 2.1))
  );
RIDGE[SUN_X - 1] = Math.max(RIDGE[SUN_X - 1], 44);
const STARS: readonly (readonly [number, number, number])[] = [
  [25, 26, 0.2],
  [31, 30, 0.35],
  [37, 25, 0.1],
  [47, 27, 0.25],
  [59, 29, 0.4],
  [55, 25, 0.15],
];
const CLOUDS: readonly (readonly [number, number, number])[] = [
  [29, 13, 0],
  [33, 9, 21],
  [27, 7, 11],
];

/** Pinta el cielo como fuente emisiva después del sombreado. Preserva marco y parteluces. */
export function pintarCielo(
  pixels: Uint32Array,
  alba: number,
  reloj: number
): void {
  const p = Number.isFinite(alba) ? Math.max(0, Math.min(1, alba)) : 1;
  const t = Number.isFinite(reloj) ? Math.max(0, reloj) : 0;
  const pal = PRE.map((c, i) => mix(c, SOL[i], p));
  const sunY = 50 - 11 * smooth(0.08, 1, p),
    sunR = 4.6;
  const cloudX = (t / 1000) * 0.35;
  const far = mix(MOUNTAIN_PRE, MOUNTAIN_DAY, p * 0.65);
  const arrebol = mix(far, RIDGE_GLOW, smooth(0.25, 1, p) * 0.85);
  const cloudTop = mix(CLOUD_TOP_PRE, CLOUD_TOP_DAY, p);
  const cloudLow = mix(CLOUD_LOW_PRE, CLOUD_LOW_DAY, p);
  for (let y: number = PANE.y0; y < PANE.y1; y++) {
    if (y === 35 || y === 36) continue;
    const ty =
      ((y - PANE.y0) / (PANE.y1 - PANE.y0 - 1)) ** 0.62 * (pal.length - 1);
    const i = Math.min(pal.length - 2, Math.floor(ty));
    const base = mix(pal[i], pal[i + 1], ty - i);
    for (let x: number = PANE.x0; x < PANE.x1; x++) {
      if (x === 41 || x === 42) continue;
      const dx = x - SUN_X,
        dy = y - sunY,
        d = Math.hypot(dx, dy * 1.25);
      let c = mix(base, GLOW, Math.max(0, 1 - d / 16) ** 2 * 0.75 * p);
      for (const [cy, len, off] of CLOUDS) {
        const cx = PANE.x0 + ((off + cloudX) % 46) - 6;
        if (x >= cx && x < cx + len - Math.abs(y - cy) * 3) {
          if (y === cy) c = cloudTop;
          if (y === cy + 1) c = cloudLow;
        }
      }
      if (d < sunR) c = mix(SUN_EDGE, SUN_CENTER, 1 - d / sunR);
      for (const [sx, sy, fade] of STARS)
        if (x === sx && y === sy && p < 0.75 - fade + bay(x, y) * 0.3)
          c = mix(c, STAR, 1 - p);
      const ridge = RIDGE[x];
      if (y >= ridge) c = y === ridge ? arrebol : mix(far, base, 0.18);
      pixels[y * WIDTH + x] = pack(c, x, y);
    }
  }
}
