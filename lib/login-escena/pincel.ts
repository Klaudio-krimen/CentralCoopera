import { WIDTH, HEIGHT } from "./escala";
export interface Pincel {
  rect(x: number, y: number, w: number, h: number, color: string): void;
}
export function R(
  p: Pincel,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  const left = Math.max(0, Math.trunc(x)),
    top = Math.max(0, Math.trunc(y));
  const right = Math.min(WIDTH, Math.trunc(x) + w),
    bottom = Math.min(HEIGHT, Math.trunc(y) + h);
  if (right > left && bottom > top)
    p.rect(left, top, right - left, bottom - top, color);
}
export function line(
  p: Pincel,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  t = 1
) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0),
    dy = -Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    R(p, x0, y0, t, t, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) {
      e += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      e += dx;
      y0 += sy;
    }
  }
}
export function crearPincel(buffer: Uint32Array): Pincel {
  const cache = new Map<string, number>();
  return {
    rect(x, y, w, h, color) {
      let packed = cache.get(color);
      if (packed === undefined) {
        const n = parseInt(color.slice(1), 16);
        packed =
          (0xff000000 |
            ((n & 255) << 16) |
            (n & 0xff00) |
            ((n >>> 16) & 255)) >>>
          0;
        cache.set(color, packed);
      }
      for (let row = y; row < y + h; row++)
        buffer.fill(packed, row * WIDTH + x, row * WIDTH + x + w);
    },
  };
}
