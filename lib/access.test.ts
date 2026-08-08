import { describe, it, expect } from "vitest";
import { hasModuleAccess, hasFinanceAccess, canWriteFinance } from "./access";

describe("hasModuleAccess", () => {
  it("ADMIN siempre tiene acceso, sin importar moduleAccess", () => {
    expect(hasModuleAccess({ role: "ADMIN", moduleAccess: [] }, "CRM")).toBe(
      true
    );
    expect(
      hasModuleAccess({ role: "ADMIN", moduleAccess: [] }, "INVENTARIO")
    ).toBe(true);
  });

  it("otorga acceso si el módulo está en moduleAccess", () => {
    expect(
      hasModuleAccess({ role: "VENTAS", moduleAccess: ["CRM"] }, "CRM")
    ).toBe(true);
  });

  it("niega acceso si el módulo no está en moduleAccess", () => {
    expect(
      hasModuleAccess({ role: "VENTAS", moduleAccess: ["CRM"] }, "INVENTARIO")
    ).toBe(false);
  });

  it("permite combinaciones tipo supervisor (varios módulos)", () => {
    const supervisor = { role: "VENTAS", moduleAccess: ["OPERACIONES", "CRM"] };
    expect(hasModuleAccess(supervisor, "OPERACIONES")).toBe(true);
    expect(hasModuleAccess(supervisor, "CRM")).toBe(true);
    expect(hasModuleAccess(supervisor, "INVENTARIO")).toBe(false);
  });

  it("niega acceso a un usuario sin moduleAccess (ej. CHOFER/RECEPCION)", () => {
    expect(
      hasModuleAccess({ role: "CHOFER", moduleAccess: [] }, "OPERACIONES")
    ).toBe(false);
  });
});

describe("hasFinanceAccess / canWriteFinance", () => {
  it("ADMIN sin grant NO entra a Finanzas", () => {
    expect(hasFinanceAccess({ role: "ADMIN", moduleAccess: [] })).toBe(false);
    expect(canWriteFinance({ role: "ADMIN", moduleAccess: [] })).toBe(false);
  });

  it("FINANZAS entra y puede escribir", () => {
    const marcela = { role: "FINANZAS", moduleAccess: ["FINANZAS"] };
    expect(hasFinanceAccess(marcela)).toBe(true);
    expect(canWriteFinance(marcela)).toBe(true);
  });

  it("FINANZAS_LECTURA entra pero no puede escribir", () => {
    const elizabeth = { role: "ADMIN", moduleAccess: ["FINANZAS_LECTURA"] };
    expect(hasFinanceAccess(elizabeth)).toBe(true);
    expect(canWriteFinance(elizabeth)).toBe(false);
  });

  it("CHOFER sin grant no entra a Finanzas", () => {
    expect(hasFinanceAccess({ role: "CHOFER", moduleAccess: [] })).toBe(false);
    expect(canWriteFinance({ role: "CHOFER", moduleAccess: [] })).toBe(false);
  });

  it("un ADMIN que además tiene FINANZAS_LECTURA sigue sin poder escribir", () => {
    const adminConLectura = {
      role: "ADMIN",
      moduleAccess: ["FINANZAS_LECTURA"],
    };
    expect(canWriteFinance(adminConLectura)).toBe(false);
  });

  it("hasModuleAccess conserva su bypass de ADMIN para los otros módulos", () => {
    expect(hasModuleAccess({ role: "ADMIN", moduleAccess: [] }, "CRM")).toBe(
      true
    );
  });
});
