import { describe, it, expect } from "vitest";
import {
  montoSchema,
  crearEmpleadoSchema,
  crearTransaccionSchema,
  crearNominaSchema,
  filtrosListadoSchema,
} from "./schemas";

describe("montoSchema", () => {
  it("acepta un entero positivo", () => {
    expect(montoSchema.safeParse(150000).success).toBe(true);
  });

  it("rechaza un decimal", () => {
    expect(montoSchema.safeParse(1500.5).success).toBe(false);
  });

  it("rechaza un negativo", () => {
    expect(montoSchema.safeParse(-100).success).toBe(false);
  });

  it("rechaza cero", () => {
    expect(montoSchema.safeParse(0).success).toBe(false);
  });
});

describe("crearEmpleadoSchema", () => {
  it("acepta una entrada válida completa", () => {
    const resultado = crearEmpleadoSchema.safeParse({
      fullName: "Juan Pérez",
      rut: "12.345.678-5",
      hiredAt: "2026-01-15",
      baseSalary: 800000,
      bankAccountType: "VISTA",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza un baseSalary decimal", () => {
    const resultado = crearEmpleadoSchema.safeParse({
      fullName: "Juan Pérez",
      rut: "12.345.678-5",
      hiredAt: "2026-01-15",
      baseSalary: 800000.5,
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza sin fullName", () => {
    const resultado = crearEmpleadoSchema.safeParse({
      rut: "12.345.678-5",
      hiredAt: "2026-01-15",
      baseSalary: 800000,
    });
    expect(resultado.success).toBe(false);
  });
});

describe("crearTransaccionSchema", () => {
  it("acepta un egreso válido", () => {
    const resultado = crearTransaccionSchema.safeParse({
      kind: "EGRESO",
      amount: 45000,
      date: "2026-08-01",
      description: "Combustible",
      method: "EFECTIVO",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza un kind fuera del enum", () => {
    const resultado = crearTransaccionSchema.safeParse({
      kind: "TRANSFERENCIA",
      amount: 45000,
      date: "2026-08-01",
      description: "Combustible",
      method: "EFECTIVO",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("crearNominaSchema", () => {
  it("acepta un período con formato AAAA-MM y al menos una línea", () => {
    const resultado = crearNominaSchema.safeParse({
      period: "2026-08",
      lineas: [{ employeeId: "emp1", afpAmount: 80000, healthAmount: 56000 }],
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.lineas[0].otherDeductions).toBe(0);
    }
  });

  it("rechaza un período mal formado", () => {
    const resultado = crearNominaSchema.safeParse({
      period: "agosto-2026",
      lineas: [{ employeeId: "emp1", afpAmount: 0, healthAmount: 0 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza sin líneas", () => {
    const resultado = crearNominaSchema.safeParse({
      period: "2026-08",
      lineas: [],
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza un afpAmount negativo", () => {
    const resultado = crearNominaSchema.safeParse({
      period: "2026-08",
      lineas: [{ employeeId: "emp1", afpAmount: -1, healthAmount: 0 }],
    });
    expect(resultado.success).toBe(false);
  });
});

describe("filtrosListadoSchema", () => {
  it("coacciona strings de query params a número", () => {
    const resultado = filtrosListadoSchema.safeParse({
      page: "3",
      pageSize: "25",
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.page).toBe(3);
      expect(resultado.data.pageSize).toBe(25);
    }
  });
});
