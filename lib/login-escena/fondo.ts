import { C } from "./paleta";
import { R, line, type Pincel } from "./pincel";
import { WIDTH as W } from "./escala";
import { texto } from "./fuente";
import { dibujarEmblema } from "./emblema";
/** Tubos fluorescentes del techo; el central queda fuera del halo del emblema. */
export const FIX = [26, 140, 236] as const;
// Geometría del prototipo aprobado; el ruido empieza en la misma semilla en cada dibujo.
export function dibujarFondo(g: Pincel) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function pallet(ctx: Pincel, x: number, yb: number, w: number) {
    R(ctx, x, yb - 5, w, 2, C.wood);
    R(ctx, x, yb - 5, w, 1, C.woodLight);
    for (let i = 6; i < w - 1; i += 7) R(ctx, x + i, yb - 5, 1, 2, C.woodDark);
    R(ctx, x, yb - 3, w, 2, C.gap);
    for (const bx of [0, (w >> 1) - 1, w - 3])
      R(ctx, x + bx, yb - 3, 3, 2, C.woodDark);
    R(ctx, x, yb - 1, w, 1, C.wood);
  }
  function bale(ctx: Pincel, x: number, y: number, w: number, h: number) {
    R(ctx, x, y, w, h, C.bale);
    for (let j = 1; j < h; j += 2) {
      let px = x;
      while (px < x + w) {
        const len = 2 + ((rnd() * 5) | 0);
        if (rnd() < 0.5)
          R(ctx, px, y + j, Math.min(len, x + w - px), 1, C.baleDark);
        px += len;
      }
    }
    R(ctx, x, y, w, 1, C.tape);
    R(ctx, x + 4, y, 1, h, C.strap);
    R(ctx, x + w - 5, y, 1, h, C.strap);
  }
  function box(ctx: Pincel, x: number, y: number, w: number, h: number) {
    R(ctx, x, y, w, h, C.box);
    R(ctx, x, y, w, 1, C.tape);
    R(ctx, x + (w >> 1), y, 1, h, C.tape);
    R(ctx, x + w - 1, y, 1, h, C.baleDark);
  }

  R(g, 0, 0, W, 142, C.wallA);
  for (let x = 0; x < W; x += 4) R(g, x, 12, 2, 130, C.wallB);
  // techo y cerchas
  R(g, 0, 0, W, 12, C.beamDark);
  R(g, 0, 10, W, 2, C.beam);
  R(g, 0, 1, W, 1, C.beam);
  for (let i = 0; i < W; i += 16) {
    line(g, i, 10, i + 8, 2, C.beam);
    line(g, i + 8, 2, i + 16, 10, C.beam);
  }
  for (const fx of FIX) {
    R(g, fx, 13, 24, 1, C.metalDark);
    R(g, fx + 1, 14, 22, 2, C.metal);
  }
  // ventana alta
  R(g, 20, 22, 44, 28, C.beamDark);
  R(g, 22, 24, 40, 24, C.sky);
  R(g, 22, 41, 40, 7, C.skyLow);
  for (const [sx, sy] of [
    [25, 26],
    [31, 30],
    [37, 25],
    [47, 27],
    [59, 34],
    [27, 38],
    [50, 39],
    [35, 44],
  ])
    R(g, sx, sy, 1, 1, C.star);
  R(g, 41, 24, 2, 24, C.beamDark);
  R(g, 22, 35, 40, 2, C.beamDark);
  R(g, 18, 50, 48, 2, C.beam);
  // rótulos pintados en el muro
  dibujarEmblema(g);
  texto(g, "BODEGA 2", 91, 62, C.safety);
  // rack a la izquierda
  for (const px of [6, 40, 74]) R(g, px, 52, 3, 90, C.rackPost);
  for (const by of [52, 82, 112]) R(g, 6, by, 71, 3, C.rackBeam);
  box(g, 10, 40, 14, 12);
  box(g, 26, 44, 11, 8);
  box(g, 46, 42, 16, 10);
  box(g, 10, 70, 12, 12);
  box(g, 23, 74, 13, 8);
  pallet(g, 44, 82, 28);
  bale(g, 46, 66, 24, 11);
  pallet(g, 9, 112, 29);
  box(g, 11, 98, 12, 9);
  box(g, 24, 100, 12, 7);
  bale(g, 44, 95, 27, 17);
  for (let k = 0; k < 5; k++) pallet(g, 9, 142 - k * 5, 29);
  for (let k = 0; k < 3; k++) pallet(g, 44, 142 - k * 5, 28);
  // suelo
  R(g, 0, 142, W, 38, C.floor);
  R(g, 0, 142, W, 1, C.floorLine);
  R(g, 0, 143, W, 1, C.floorHi);
  R(g, 0, 156, W, 1, C.floorLine);
  R(g, 0, 172, W, 1, C.floorLine);
  for (let x = 20; x < W; x += 52) {
    R(g, x, 143, 1, 13, C.floorLine);
    R(g, x - 10, 157, 1, 15, C.floorLine);
  }
  for (let x = 0; x < W; x += 12) R(g, x, 164, 8, 2, C.safety);
  // ruma de pallets y pallet bajo
  for (let k = 0; k < 11; k++) pallet(g, 84, 142 - k * 5, 28);
  pallet(g, 118, 142, 26);
  pallet(g, 118, 137, 26);
  // fardos de cartón
  bale(g, 176, 128, 22, 14);
  bale(g, 177, 114, 20, 14);
  // caja de la palanca y ducto
  R(g, 205, 12, 1, 112, C.metalDark);
  R(g, 202, 124, 7, 10, C.leverBox);
  R(g, 203, 125, 5, 8, C.leverBoxIn);
  // cartel del taller
  R(g, 214, 22, 96, 114, C.boardFrame);
  R(g, 214, 22, 96, 1, C.boardLight);
  R(g, 214, 22, 1, 114, C.boardLight);
  R(g, 217, 25, 90, 108, C.board);
  for (const [bx, by] of [
    [215, 23],
    [308, 23],
    [215, 134],
    [308, 134],
  ])
    R(g, bx, by, 1, 1, C.bolt);
  R(g, 230, 136, 2, 6, C.boardFrame);
  R(g, 292, 136, 2, 6, C.boardFrame);
}
