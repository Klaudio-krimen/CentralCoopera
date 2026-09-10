import { describe, it, expect } from "vitest";
import {
  RADAR_SHEETS,
  HEADER_MAP,
  parseRadarSheet,
  splitPhones,
  normalizeCompanyName,
} from "./radar";

// Cabecera canónica de las 3 hojas del "Radar de Clientes Pallets V7"
// (IMPORTACION_RADAR_PALLETS.md §3 — el único identificador común es "Nombre").
const HEADER_CANONICO =
  "Nombre,Teléfono,Correo,Tipo,Perfil operacional,Evidencia operacional,Próximo paso,Observación";

describe("RADAR_SHEETS", () => {
  it("expone las 3 hojas con su prioridad de desempate (0 = mayor prioridad)", () => {
    // blueprint §9 Step 3: { PROSPECTOS: 0, TOP20: 1, TOP25: 2 }; el número lo
    // usa consolidateRows (E1-T4) para desempatar — menor gana.
    expect(RADAR_SHEETS).toEqual({ PROSPECTOS: 0, TOP20: 1, TOP25: 2 });
  });
});

describe("HEADER_MAP", () => {
  it("mapea los 8 rótulos canónicos del Radar a claves de RadarRow", () => {
    expect(HEADER_MAP).toEqual({
      Nombre: "empresa",
      Teléfono: "telefonos",
      Correo: "email",
      Tipo: "tipo",
      "Perfil operacional": "perfilOperacional",
      "Evidencia operacional": "evidenciaOperacional",
      "Próximo paso": "proximoPaso",
      Observación: "observacion",
    });
  });
});

describe("normalizeCompanyName", () => {
  it("quita el sufijo societario final y conserva la ñ", () => {
    // Acceptance E1-T3 #1: la ñ es letra, no acento — no se descompone.
    expect(normalizeCompanyName("Transportes Peñaflor Ltda.")).toBe(
      "transportes peñaflor"
    );
  });

  it("no fusiona nombres que sólo comparten el sufijo", () => {
    // Acceptance E1-T3 #2 + trampa del epic: "Novofarma Service" ≠ "Laboratorio
    // Novofarma Service" — match exacto tras normalizar, nunca substring.
    const a = normalizeCompanyName("Novofarma Service S.A.");
    const b = normalizeCompanyName("Laboratorio Novofarma Service S.A.");
    expect(a).toBe("novofarma service");
    expect(b).toBe("laboratorio novofarma service");
    expect(a).not.toBe(b);
  });

  it("baja a minúsculas y colapsa los espacios internos a uno", () => {
    expect(normalizeCompanyName("NOVOFARMA  SERVICE   S.A.")).toBe(
      "novofarma service"
    );
  });

  it("quita el sufijo esté con o sin punto", () => {
    // Lista cerrada del blueprint; comparación del último token sin puntuación.
    expect(normalizeCompanyName("Comercial Andes SPA")).toBe("comercial andes");
    expect(normalizeCompanyName("Comercial Andes S.P.A")).toBe(
      "comercial andes"
    );
    expect(normalizeCompanyName("Bodegas del Sur EIRL")).toBe(
      "bodegas del sur"
    );
    expect(normalizeCompanyName("Bodegas del Sur E.I.R.L")).toBe(
      "bodegas del sur"
    );
    expect(normalizeCompanyName("Maderas Ltda")).toBe("maderas");
    expect(normalizeCompanyName("Maderas LTDA.")).toBe("maderas");
  });

  it("quita las tildes normales pero nunca la ñ", () => {
    expect(normalizeCompanyName("Logística Ñuñoa Limitada")).toBe(
      "logistica ñuñoa"
    );
  });

  it("no reduce a cadena vacía un nombre que es sólo el sufijo", () => {
    // "sólo si es el token final" — con un único token no se toca.
    expect(normalizeCompanyName("Spa")).toBe("spa");
    expect(normalizeCompanyName("SAC")).toBe("sac");
  });

  it("sólo quita el último sufijo, no itera", () => {
    expect(normalizeCompanyName("Envases SA Ltda")).toBe("envases sa");
  });

  it("compara por igualdad exacta, nunca por substring", () => {
    expect(normalizeCompanyName("Peñaflor")).not.toBe(
      normalizeCompanyName("Transportes Peñaflor")
    );
  });

  it("hace trim y respeta un nombre ya limpio", () => {
    expect(normalizeCompanyName("  Acme  ")).toBe("acme");
  });
});

describe("splitPhones", () => {
  it("divide por barra y recorta el sobrante externo de cada trozo", () => {
    // Acceptance E1-T3 #3.
    expect(splitPhones("+56 2 2333 2126 / +56 9 9689 7446")).toEqual([
      "+56 2 2333 2126",
      "+56 9 9689 7446",
    ]);
  });

  it("divide también por ';', ',', salto de línea y el literal ' y '", () => {
    expect(splitPhones("+56 1;+56 2,+56 3\n+56 4 y +56 5")).toHaveLength(5);
  });

  it("preserva los espacios internos de cada número", () => {
    expect(splitPhones("+56 2 2435 6000")).toEqual(["+56 2 2435 6000"]);
  });

  it("descarta los trozos vacíos entre delimitadores", () => {
    expect(splitPhones("+56 1,,/+56 2")).toEqual(["+56 1", "+56 2"]);
    expect(splitPhones("/ ; ,")).toEqual([]);
  });

  it("trata placeholders y celda vacía como lista vacía", () => {
    expect(splitPhones("sin dato")).toEqual([]);
    expect(splitPhones("")).toEqual([]);
    expect(splitPhones("   ")).toEqual([]);
  });

  it("devuelve [] cuando la entrada es null", () => {
    expect(splitPhones(null)).toEqual([]);
  });

  it("no deduplica números repetidos", () => {
    expect(splitPhones("+56 9 1 / +56 9 1")).toEqual(["+56 9 1", "+56 9 1"]);
  });

  it("mezcla delimitadores y descarta un placeholder en un trozo", () => {
    expect(splitPhones("+56 1 / sin dato ; +56 2")).toEqual(["+56 1", "+56 2"]);
  });
});

