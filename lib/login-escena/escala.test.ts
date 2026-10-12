import { it, expect } from "vitest";
import { calcularEscala, DISCO, FORMULARIO } from "./escala";
it.each([
  [1280, 720, 4],
  [1440, 900, 4],
  [1920, 1080, 6],
  [1024, 600, 3],
  [1440, 400, 3],
])("escala entera y área útil centrada en %i×%i", (w, h, s) => {
  const r = calcularEscala(w, h);
  expect(r.escala).toBe(s);
  expect(r.formulario).toEqual({
    left: 154 * s,
    top: 62 * s,
    width: 60 * s,
    height: 64 * s,
  });
  expect(r.left).toBe(Math.max(0, (w - 320 * s) / 2));
  expect(r.top).toBe(Math.max(0, (h - 180 * s) / 2));
});
it("mantiene las cuatro esquinas del formulario dentro del radio seguro", () => {
  for (let s = 3; s <= 12; s++) {
    const { formulario: f } = calcularEscala(320 * s, 180 * s);
    const center = {
      x: (f.left + f.width / 2) / s,
      y: (f.top + f.height / 2) / s,
    };
    expect(center).toEqual({ x: DISCO.cx, y: DISCO.cy });
    for (const x of [FORMULARIO.x, FORMULARIO.x + FORMULARIO.w])
      for (const y of [FORMULARIO.y, FORMULARIO.y + FORMULARIO.h])
        expect(Math.hypot(x - DISCO.cx, y - DISCO.cy)).toBeLessThan(44);
  }
});
