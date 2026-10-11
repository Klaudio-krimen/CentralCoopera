import { it, expect } from "vitest";
import { crearMonitor, registrarFrame } from "./rendimiento";
it("no degrada antes de observar dos segundos", () => {
  let m = crearMonitor();
  for (let t = 0; t < 2000; t += 65) m = registrarFrame(m, t, 65);
  expect(m.estatico).toBe(false);
});
it("congela tras dos segundos de frames lentos", () => {
  let m = crearMonitor();
  for (let t = 0; t <= 2080; t += 65) m = registrarFrame(m, t, 65);
  expect(m.estatico).toBe(true);
});
it("un pico aislado no congela; una ventana lenta posterior sí", () => {
  let m = crearMonitor();
  for (let t = 0; t <= 3000; t += 16)
    m = registrarFrame(m, t, t === 1600 ? 120 : 16);
  expect(m.estatico).toBe(false);
  for (let t = 3065; t <= 5145; t += 65) m = registrarFrame(m, t, 65);
  expect(m.estatico).toBe(true);
});
it("el monitor no cambia su argumento", () => {
  const m = crearMonitor();
  registrarFrame(m, 0, 65);
  expect(m.muestras).toEqual([]);
});
