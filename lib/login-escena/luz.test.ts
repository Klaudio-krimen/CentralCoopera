import { it, expect } from "vitest";
import { crearEstado, transicion } from "./maquina";
import { mapaLuna, nivelLuz, crearTablaSombreado } from "./luz";
const hand = { x: 185, y: 133 };
it("oscuridad fuera de ventana y haz lunar", () => {
  const moon = mapaLuna(),
    s = crearEstado();
  for (const [x, y] of [
    [260, 80],
    [315, 150],
    [120, 20],
  ]) {
    expect(moon[y * 320 + x]).toBe(0);
    expect(nivelLuz(x, y, s, 0, hand)).toBe(0);
  }
});
it("ilumina la mayoría del área central del cartel con la lámpara", () => {
  const s = transicion(crearEstado(), "SALTAR");
  let lit = 0;
  for (let y = 76; y < 84; y++)
    for (let x = 256; x < 264; x++) if (nivelLuz(x, y, s, 0, hand) === 2) lit++;
  expect(lit).toBeGreaterThanOrEqual(32);
});
it("éxito lleva a luz plena lo que ya cruzó el barrido", () => {
  const s = transicion(crearEstado(false, true), "EXITO");
  expect(nivelLuz(260, 80, s, 0, hand)).toBe(3);
});
it("la tabla se cachea por color y es determinista", () => {
  const table = crearTablaSombreado(),
    color = 0xff4d342a;
  expect(table(color)).toBe(table(color));
  expect(table(color)).toEqual(crearTablaSombreado()(color));
  expect(table(color)[3]).toBe(color);
});
