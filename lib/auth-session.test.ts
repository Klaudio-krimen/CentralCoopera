import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularVencimiento,
  sesionVencida,
  SESSION_LONG_MS,
  SESSION_SHORT_MS,
} from "./auth-session";
import { encodeSessionToken } from "./auth-jwt";
import { decode } from "next-auth/jwt";

afterEach(() => vi.useRealTimers());
const ahora = Date.parse("2026-10-05T12:00:00.750Z");
describe("sesión recordada", () => {
  it("mantiene 8 horas sin casilla y 7 días con ella", () => {
    expect(
      calcularVencimiento({ ahora, recordar: false, moduleAccess: [] })
    ).toBe(ahora + SESSION_SHORT_MS);
    expect(
      calcularVencimiento({
        ahora,
        recordar: true,
        moduleAccess: ["OPERACIONES"],
      })
    ).toBe(ahora + SESSION_LONG_MS);
  });
  it.each(["FINANZAS", "FINANZAS_LECTURA"])(
    "limita %s a ocho horas",
    (modulo) => {
      expect(
        calcularVencimiento({ ahora, recordar: true, moduleAccess: [modulo] })
      ).toBe(ahora + SESSION_SHORT_MS);
    }
  );
  it("revoca tras cambio de contraseña y distingue milisegundos del login", () => {
    const base = {
      ahora,
      sessionExpiresAt: ahora + 1000,
      iat: Math.floor(ahora / 1000),
    };
    expect(sesionVencida({ ...base, passwordChangedAt: new Date(ahora) })).toBe(
      true
    );
    expect(
      sesionVencida({
        ...base,
        authenticatedAt: ahora,
        passwordChangedAt: new Date(ahora - 1),
      })
    ).toBe(false);
    expect(
      sesionVencida({
        ...base,
        authenticatedAt: ahora,
        passwordChangedAt: new Date(ahora + 1),
      })
    ).toBe(true);
  });
  it("falla cerrado sin deadline y vence en el límite exacto", () => {
    expect(sesionVencida({ ahora, iat: ahora / 1000 })).toBe(true);
    expect(
      sesionVencida({ ahora, iat: ahora / 1000, sessionExpiresAt: ahora })
    ).toBe(true);
  });
  it("revoca si el cambio confirma después del login aunque su timestamp sea anterior", () => {
    const base = {
      ahora,
      authenticatedAt: ahora,
      sessionExpiresAt: ahora + 1000,
    };
    expect(
      sesionVencida({
        ...base,
        passwordVersion: null,
        passwordChangedAt: new Date(ahora - 1),
      })
    ).toBe(true);
    expect(
      sesionVencida({
        ...base,
        passwordVersion: ahora - 1,
        passwordChangedAt: new Date(ahora - 1),
      })
    ).toBe(false);
  });
  it("la renovación conserva el exp fijo que interpreta el decoder del middleware", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(ahora);
    const secret = "test-secret-auth-expiry";
    const token = {
      id: "test",
      role: "CHOFER",
      moduleAccess: [],
      sessionExpiresAt: ahora + SESSION_SHORT_MS,
    };
    const primerJwt = await encodeSessionToken({
      token,
      secret,
      maxAge: SESSION_LONG_MS / 1000,
    });
    const decoded = await decode({ token: primerJwt, secret });
    vi.setSystemTime(ahora + 3600000);
    const renovado = await encodeSessionToken({
      token: decoded!,
      secret,
      maxAge: SESSION_LONG_MS / 1000,
    });
    expect((await decode({ token: renovado, secret }))?.exp).toBe(decoded?.exp);
    expect(decoded?.exp).toBe(Math.floor(token.sessionExpiresAt / 1000));
  });
});
