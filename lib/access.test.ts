import { describe, it, expect } from "vitest";
import { hasModuleAccess } from "./access";

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