describe("parseRadarSheet", () => {
  it("mapea las columnas canónicas del Radar a RadarRow", () => {
    const csv =
      HEADER_CANONICO +
      "\n" +
      "ACME S.A.,+56 2 2333 2126,ventas@acme.cl,Bodega,Almacena pallets,Galpon con racks,Llamar,revisar despues";
    const rows = parseRadarSheet(csv, "PROSPECTOS");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      empresa: "ACME S.A.",
      telefonos: ["+56 2 2333 2126"],
      email: "ventas@acme.cl",
      tipo: "Bodega",
      perfilOperacional: "Almacena pallets",
      evidenciaOperacional: "Galpon con racks",
      proximoPaso: "Llamar",
      observacion: "revisar despues",
      sheetTag: "PROSPECTOS",
    });
  });

  it("acepta headers sin tilde y en minúscula", () => {
    const csv =
      "nombre,telefono,correo,tipo,perfil operacional,evidencia operacional,proximo paso,observacion" +
      "\n" +
      "ACME S.A.,+56 2 2333 2126,ventas@acme.cl,Bodega,Almacena pallets,Galpon con racks,Llamar,revisar despues";
    const rows = parseRadarSheet(csv, "PROSPECTOS");
    expect(rows[0].empresa).toBe("ACME S.A.");
    expect(rows[0].tipo).toBe("Bodega");
    expect(rows[0].perfilOperacional).toBe("Almacena pallets");
    expect(rows[0].proximoPaso).toBe("Llamar");
  });

  it("convierte una celda 'sin dato' en null en el campo correspondiente", () => {
    // Acceptance E1-T3 #4.
    const csv =
      "Nombre,Teléfono,Correo,Tipo\n" + "ACME,sin dato,sin dato,sin dato";
    const row = parseRadarSheet(csv, "PROSPECTOS")[0];
    expect(row.email).toBeNull();
    expect(row.tipo).toBeNull();
    expect(row.telefonos).toEqual([]);
  });

  it("omite las filas sin nombre de empresa", () => {
    // Acceptance E1-T3 #5: nombre vacío o placeholder → fila descartada.
    const csv =
      "Nombre,Teléfono\n" + ",+56 1\n" + "sin dato,+56 2\n" + "ACME,+56 3";
    const rows = parseRadarSheet(csv, "PROSPECTOS");
    expect(rows).toHaveLength(1);
    expect(rows[0].empresa).toBe("ACME");
  });

  it("omite la fila cuyo nombre es sólo espacios", () => {
    const csv = "Nombre,Teléfono\n   ,+56 1\nACME,+56 2";
    const rows = parseRadarSheet(csv, "PROSPECTOS");
    expect(rows.map((r) => r.empresa)).toEqual(["ACME"]);
  });

  it("estampa el sheetTag recibido en cada fila", () => {
    const csv = "Nombre\nACME\nBETA";
    expect(
      parseRadarSheet(csv, "TOP20").every((r) => r.sheetTag === "TOP20")
    ).toBe(true);
    expect(
      parseRadarSheet(csv, "TOP25").every((r) => r.sheetTag === "TOP25")
    ).toBe(true);
  });

  it("aplica splitPhones a la celda de teléfono", () => {
    const csv = "Nombre,Teléfono\nACME,+56 2 1 / +56 9 2";
    expect(parseRadarSheet(csv, "PROSPECTOS")[0].telefonos).toEqual([
      "+56 2 1",
      "+56 9 2",
    ]);
  });

  it("deja telefonos en [] cuando la celda de teléfono viene vacía", () => {
    const csv = "Nombre,Teléfono\nACME,";
    expect(parseRadarSheet(csv, "PROSPECTOS")[0].telefonos).toEqual([]);
  });

  it("devuelve [] para un CSV que sólo trae el header", () => {
    expect(parseRadarSheet("Nombre,Teléfono\n", "PROSPECTOS")).toEqual([]);
  });

  it("devuelve [] si el CSV no trae la columna Nombre", () => {
    // Comportamiento definido: sin columna de nombre, toda fila se descarta.
    const csv = "Empresa,Fono\nACME,+56 1";
    expect(parseRadarSheet(csv, "PROSPECTOS")).toEqual([]);
  });

  it("tolera BOM utf-8 y CRLF vía parseCsv", () => {
    const csv = "﻿Nombre,Teléfono\r\nACME,+56 1\r\n\r\nBETA,+56 2\r\n";
    const rows = parseRadarSheet(csv, "PROSPECTOS");
    expect(rows.map((r) => r.empresa)).toEqual(["ACME", "BETA"]);
  });

  it("preserva null en tipo/perfil/evidencia/proximoPaso/observacion cuando la celda falta", () => {
    // Garantiza el conteo de completitud de consolidateRows (E1-T4).
    const csv = HEADER_CANONICO + "\n" + "ACME,+56 1,,,,,,";
    const row = parseRadarSheet(csv, "PROSPECTOS")[0];
    expect(row.tipo).toBeNull();
    expect(row.perfilOperacional).toBeNull();
    expect(row.evidenciaOperacional).toBeNull();
    expect(row.proximoPaso).toBeNull();
    expect(row.observacion).toBeNull();
    expect(row.email).toBeNull();
  });
});
