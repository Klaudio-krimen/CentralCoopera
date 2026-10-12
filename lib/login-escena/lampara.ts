import { C } from "./paleta";
import { R, line, type Pincel } from "./pincel";
import type { Lampara } from "./maquina";
const LAMP_ANCHOR = 184;
export function dibujarLampara(ctx: Pincel, lamp: Lampara) {
  const L = 20,
    lx = LAMP_ANCHOR + Math.sin(lamp.a) * L,
    ly = 12 + Math.cos(lamp.a) * L;
  line(ctx, LAMP_ANCHOR, 12, lx, ly, C.cord, 1);
  const X = Math.round(lx),
    Y = Math.round(ly);
  R(ctx, X - 1, Y, 3, 1, C.metalDark);
  R(ctx, X - 3, Y + 1, 7, 1, C.metalDark);
  R(ctx, X - 4, Y + 2, 9, 1, C.metal);
  R(ctx, X - 3, Y + 2, 2, 1, C.metalHi);
  R(ctx, X - 5, Y + 3, 11, 1, C.metal);
  R(ctx, X - 6, Y + 4, 13, 1, C.metal);
  R(ctx, X - 7, Y + 5, 15, 1, C.metalDark);
  R(ctx, X - 2, Y + 6, 4, 2, C.bulbOff);
}
export function dibujarPalanca(ctx: Pincel, avance: number) {
  const ey = 120 + 14 * avance;
  line(ctx, 249, 128, 251, ey, C.metalHi, 1);
  R(ctx, 250, ey - 1, 3, 2, C.lever);
}
