import { describe, expect, it } from "vitest";
import {
  EPP_ITEM_SUGGESTIONS,
  esArticuloEpp,
  isInventoryCategory,
  parsearCategoriaInventario,
  resolverCategoriaInventario,
} from "./category";

describe("clasificación de EPP", () => {
  it.each([
    "Antiparras",
    "Polerón reflectante",
    "Tapón auditivo",
    "Cascos",
    "Chaleco reflectante",
    "Polera reflectante",
    "Zapatos de seguridad",
    "Orejeras de protección",
    "Guantes anticorte",
    "Respirador con filtros",
    "Arnés de seguridad",
    "Línea de vida",
    "Overol de protección",
    "Protector facial",
    "Protector solar",
  ])("reconoce %s como EPP", (nombre) => {
    expect(esArticuloEpp(nombre)).toBe(true);
    expect(resolverCategoriaInventario(nombre, "OTRO")).toBe("EPP");
  });

  it("ignora mayúsculas, tildes y separadores", () => {
    expect(esArticuloEpp("POLERON-REFLECTANTE talla L")).toBe(true);
    expect(esArticuloEpp("TAPONES auditivos descartables")).toBe(true);
  });

  it("clasifica todas las sugerencias EPP que ofrece el formulario", () => {
    expect(EPP_ITEM_SUGGESTIONS.every(esArticuloEpp)).toBe(true);
  });

  it.each([
    "Pintura reflectante",
    "Polera corporativa",
    "Zapatos casuales",
    "Pallet",
  ])("no clasifica %s como EPP", (nombre) => {
    expect(esArticuloEpp(nombre)).toBe(false);
    expect(resolverCategoriaInventario(nombre, "MATERIAL")).toBe("MATERIAL");
  });

  it("valida categorías y conserva OTRO como valor por defecto", () => {
    expect(isInventoryCategory("EPP")).toBe(true);
    expect(isInventoryCategory("DESCONOCIDA")).toBe(false);
    expect(resolverCategoriaInventario("Artículo sin clasificar")).toBe("OTRO");
  });

  it("lee la categoría exportada como enum o etiqueta legible", () => {
    expect(parsearCategoriaInventario("EPP")).toBe("EPP");
    expect(
      parsearCategoriaInventario("EPP — Elementos de Protección Personal")
    ).toBe("EPP");
    expect(parsearCategoriaInventario("Materia prima")).toBe("MATERIA_PRIMA");
    expect(parsearCategoriaInventario("categoría desconocida")).toBeNull();
  });
});
