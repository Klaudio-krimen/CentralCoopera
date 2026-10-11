import { it, expect } from "vitest";
import { calcularEscala } from "./escala";
it.each([
  [1280, 720, 4],
  [1440, 900, 4],
  [1920, 1080, 6],
  [1024, 600, 3],
  [1440, 400, 3],
])("escala entera en %i×%i", (w, h, s) => {
  const r = calcularEscala(w, h);
  expect(r.escala).toBe(s);
  expect(r.formulario).toEqual({
    left: 221 * s,
    top: 28 * s,
    width: 82 * s,
    height: 102 * s,
  });
  expect(r.left).toBe(Math.max(0, (w - 320 * s) / 2));
  expect(r.top).toBe(Math.max(0, (h - 180 * s) / 2));
});
