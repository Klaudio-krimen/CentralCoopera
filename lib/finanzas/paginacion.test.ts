import { describe, it, expect } from "vitest";
import { resolverPaginacion, construirMeta } from "./paginacion";

describe("resolverPaginacion", () => {
  it("aplica el tope duro de 100 cuando pageSize pide más", () => {
    const r = resolverPaginacion({ pageSize: "500" });
    expect(r.take).toBe(100);
    expect(r.pageSize).toBe(100);
  });

  it('cae a page:1 y skip:0 cuando page es "0"', () => {
    const r = resolverPaginacion({ page: "0" });
    expect(r.page).toBe(1);
    expect(r.skip).toBe(0);
  });

  it('cae a page:1 y skip:0 cuando page es "abc" (no numérico)', () => {
    const r = resolverPaginacion({ page: "abc" });
    expect(r.page).toBe(1);
    expect(r.skip).toBe(0);
  });

  it("calcula skip:50 y take:25 para page:3, pageSize:25", () => {
    const r = resolverPaginacion({ page: 3, pageSize: 25 });
    expect(r.skip).toBe(50);
    expect(r.take).toBe(25);
  });

  it("usa los valores por defecto cuando no se pasa nada", () => {
    const r = resolverPaginacion({});
    expect(r).toEqual({ page: 1, pageSize: 25, take: 25, skip: 0 });
  });

  it("trunca un pageSize decimal", () => {
    const r = resolverPaginacion({ pageSize: "10.9" });
    expect(r.pageSize).toBe(10);
  });
});

describe("construirMeta", () => {
  it("calcula totalPages redondeando hacia arriba", () => {
    expect(construirMeta(101, 1, 25)).toEqual({
      total: 101,
      page: 1,
      pageSize: 25,
      totalPages: 5,
    });
  });

  it("totalPages es 0 cuando total es 0", () => {
    expect(construirMeta(0, 1, 25).totalPages).toBe(0);
  });
});
