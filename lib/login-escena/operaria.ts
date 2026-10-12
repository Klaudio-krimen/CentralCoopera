import { C } from "./paleta";
import { R, line, type Pincel } from "./pincel";
import type { Operaria } from "./maquina";
const GROUND = 150;
/** Interpretación pixel art de Elizabeth: castaño claro con mechas doradas. */
export const ELIZABETH = {
  cabello: "#b98554",
  sombra: "#785337",
  visos: "#e5bf7b",
  brillo: "#f1d4a0",
} as const;
export function dibujarOperaria(ctx: Pincel, ch: Operaria) {
  const f = ch.face,
    X = Math.round(ch.x),
    Y = GROUND,
    b = ch.bob,
    l = ch.lean;
  const P = (dx: number, dy: number, w: number, h: number, c: string) =>
    R(ctx, f === 1 ? X + dx : X - dx - w + 1, Y + dy, w, h, c);
  const T = (dx: number, dy: number, w: number, h: number, c: string) =>
    P(dx + l, dy + b, w, h, c);
  const LN = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    c: string,
    t: number
  ) => line(ctx, X + ax * f, Y + ay, X + bx * f, Y + by, c, t);
  const arm = (
    sx: number,
    a: number,
    len: number,
    sleeve: string,
    sleeveLen: number
  ) => {
    const ox = sx + l,
      oy = -19 + b;
    const mx = ox + Math.sin(a) * sleeveLen,
      my = oy + Math.cos(a) * sleeveLen;
    const ex = ox + Math.sin(a) * len,
      ey = oy + Math.cos(a) * len;
    LN(ox, oy, mx, my, sleeve, 2);
    LN(mx, my, ex, ey, C.skin, 2);
    return [X + Math.round(ex) * f, Y + Math.round(ey)];
  };
  if (!ch.sit) R(ctx, X - 3, Y, 8, 1, C.floorLine);
  // Melena detrás del chaleco y los brazos. Vaivén de un píxel, ligado al paso.
  const pelo =
    ch.walk === null ? 0 : Math.round(Math.sin(ch.walk * 2 * Math.PI));
  T(-4, -26, 4, 10, ELIZABETH.sombra);
  T(-5 + pelo, -22, 4, 8, ELIZABETH.sombra);
  T(-4 + pelo, -23, 3, 9, ELIZABETH.cabello);
  T(-3, -25, 2, 7, ELIZABETH.cabello);
  T(-4 + pelo, -22, 1, 6, ELIZABETH.visos);
  T(-3 + pelo, -17, 1, 4, ELIZABETH.cabello);
  T(-4 + pelo, -16, 1, 2, ELIZABETH.brillo);
  // brazo trasero
  arm(0, ch.armB.a, ch.armB.l, C.greenDark, 3);
  // piernas
  if (ch.sit) {
    P(-1, -11, 7, 2, C.pants);
    P(4, -10, 2, 8, C.pants);
    P(4, -2, 4, 2, C.boots);
  } else {
    let fF = 0,
      fB = 0,
      lF = 0,
      lB = 0;
    if (ch.walk !== null) {
      const s = Math.sin(ch.walk * 2 * Math.PI);
      fF = Math.round(s * 3);
      fB = -fF;
      lF = s < -0.3 ? 1 : 0;
      lB = s > 0.3 ? 1 : 0;
    }
    LN(0, -11, fB, -3 - lB, C.pantsDark, 2);
    P(fB - 1, -2 - lB, 4, 2, C.boots);
    LN(1, -11, fF + 1, -3 - lF, C.pants, 2);
    P(fF, -2 - lF, 4, 2, C.boots);
  }
  // torso con chaleco
  T(-2, -20, 6, 9, C.green);
  T(-2, -20, 5, 7, C.vest);
  T(-2, -20, 1, 7, C.vestDark);
  T(-2, -16, 5, 1, C.reflect);
  T(-2, -12, 6, 1, C.belt);
  // cabeza
  T(0, -21, 2, 1, C.skinDark);
  T(-2, -26, 5, 5, C.skin);
  T(-2, -26, 2, 5, ELIZABETH.cabello);
  T(-2, -26, 1, 3, ELIZABETH.visos);
  T(-3, -25, 1, 4, ELIZABETH.sombra);
  const ey = ch.head === "up" ? -25 : ch.head === "down" ? -23 : -24;
  T(3, ey + 1, 1, 1, C.skin);
  if (!ch.blink) T(1, ey, 1, 1, C.eye);
  if (ch.head === "down") T(1, -22, 2, 1, C.skinDark);
  // casco con adhesivo verde
  T(-3, -28, 7, 2, C.helmet);
  T(-2, -29, 5, 1, C.helmet);
  T(4, -27, 1, 1, C.helmet);
  T(0, -29, 1, 1, C.helmetHi);
  T(-2, -28, 1, 1, C.green);
  // Identificación del chaleco; sin texto diminuto que compita con el formulario.
  T(1, -18, 1, 1, C.reflect);
  // brazo delantero (con linterna en la intro)
  const hand = arm(1, ch.armF.a, ch.armF.l, C.green, 3);
  if (ch.torch) {
    R(ctx, f === 1 ? hand[0] : hand[0] - 1, hand[1], 2, 2, C.metalDark);
  }
  return { x: hand[0] + f, y: hand[1] };
}
