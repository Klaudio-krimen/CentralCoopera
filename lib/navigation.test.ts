import { describe, expect, it } from "vitest";
import { isActiveNavHref } from "./navigation";

describe("sección activa de navegación", () => {
  it("no marca Resumen cuando se navega a una sección financiera", () => {
    expect(isActiveNavHref("/admin/finanzas", "/admin/finanzas")).toBe(true);
    expect(
      isActiveNavHref("/admin/finanzas/movimientos", "/admin/finanzas")
    ).toBe(false);
    expect(
      isActiveNavHref("/admin/finanzas/nominas/123", "/admin/finanzas")
    ).toBe(false);
  });

  it("conserva la sección activa dentro de una ficha", () => {
    expect(
      isActiveNavHref("/admin/crm/clientes/123", "/admin/crm/clientes")
    ).toBe(true);
    expect(
      isActiveNavHref("/admin/finanzas/nominas/123", "/admin/finanzas/nominas")
    ).toBe(true);
  });

  it("no confunde prefijos con secciones distintas", () => {
    expect(isActiveNavHref("/admin/ordenes-extra", "/admin/ordenes")).toBe(
      false
    );
    expect(isActiveNavHref("/admin/crm/clientes", "/admin/crm/deals")).toBe(
      false
    );
  });
});
