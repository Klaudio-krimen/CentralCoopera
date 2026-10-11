import { C } from "./paleta";
import { R, type Pincel } from "./pincel";
import { texto } from "./fuente";

/** Emblema de Coopera Pro pintado en el muro (blueprint LOGIN-002 §8.1). */
export const EMBLEMA = { cx: 106, cy: 36, r: 21 } as const;

/** Ícono de reciclaje del logo oficial (public/brand/coopera-pro-logo.png) reducido a 18 columnas. */
export const ICONO_RECICLAJE: readonly string[] = [
  "........GG........",
  ".......GGGG.......",
  "......GG..GG.G....",
  ".....GG...GGGG....",
  "....GG....GGGGG...",
  "..........GGGG....",
  "..................",
  "..G...............",
  ".GGGG.........GG..",
  "GGGGG.........GG..",
  ".GGG...........GG.",
  ".GG............GG.",
  "GG..............GG",
  "GG.........G....GG",
  "GGGGGGG...GGGGGGGG",
  ".GGGGGG...GGGGGGG.",
  "...........GG.....",
];

/**
 * Pintado: círculo azul con borde, ícono verde y COOPERAPRO (crema + verde).
 * Neón: halo verde de 1 px e ícono verde brillante; se pinta como emisivo en EXITO.
 */
export function dibujarEmblema(p: Pincel, neon = false) {
  const { cx, cy, r } = EMBLEMA;
  if (neon) {
    const inner = (r + 0.5) * (r + 0.5),
      outer = (r + 1.6) * (r + 1.6);
    for (let y = -r - 2; y <= r + 2; y++)
      for (let x = -r - 2; x <= r + 2; x++) {
        const d = x * x + y * y;
        if (d > inner && d <= outer) R(p, cx + x, cy + y, 1, 1, C.brandGreen);
      }
  } else {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d <= r * r + r * 0.6)
          R(
            p,
            cx + x,
            cy + y,
            1,
            1,
            d >= (r - 1) * (r - 1) ? C.brandRim : C.brandBlue
          );
      }
  }
  const ix = cx - 9,
    iy = cy - 16,
    green = neon ? C.neon : C.brandGreen;
  ICONO_RECICLAJE.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (row[i] === "G") R(p, ix + i, iy + j, 1, 1, green);
  });
  if (!neon) {
    texto(p, "COOPERA", cx - 20, cy + 2, C.brandCream);
    texto(p, "PRO", cx + 8, cy + 2, C.brandGreen);
  }
}
