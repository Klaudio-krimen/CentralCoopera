import { describe, it, expect } from "vitest";
import {
  generarToken,
  hashToken,
  esTokenUtilizable,
  armarEnlace,
} from "./reset";

describe("generarToken", () => {
  it("genera tokens distintos en cada llamada", () => {
    expect(generarToken()).not.toBe(generarToken());
  });

  it("genera 32 bytes en hex (64 caracteres)", () => {
    expect(generarToken()).toHaveLength(64);
  });
});

describe("hashToken", () => {
  it("devuelve el mismo hash para el mismo token", () => {
    const token = generarToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("devuelve un hash distinto para un token distinto", () => {
    expect(hashToken(generarToken())).not.toBe(hashToken(generarToken()));
  });
});

describe("esTokenUtilizable", () => {
  const ahora = new Date("2026-08-08T12:00:00Z");

  it("es false si usedAt no es null, aunque expiresAt esté en el futuro", () => {
    const fila = {
      usedAt: new Date("2026-08-08T11:00:00Z"),
      expiresAt: new Date("2026-08-08T13:00:00Z"),
    };
    expect(esTokenUtilizable(fila, ahora)).toBe(false);
  });

  it("es false si expiresAt ya pasó", () => {
    const fila = {
      usedAt: null,
      expiresAt: new Date("2026-08-08T11:00:00Z"),
    };
    expect(esTokenUtilizable(fila, ahora)).toBe(false);
  });

  it("es true si no se usó y todavía no expira", () => {
    const fila = {
      usedAt: null,
      expiresAt: new Date("2026-08-08T13:00:00Z"),
    };
    expect(esTokenUtilizable(fila, ahora)).toBe(true);
  });
});

describe("armarEnlace", () => {
  it("arma el enlace de confirmación con el token en la query", () => {
    expect(armarEnlace("https://intranet.cooperapro.cl", "abc123")).toBe(
      "https://intranet.cooperapro.cl/recuperar/confirmar?token=abc123"
    );
  });

  it("no duplica la barra si baseUrl termina en /", () => {
    expect(armarEnlace("https://intranet.cooperapro.cl/", "abc123")).toBe(
      "https://intranet.cooperapro.cl/recuperar/confirmar?token=abc123"
    );
  });
});
