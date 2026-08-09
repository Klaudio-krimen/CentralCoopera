import { describe, it, expect } from "vitest";
import { escaparCampoCsv, filasACsv } from "./csv";

describe("escaparCampoCsv", () => {
  it("envuelve en comillas dobles un valor que contiene una coma", () => {
    expect(escaparCampoCsv("Fletes, combustible")).toBe(
      '"Fletes, combustible"'
    );
  });

  it("duplica las comillas internas dentro del campo entrecomillado", () => {
    expect(escaparCampoCsv('Pago "urgente"')).toBe('"Pago ""urgente"""');
  });

  it("antepone comilla simple a un valor que empieza con =", () => {
    expect(escaparCampoCsv("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
  });

  it("antepone comilla simple a un valor que empieza con +, - o @", () => {
    expect(escaparCampoCsv("+1234")).toBe("'+1234");
    expect(escaparCampoCsv("-1234")).toBe("'-1234");
    expect(escaparCampoCsv("@usuario")).toBe("'@usuario");
  });

  it("no toca un valor sin caracteres especiales", () => {
    expect(escaparCampoCsv("Combustible")).toBe("Combustible");
  });

  it("envuelve un valor con salto de línea", () => {
    expect(escaparCampoCsv("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
  });
});

describe("filasACsv", () => {
  it("arma el documento con separador coma y salto \\r\\n", () => {
    const csv = filasACsv(
      ["Fecha", "Monto"],
      [
        ["2026-08-01", "45000"],
        ["2026-08-02", "12000"],
      ]
    );
    expect(csv).toBe("Fecha,Monto\r\n2026-08-01,45000\r\n2026-08-02,12000");
  });

  it("escapa cada campo antes de unirlo", () => {
    const csv = filasACsv(["Descripción"], [["Pago, con coma"]]);
    expect(csv).toBe('Descripción\r\n"Pago, con coma"');
  });
});
