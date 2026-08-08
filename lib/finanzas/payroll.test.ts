import { describe, it, expect } from "vitest";
import { calcularLiquido, totalizarNomina } from "./payroll";

describe("calcularLiquido", () => {
  it("resta las cuatro deducciones al bruto", () => {
    const liquido = calcularLiquido({
      grossAmount: 800000,
      afpAmount: 80000,
      healthAmount: 56000,
      otherDeductions: 0,
      advancesApplied: 100000,
    });
    expect(liquido).toBe(564000);
  });

  it("nunca devuelve un número negativo cuando las deducciones superan al bruto", () => {
    const liquido = calcularLiquido({
      grossAmount: 100000,
      afpAmount: 50000,
      healthAmount: 50000,
      otherDeductions: 0,
      advancesApplied: 50000,
    });
    expect(liquido).toBe(0);
  });

  it("devuelve el bruto completo cuando no hay deducciones", () => {
    const liquido = calcularLiquido({
      grossAmount: 500000,
      afpAmount: 0,
      healthAmount: 0,
      otherDeductions: 0,
      advancesApplied: 0,
    });
    expect(liquido).toBe(500000);
  });
});

describe("totalizarNomina", () => {
  it("devuelve ceros con un arreglo vacío", () => {
    expect(totalizarNomina([])).toEqual({ totalGross: 0, totalNet: 0 });
  });

  it("suma el bruto y el líquido de cada línea", () => {
    const totales = totalizarNomina([
      {
        grossAmount: 800000,
        afpAmount: 80000,
        healthAmount: 56000,
        otherDeductions: 0,
        advancesApplied: 100000,
      },
      {
        grossAmount: 500000,
        afpAmount: 50000,
        healthAmount: 35000,
        otherDeductions: 0,
        advancesApplied: 0,
      },
    ]);
    expect(totales).toEqual({ totalGross: 1300000, totalNet: 979000 });
  });

  it("nunca resta líneas negativas al total: una línea con deducciones excesivas totaliza 0, no negativo", () => {
    const totales = totalizarNomina([
      {
        grossAmount: 100000,
        afpAmount: 90000,
        healthAmount: 90000,
        otherDeductions: 0,
        advancesApplied: 0,
      },
    ]);
    expect(totales.totalNet).toBe(0);
  });
});
