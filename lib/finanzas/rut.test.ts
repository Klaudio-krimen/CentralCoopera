import { describe, it, expect } from "vitest";
import {
  normalizarRut,
  digitoVerificador,
  esRutValido,
  formatearRut,
  enmascararRut,
} from "./rut";

describe("normalizarRut", () => {
  it("normaliza un RUT con puntos y guion", () => {
    expect(normalizarRut("12.345.678-9")).toBe("12345678-9");
  });

  it("normaliza un RUT sin ningún formato", () => {
    expect(normalizarRut("123456789")).toBe("12345678-9");
  });

  it("deja la K en mayúscula", () => {
    expect(normalizarRut("7.654.321-k")).toBe("7654321-K");
  });
});

describe("digitoVerificador", () => {
  it("calcula un dígito numérico conocido", () => {
    expect(digitoVerificador("12345678")).toBe("5");
  });

  it("calcula K cuando el resto da 10", () => {
    expect(digitoVerificador("6")).toBe("K");
  });
});

describe("esRutValido", () => {
  it("acepta un RUT con dígito verificador correcto", () => {
    expect(esRutValido("12.345.678-5")).toBe(true);
  });

  it("rechaza un RUT con dígito verificador incorrecto", () => {
    expect(esRutValido("12.345.678-9")).toBe(false);
  });

  it("acepta el caso K", () => {
    expect(esRutValido("6-K")).toBe(true);
  });

  it("rechaza un cuerpo no numérico", () => {
    expect(esRutValido("ABC-5")).toBe(false);
  });
});

describe("formatearRut", () => {
  it("agrega puntos de mil en el cuerpo", () => {
    expect(formatearRut("12345678-5")).toBe("12.345.678-5");
  });
});

describe("enmascararRut", () => {
  it('devuelve exactamente "12.345.***-*"', () => {
    expect(enmascararRut("12345678-9")).toBe("12.345.***-*");
  });
});
