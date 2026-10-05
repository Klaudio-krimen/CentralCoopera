import { describe, expect, it } from "vitest";
import { calcularMovimiento } from "./movimiento";
describe("calcularMovimiento", () => {
  it("calcula entrada, salida y conteo cero", () => {
    expect(
      calcularMovimiento({ tipo: "ENTRADA", cantidad: "2.5", actual: 10 })
    ).toEqual({ quantityBefore: 10, quantityAfter: 12.5 });
    expect(
      calcularMovimiento({ tipo: "SALIDA", cantidad: 3, actual: 10 })
        .quantityAfter
    ).toBe(7);
    expect(
      calcularMovimiento({ tipo: "AJUSTE", cantidad: 0, actual: 10 })
        .quantityAfter
    ).toBe(0);
  });
  it.each([NaN, Infinity, -1, 0, "2abc", "", "Infinity"])(
    "rechaza cantidad %s",
    (cantidad) => {
      expect(() =>
        calcularMovimiento({ tipo: "SALIDA", cantidad, actual: 10 })
      ).toThrow();
    }
  );
  it("rechaza salida superior a existencias y tipo desconocido", () => {
    expect(() =>
      calcularMovimiento({ tipo: "SALIDA", cantidad: 11, actual: 10 })
    ).toThrow("stock suficiente");
    expect(() =>
      calcularMovimiento({ tipo: "NIVEL", cantidad: 1, actual: 10 })
    ).toThrow("Tipo");
  });
});
