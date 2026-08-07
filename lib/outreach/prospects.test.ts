import { describe, it, expect } from "vitest";
import {
  clean,
  parseCsv,
  domainOf,
  extractPlaceId,
  normalizeLogisticaRow,
  normalizeFarmaceuticaRow,
  pickBestEmail,
  mergeEnrichedEmail,
  dedupeKey,
  isPhoneOnly,
  type NormalizedProspect,
} from "./prospects";

describe("clean", () => {
  it("convierte los placeholders de Apify en null", () => {
    expect(clean("sin dato")).toBeNull();
    expect(clean("Sin Dato")).toBeNull();
    expect(clean("N/A")).toBeNull();
    expect(clean("-")).toBeNull();
  });

  it("recorta espacios y preserva el valor real", () => {
    expect(clean("  Empresa X  ")).toBe("Empresa X");
  });

  it("trata vacío y undefined/null como null", () => {
    expect(clean("")).toBeNull();
    expect(clean("   ")).toBeNull();
    expect(clean(undefined)).toBeNull();
    expect(clean(null)).toBeNull();
  });
});

describe("parseCsv", () => {
  it("parsea filas separadas por coma con header", () => {
    const rows = parseCsv("a,b\n1,2\n3,4");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("respeta comillas con comas embebidas y comillas escapadas", () => {
    const rows = parseCsv('a,b\n"uno, dos","tres ""citado"""');
    expect(rows).toEqual([{ a: "uno, dos", b: 'tres "citado"' }]);
  });

  it("quita el BOM utf-8 del primer header", () => {
    const rows = parseCsv("﻿Empresa,comuna\nACME,Renca");
    expect(rows).toEqual([{ Empresa: "ACME", comuna: "Renca" }]);
  });

  it("soporta \\r\\n y descarta líneas vacías", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n\r\n3,4\r\n");
    expect(rows).toHaveLength(2);
  });
});

describe("domainOf", () => {
  it("extrae el hostname sin www", () => {
    expect(domainOf("http://www.dbschenker.com/cl-es")).toBe("dbschenker.com");
    expect(domainOf("https://plantaelabs.com/")).toBe("plantaelabs.com");
  });

  it("devuelve null para URLs inválidas o ausentes", () => {
    expect(domainOf(null)).toBeNull();
    expect(domainOf("no es una url")).toBeNull();
  });
});

describe("extractPlaceId", () => {
  it("extrae el place_id de una URL de Google Maps", () => {
    const url =
      "https://www.google.com/maps/search/?api=1&query=Drogueria%20Hofmann&query_place_id=ChIJhZiBIjHEYpYRJCzCpEFYBmQ";
    expect(extractPlaceId(url)).toBe("ChIJhZiBIjHEYpYRJCzCpEFYBmQ");
  });

  it("devuelve null si no hay query_place_id", () => {
    expect(extractPlaceId("https://example.com")).toBeNull();
    expect(extractPlaceId(null)).toBeNull();
  });
});

describe("normalizeLogisticaRow", () => {
  it("mapea columnas del CSV de logística y normaliza placeholders", () => {
    const row = {
      negocio: "SCHENKER CHILE S.A",
      contacto: "sin dato",
      puesto: "sin dato",
      telefono: "sin dato",
      correo: "sin dato",
      sitio_web: "http://www.dbschenker.com/cl-es",
      instagram: "sin dato",
      linkedin: "sin dato",
      ciudad: "Pudahuel",
      rating: "4.2",
      resenas: "54",
      senal_de_calificacion: "Operador logistico multinacional",
      fuente: "compass/crawler-google-places",
      fecha: "2026-07-28",
    };
    const result = normalizeLogisticaRow(row);
    expect(result).toMatchObject({
      segment: "LOGISTICA",
      empresa: "SCHENKER CHILE S.A",
      commune: "Pudahuel",
      website: "http://www.dbschenker.com/cl-es",
      domain: "dbschenker.com",
      placeId: null,
      rating: 4.2,
      reviews: 54,
      contactName: null, // "sin dato" → null
      email: null,
    });
  });

  it("devuelve null si falta el nombre de la empresa", () => {
    expect(normalizeLogisticaRow({ negocio: "sin dato" } as any)).toBeNull();
  });
});

describe("normalizeFarmaceuticaRow", () => {
  it("mapea columnas del CSV farmacéutico y extrae el place_id", () => {
    const row = {
      Empresa: "Drogueria Hofmann Sac",
      comuna_busqueda: "Renca",
      categoryName: "Farmacia",
      address: "Los Gobelinos 2507, Renca",
      phone: "+56 2 2435 6000",
      website: "http://www.hofmann.cl/",
      totalScore: "3.2",
      reviewsCount: "26",
      lat: "-33.4215636",
      lng: "-70.6779268",
      url: "https://www.google.com/maps/search/?api=1&query=Drogueria&query_place_id=ChIJhZiBIjHEYpYRJCzCpEFYBmQ",
    };
    const result = normalizeFarmaceuticaRow(row);
    expect(result).toMatchObject({
      segment: "FARMACEUTICA",
      empresa: "Drogueria Hofmann Sac",
      commune: "Renca",
      domain: "hofmann.cl",
      placeId: "ChIJhZiBIjHEYpYRJCzCpEFYBmQ",
      lat: -33.4215636,
      lng: -70.6779268,
      rating: 3.2,
      reviews: 26,
      email: null,
    });
  });

  it("devuelve null si falta el nombre de la empresa", () => {
    expect(normalizeFarmaceuticaRow({} as any)).toBeNull();
  });
});

describe("pickBestEmail", () => {
  it("prefiere un prefijo genérico sobre uno nominativo", () => {
    expect(
      pickBestEmail([
        "ricardo.valdes@dragpharma.cl",
        "info@dragpharma.cl",
        "edgar.cerna@dragpharma.cl",
      ])
    ).toBe("info@dragpharma.cl");
  });

  it("cae al primer correo válido si no hay ninguno genérico", () => {
    expect(
      pickBestEmail(["mromero@grupoimsi.com", "alufin@grupoimsi.com"])
    ).toBe("mromero@grupoimsi.com");
  });

  it("filtra direcciones con formato inválido y sigue prefiriendo el prefijo genérico", () => {
    expect(
      pickBestEmail(["usuario@dominio.com", "no-es-un-correo", "info@x.cl"])
    ).toBe("info@x.cl");
  });

  it("devuelve null si la lista está vacía o no hay ninguno válido", () => {
    expect(pickBestEmail([])).toBeNull();
    expect(pickBestEmail(["no-es-un-correo"])).toBeNull();
  });
});

describe("mergeEnrichedEmail", () => {
  const base: NormalizedProspect = {
    segment: "FARMACEUTICA",
    empresa: "Plantae Labs",
    commune: "Renca",
    category: null,
    address: null,
    website: "https://plantaelabs.com/",
    domain: "plantaelabs.com",
    placeId: null,
    lat: null,
    lng: null,
    rating: null,
    reviews: null,
    phone: null,
    contactName: null,
    contactRole: null,
    email: null,
    qualificationSignal: null,
  };

  it("llena el correo desde el mapa de enriquecimiento por dominio", () => {
    const enriched = new Map([["plantaelabs.com", ["info@plantaelabs.com"]]]);
    expect(mergeEnrichedEmail(base, enriched).email).toBe(
      "info@plantaelabs.com"
    );
  });

  it("no pisa un correo que ya existía", () => {
    const withEmail = { ...base, email: "ya@existia.cl" };
    const enriched = new Map([["plantaelabs.com", ["otro@plantaelabs.com"]]]);
    expect(mergeEnrichedEmail(withEmail, enriched).email).toBe("ya@existia.cl");
  });

  it("no falla si el dominio es null o no está en el mapa", () => {
    const noDomain = { ...base, domain: null };
    expect(mergeEnrichedEmail(noDomain, new Map()).email).toBeNull();
    expect(mergeEnrichedEmail(base, new Map()).email).toBeNull();
  });
});

describe("dedupeKey", () => {
  const base: NormalizedProspect = {
    segment: "FARMACEUTICA",
    empresa: "Drogueria Hofmann Sac",
    commune: "Renca",
    category: null,
    address: null,
    website: "http://www.hofmann.cl/",
    domain: "hofmann.cl",
    placeId: "ChIJhZiBIjHEYpYRJCzCpEFYBmQ",
    lat: null,
    lng: null,
    rating: null,
    reviews: null,
    phone: null,
    contactName: null,
    contactRole: null,
    email: null,
    qualificationSignal: null,
  };

  it("prioriza placeId sobre dominio y nombre", () => {
    expect(dedupeKey(base)).toBe("placeId:ChIJhZiBIjHEYpYRJCzCpEFYBmQ");
  });

  it("cae a dominio si no hay placeId", () => {
    expect(dedupeKey({ ...base, placeId: null })).toBe("domain:hofmann.cl");
  });

  it("cae a nombre+comuna si no hay placeId ni dominio", () => {
    expect(dedupeKey({ ...base, placeId: null, domain: null })).toBe(
      "name:drogueria-hofmann-sac|renca"
    );
  });

  it("la clave por nombre es estable ante acentos y mayúsculas", () => {
    const a = dedupeKey({
      ...base,
      placeId: null,
      domain: null,
      empresa: "Sudamérica S.A.",
      commune: "Renca",
    });
    const b = dedupeKey({
      ...base,
      placeId: null,
      domain: null,
      empresa: "sudamerica s.a.",
      commune: "RENCA",
    });
    expect(a).toBe(b);
  });
});

describe("isPhoneOnly", () => {
  const base: NormalizedProspect = {
    segment: "FARMACEUTICA",
    empresa: "Empresa X",
    commune: null,
    category: null,
    address: null,
    website: null,
    domain: null,
    placeId: null,
    lat: null,
    lng: null,
    rating: null,
    reviews: null,
    phone: "+56 2 1234 5678",
    contactName: null,
    contactRole: null,
    email: null,
    qualificationSignal: null,
  };

  it("es true cuando solo hay teléfono", () => {
    expect(isPhoneOnly(base)).toBe(true);
  });

  it("es false si tiene sitio web aunque no tenga correo", () => {
    expect(isPhoneOnly({ ...base, website: "https://x.cl" })).toBe(false);
  });

  it("es false si tiene correo", () => {
    expect(isPhoneOnly({ ...base, email: "x@x.cl" })).toBe(false);
  });

  it("es false si no tiene ni teléfono", () => {
    expect(isPhoneOnly({ ...base, phone: null })).toBe(false);
  });
});
