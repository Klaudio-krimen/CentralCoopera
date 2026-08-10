import { describe, it, expect } from "vitest";
import { parseCsv, detectarDelimitador, toCsv } from "./csv";

describe("parseCsv — comportamiento por defecto (coma), sin romper al CRM", () => {
  it("parsea filas separadas por coma", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respeta campos entre comillas con comas dentro", () => {
    expect(parseCsv('a,b\n"uno, dos",tres')).toEqual([
      ["a", "b"],
      ["uno, dos", "tres"],
    ]);
  });
});

describe("parseCsv — delimitador tabulador (pegado desde Excel)", () => {
  it("parsea filas separadas por tab cuando se pasa el delimitador", () => {
    const pegado = "NUMERO\tNOMBRE\tCANTIDAD\n1\tADHESIVO ALFOMBRA\t80%";
    expect(parseCsv(pegado, "\t")).toEqual([
      ["NUMERO", "NOMBRE", "CANTIDAD"],
      ["1", "ADHESIVO ALFOMBRA", "80%"],
    ]);
  });

  it("no separa por coma cuando el delimitador es tab", () => {
    const pegado = "NOMBRE\tCOMENTARIO\nYESO\tsobran, dos bolsas";
    expect(parseCsv(pegado, "\t")).toEqual([
      ["NOMBRE", "COMENTARIO"],
      ["YESO", "sobran, dos bolsas"],
    ]);
  });
});

describe("detectarDelimitador", () => {
  it("detecta tab en un bloque pegado desde Excel", () => {
    expect(detectarDelimitador("NUMERO\tNOMBRE\n1\tYESO")).toBe("\t");
  });

  it("detecta coma en un .csv real", () => {
    expect(detectarDelimitador("NUMERO,NOMBRE\n1,YESO")).toBe(",");
  });

  it("cae a coma si no hay ninguno de los dos", () => {
    expect(detectarDelimitador("NOMBRE\nYESO")).toBe(",");
  });
});

describe("toCsv sigue exportando con coma (sin cambios)", () => {
  it("arma header + filas separadas por coma", () => {
    const csv = toCsv(
      [{ a: "1", b: "2" }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ]
    );
    expect(csv).toBe("A,B\n1,2");
  });
});
