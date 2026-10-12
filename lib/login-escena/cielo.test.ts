import { it, expect } from "vitest";
import { pintarCielo, PANE } from "./cielo";
import { WIDTH, HEIGHT } from "./escala";
const sentinel = 0xff112233;
function render(alba: number, reloj = 0) {
  const pixels = new Uint32Array(WIDTH * HEIGHT).fill(sentinel);
  pintarCielo(pixels, alba, reloj);
  return pixels;
}
it("pinta sólo el paño y preserva marco y parteluces", () => {
  const pixels = render(0.5);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const vidrio =
        x >= PANE.x0 &&
        x < PANE.x1 &&
        y >= PANE.y0 &&
        y < PANE.y1 &&
        x !== 41 &&
        x !== 42 &&
        y !== 35 &&
        y !== 36;
      expect(pixels[y * WIDTH + x] === sentinel).toBe(!vidrio);
    }
});
it("el cielo es determinista y cambia con el alba y la deriva de nubes", () => {
  expect(render(0.4, 1234)).toEqual(render(0.4, 1234));
  expect(render(0.12)).not.toEqual(render(1));
  expect(render(0.7)).not.toEqual(render(0.7, 20000));
});
it("el sol emerge brillante y los Andes siguen visibles en el horizonte", () => {
  const pixels = render(1);
  const sun = pixels[39 * WIDTH + 50],
    mountain = pixels[47 * WIDTH + 50];
  const luminosidad = (v: number) =>
    (v & 255) + ((v >>> 8) & 255) + ((v >>> 16) & 255);
  expect(luminosidad(sun)).toBeGreaterThan(luminosidad(mountain));
  expect(luminosidad(sun)).toBeGreaterThan(650);
});
it("cuantiza a dieciséis niveles opacos por canal", () => {
  const pixels = render(0.63, 5000);
  for (let y: number = PANE.y0; y < PANE.y1; y++)
    for (let x: number = PANE.x0; x < PANE.x1; x++) {
      if (x === 41 || x === 42 || y === 35 || y === 36) continue;
      const color = pixels[y * WIDTH + x];
      expect(color >>> 24).toBe(255);
      for (const shift of [0, 8, 16])
        expect(((color >>> shift) & 255) % 17).toBe(0);
    }
});
it("acota entradas inválidas y negativas sin fallar", () => {
  expect(render(-1)).toEqual(render(0));
  expect(render(2)).toEqual(render(1));
  expect(render(NaN, NaN)).toEqual(render(1, 0));
  expect(render(0.5, -100)).toEqual(render(0.5, 0));
});
