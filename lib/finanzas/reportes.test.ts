import { describe, it, expect } from "vitest";
import { resumirPeriodo, agruparPorCategoria } from "./reportes";

describe("resumirPeriodo", () => {
  it("excluye las filas ANULADO de los tres totales", () => {
    const resumen = resumirPeriodo([
      {
        kind: "INGRESO",
        amount: 100000,
        status: "CONFIRMADO",
        categoryId: null,
      },
      { kind: "INGRESO", amount: 999999, status: "ANULADO", categoryId: null },
      { kind: "EGRESO", amount: 40000, status: "CONFIRMADO", categoryId: null },
    ]);
    expect(resumen).toEqual({ ingresos: 100000, egresos: 40000, saldo: 60000 });
  });

  it("con sólo egresos devuelve ingresos 0 y saldo negativo", () => {
    const resumen = resumirPeriodo([
      { kind: "EGRESO", amount: 30000, status: "CONFIRMADO", categoryId: null },
      { kind: "EGRESO", amount: 20000, status: "CONFIRMADO", categoryId: null },
    ]);
    expect(resumen).toEqual({ ingresos: 0, egresos: 50000, saldo: -50000 });
  });

  it("con un arreglo vacío devuelve todo en cero", () => {
    expect(resumirPeriodo([])).toEqual({ ingresos: 0, egresos: 0, saldo: 0 });
  });
});

describe("agruparPorCategoria", () => {
  it("agrupa las transacciones sin categoryId bajo 'Sin categoría'", () => {
    const grupos = agruparPorCategoria([
      { kind: "EGRESO", amount: 10000, status: "CONFIRMADO", categoryId: null },
      { kind: "EGRESO", amount: 5000, status: "CONFIRMADO", categoryId: null },
    ]);
    expect(grupos).toEqual([
      { categoryId: null, nombre: "Sin categoría", monto: 15000 },
    ]);
  });

  it("ordena el resultado de mayor a menor por monto", () => {
    const grupos = agruparPorCategoria([
      {
        kind: "EGRESO",
        amount: 10000,
        status: "CONFIRMADO",
        categoryId: "cat-chica",
        category: { name: "Combustible" },
      },
      {
        kind: "EGRESO",
        amount: 50000,
        status: "CONFIRMADO",
        categoryId: "cat-grande",
        category: { name: "Sueldos" },
      },
    ]);
    expect(grupos.map((g) => g.nombre)).toEqual(["Sueldos", "Combustible"]);
  });

  it("excluye las filas ANULADO de la agrupación", () => {
    const grupos = agruparPorCategoria([
      {
        kind: "EGRESO",
        amount: 999999,
        status: "ANULADO",
        categoryId: "cat-a",
        category: { name: "Arriendo" },
      },
    ]);
    expect(grupos).toEqual([]);
  });
});
