import { describe, it, expect } from "vitest";
import {
  normalizarCelda,
  parseCantidad,
  parseMedida,
  parseCondicion,
  mapearCabeceras,
} from "./parse";

describe("normalizarCelda", () => {
  it("recorta espacios", () => {
    expect(normalizarCelda("  TARRO  ")).toBe("TARRO");
  });

  it('trata "sin dato" (cualquier capitalización) como null', () => {
    expect(normalizarCelda("sin dato")).toBeNull();
    expect(normalizarCelda("Sin Dato")).toBeNull();
  });

  it("trata la celda vacía como null", () => {
    expect(normalizarCelda("")).toBeNull();
    expect(normalizarCelda("   ")).toBeNull();
  });

  it("trata null/undefined como null", () => {
    expect(normalizarCelda(null)).toBeNull();
    expect(normalizarCelda(undefined)).toBeNull();
  });
});

describe("parseCantidad — filas reales de la planilla", () => {
  it('fila 1, ADHESIVO ALFOMBRA: "80%" es 1 tarro al 80%, no 0.8 unidades', () => {
    expect(parseCantidad("80%")).toEqual({ quantity: 1, fillPercent: 80 });
  });

  it('fila 5, BARNIZ MARINO: "25%"', () => {
    expect(parseCantidad("25%")).toEqual({ quantity: 1, fillPercent: 25 });
  });

  it('fila 13, YESO: "5" es un conteo de bolsas, sin porcentaje', () => {
    expect(parseCantidad("5")).toEqual({ quantity: 5, fillPercent: null });
  });

  it('fila 18, TALADRO INALAMBRICO HILTI: "1" unidad', () => {
    expect(parseCantidad("1")).toEqual({ quantity: 1, fillPercent: null });
  });

  it("celda vacía es 0 en existencia, sin porcentaje", () => {
    expect(parseCantidad("")).toEqual({ quantity: 0, fillPercent: null });
  });

  it("acota un porcentaje fuera de rango a 0–100", () => {
    expect(parseCantidad("120%")).toEqual({ quantity: 1, fillPercent: 100 });
  });

  it("texto no numérico cae a 0 sin reventar", () => {
    expect(parseCantidad("varias")).toEqual({ quantity: 0, fillPercent: null });
  });
});

describe("parseMedida — filas reales de la planilla", () => {
  it("fila 1: LITROS=3,7 (coma decimal chilena), METROS y KILOS vacíos", () => {
    expect(parseMedida("3,7", "", "")).toEqual({
      measureValue: 3.7,
      measureUnit: "LITROS",
    });
  });

  it("fila 13, YESO: KILOS=5, LITROS y METROS vacíos", () => {
    expect(parseMedida("", "", "5")).toEqual({
      measureValue: 5,
      measureUnit: "KILOS",
    });
  });

  it("las tres columnas vacías (herramientas): sin medida", () => {
    expect(parseMedida("", "", "")).toEqual({
      measureValue: null,
      measureUnit: null,
    });
  });

  it("prioriza la primera columna con dato si por error viene más de una", () => {
    expect(parseMedida("3,7", "2", "")).toEqual({
      measureValue: 3.7,
      measureUnit: "LITROS",
    });
  });
});

describe("parseCondicion — filas reales de la planilla", () => {
  it("fila 1: NUEVO vacío, USADO marcado con X", () => {
    expect(parseCondicion("", "X")).toBe("USADO");
  });

  it("filas 23–27, 29, 30: TALADRO INALAMBRICO C/ CARGADOR sin ninguna marca -> sin definir", () => {
    expect(parseCondicion("", "")).toBeNull();
  });

  it("ambas marcadas a la vez es un dato contradictorio -> sin definir, no se adivina", () => {
    expect(parseCondicion("X", "X")).toBeNull();
  });

  it("NUEVO marcado, USADO vacío", () => {
    expect(parseCondicion("X", "")).toBe("NUEVO");
  });
});

describe("mapearCabeceras", () => {
  it("mapea las 12 cabeceras reales de la planilla en su orden original", () => {
    const headers = [
      "NUMERO",
      "NOMBRE",
      "MARCA-DETALLES",
      "FORMATO",
      "COLOR",
      "LITROS",
      "METROS",
      "KILOS",
      "CANTIDAD",
      "NUEVO",
      "USADO",
      "COMENTARIO",
    ];
    expect(mapearCabeceras(headers)).toEqual([
      "numero",
      "name",
      "details",
      "format",
      "color",
      "litros",
      "metros",
      "kilos",
      "cantidad",
      "nuevo",
      "usado",
      "notes",
    ]);
  });

  it("es tolerante a minúsculas, tildes y orden libre", () => {
    expect(mapearCabeceras(["número", "nombre", "comentarios"])).toEqual([
      "numero",
      "name",
      "notes",
    ]);
  });

  it("una cabecera no reconocida no rompe el resto: se ignora", () => {
    expect(mapearCabeceras(["NOMBRE", "COLUMNA_RARA", "COLOR"])).toEqual([
      "name",
      null,
      "color",
    ]);
  });
});

describe("caso combinado — fila 20/21, FOCO OBRA", () => {
  it('"20 PULGADAS" vive en MARCA-DETALLES como texto libre, no se separa', () => {
    // No hay función dedicada a esto — es una decisión de diseño (details es
    // texto libre), este test documenta que no se intenta parsear.
    const detailsCruda = "20 PULGADAS";
    expect(normalizarCelda(detailsCruda)).toBe("20 PULGADAS");
  });
});
