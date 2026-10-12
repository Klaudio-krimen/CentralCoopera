import { it, expect } from "vitest";
import { crearEstado, transicion } from "./maquina";
import {
  mapaLuna,
  nivelLuz,
  crearTablaSombreado,
  aplicarLuz,
  posicionLuz,
} from "./luz";
import { dibujarFondo } from "./fondo";
import { crearPincel } from "./pincel";
import { DISCO, FORMULARIO, WIDTH, HEIGHT } from "./escala";
const hand = { x: 262, y: 133 };
it("oscuridad fuera de ventana y haz de alba", () => {
  const moon = mapaLuna(),
    s = crearEstado();
  for (const [x, y] of [
    [260, 80],
    [315, 150],
    [120, 20],
  ]) {
    expect(moon[y * WIDTH + x]).toBe(0);
    expect(nivelLuz(x, y, s, 0, hand)).toBe(0);
  }
});
it("la lámpara cuelga encima del disco y lo revela al extender el halo", () => {
  const s = transicion(crearEstado(), "SALTAR");
  expect(posicionLuz(s)).toEqual({ x: 184, y: 39 });
  expect(nivelLuz(DISCO.cx, DISCO.cy, s, 0, hand)).toBe(7);
  const narrow = { ...s, light: { ...s.light, R: 40 } };
  expect(nivelLuz(DISCO.cx, DISCO.cy, narrow, 0, hand)).toBe(0);
});
it("éxito lleva a luz plena lo que ya cruzó el barrido", () => {
  const s = transicion(crearEstado(false, true), "EXITO");
  expect(nivelLuz(260, 80, s, 0, hand)).toBe(8);
});
it("los ocho tonos y la luz plena se cachean por color", () => {
  const table = crearTablaSombreado(),
    color = 0xff4d342a;
  expect(table(color)).toBe(table(color));
  expect(table(color)).toEqual(crearTablaSombreado()(color));
  expect(table(color)).toHaveLength(9);
  expect(table(color)[8]).toBe(color);
  for (let i = 1; i < 9; i++)
    for (const shift of [0, 8, 16])
      expect((table(color)[i] >>> shift) & 255).toBeGreaterThanOrEqual(
        (table(color)[i - 1] >>> shift) & 255
      );
});
it.each([false, true])(
  "el cuerpo del disco queda azul exacto y uniforme; éxito=%s",
  (success) => {
    const pixels = new Uint32Array(WIDTH * HEIGHT);
    dibujarFondo(crearPincel(pixels));
    const s = transicion(
      crearEstado(false, true),
      success ? "EXITO" : "SALTAR"
    );
    aplicarLuz(pixels, s, mapaLuna(), hand, crearTablaSombreado());
    for (let y = FORMULARIO.y; y <= FORMULARIO.y + FORMULARIO.h; y++)
      for (let x = FORMULARIO.x; x <= FORMULARIO.x + FORMULARIO.w; x++)
        expect(pixels[y * WIDTH + x]).toBe(0xff4d342a);
  }
);
it("el disco comparte un solo tono durante el revelado sin tramado", () => {
  const pixels = new Uint32Array(WIDTH * HEIGHT);
  dibujarFondo(crearPincel(pixels));
  const s = transicion(crearEstado(), "SALTAR");
  s.light.R = 65;
  aplicarLuz(pixels, s, mapaLuna(), hand, crearTablaSombreado());
  const center = pixels[DISCO.cy * WIDTH + DISCO.cx];
  for (let y = 80; y < 100; y++)
    for (let x = 170; x < 190; x++) expect(pixels[y * WIDTH + x]).toBe(center);
});
