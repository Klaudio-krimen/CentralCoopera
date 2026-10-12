import { describe, expect, it } from "vitest";
import {
  crearGrano,
  crearMotas,
  intensidadHaz,
  intensidadRayo,
  debeRecachear,
  xMota,
  yMota,
  brilloMota,
  pulsoRayo,
} from "./atmosfera";
describe("atmósfera determinista del alba", () => {
  it("el rayo nace después del alba .3 y termina sin exceder uno", () => {
    expect(intensidadRayo(-1)).toBe(0);
    expect(intensidadRayo(0.3)).toBe(0);
    expect(intensidadRayo(0.65)).toBeCloseTo(0.5);
    expect(intensidadRayo(2)).toBe(1);
  });
  it("el polvo sólo se ve dentro del haz y se desvanece en sus bordes", () => {
    expect(intensidadHaz(0, 90)).toBe(0);
    expect(intensidadHaz(22, 48)).toBe(0);
    expect(intensidadHaz(42, 48)).toBe(1);
    expect(intensidadHaz(42, 47)).toBe(0);
    expect(intensidadHaz(150, 143)).toBe(0);
    expect(intensidadHaz(65, 90)).toBeGreaterThan(0);
    expect(intensidadHaz(45.2, 90)).toBeLessThan(0.03);
  });
  it("las semillas y el grano fijo se reproducen sin alterar las motas", () => {
    expect(crearMotas()).toEqual(crearMotas());
    expect(crearMotas()).toHaveLength(90);
    expect(crearGrano(8)).toEqual(crearGrano(8));
    const m = crearMotas()[0];
    const original = { ...m };
    xMota(m, 14000);
    yMota(m, 14000);
    brilloMota(m, 14000);
    expect(m).toEqual(original);
  });
  it("las motas se mantienen en el área y un reloj fijo produce polvo fijo", () => {
    for (const m of crearMotas()) {
      expect(xMota(m, 0)).toBeCloseTo(m.x);
      expect(yMota(m, 0)).toBeCloseTo(m.y);
      for (const reloj of [0, 700, 14000, 600000]) {
        expect(xMota(m, reloj)).toBeGreaterThanOrEqual(22);
        expect(xMota(m, reloj)).toBeLessThan(142);
        expect(yMota(m, reloj)).toBeGreaterThanOrEqual(48);
        expect(yMota(m, reloj)).toBeLessThan(142);
        expect(brilloMota(m, reloj)).toBeGreaterThanOrEqual(0.1 - 1e-9);
        expect(brilloMota(m, reloj)).toBeLessThanOrEqual(1);
      }
    }
  });
  it("los haces lentos repiten su período y mantienen intensidad acotada", () => {
    for (let i = 0; i < 7; i++) {
      expect(pulsoRayo(i, 0)).toBeCloseTo(pulsoRayo(i, 1900 + i * 370));
      expect(pulsoRayo(i, 125)).toBeGreaterThanOrEqual(0.1);
      expect(pulsoRayo(i, 125)).toBeLessThanOrEqual(1);
    }
  });
  it("la caché espera .02 de alba, cambia de escala y conserva el final exacto", () => {
    expect(debeRecachear(4, 0.15, 4, NaN)).toBe(true);
    expect(debeRecachear(4, 0.159, 4, 0.14)).toBe(false);
    expect(debeRecachear(4, 0.16, 4, 0.14)).toBe(true);
    expect(debeRecachear(5, 0.14, 4, 0.14)).toBe(true);
    expect(debeRecachear(4, 1, 4, 0.99)).toBe(true);
    expect(debeRecachear(4, 1, 4, 1)).toBe(false);
  });
});
