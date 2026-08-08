import { describe, it, expect } from "vitest";
import {
  checkRateLimit,
  reiniciarRateLimit,
  type ClienteContador,
  type ContadorRegistro,
} from "./rate-limit";

function crearContadorEnMemoria(): ClienteContador {
  const filas = new Map<string, ContadorRegistro>();
  let siguienteId = 0;

  return {
    rateLimitCounter: {
      async findUnique({ where: { key } }) {
        return filas.get(key) ?? null;
      },
      async upsert({ where: { key }, create, update }) {
        const existente = filas.get(key);
        const fila: ContadorRegistro = existente
          ? { ...existente, ...update }
          : { id: String(++siguienteId), ...create };
        filas.set(key, fila);
        return fila;
      },
      async update({ where: { key }, data }) {
        const existente = filas.get(key);
        if (!existente) throw new Error("No existe la fila");
        const fila = { ...existente, ...data };
        filas.set(key, fila);
        return fila;
      },
    },
  };
}

const VENTANA_MS = 15 * 60 * 1000;

describe("checkRateLimit", () => {
  it("permite 5 intentos dentro de la ventana con limit: 5", async () => {
    const contador = crearContadorEnMemoria();
    const ahora = new Date("2026-08-08T10:00:00Z");

    for (let i = 0; i < 5; i++) {
      const resultado = await checkRateLimit(
        contador,
        "login:test@x.cl",
        5,
        VENTANA_MS,
        ahora
      );
      expect(resultado.ok).toBe(true);
    }
  });

  it("bloquea el sexto intento dentro de la misma ventana", async () => {
    const contador = crearContadorEnMemoria();
    const ahora = new Date("2026-08-08T10:00:00Z");

    for (let i = 0; i < 5; i++) {
      await checkRateLimit(contador, "login:test@x.cl", 5, VENTANA_MS, ahora);
    }
    const sexto = await checkRateLimit(
      contador,
      "login:test@x.cl",
      5,
      VENTANA_MS,
      ahora
    );

    expect(sexto.ok).toBe(false);
    expect(sexto.retryAfterSec).toBeGreaterThan(0);
  });

  it("reinicia el contador a 1 cuando la ventana ya expiró", async () => {
    const contador = crearContadorEnMemoria();
    const inicio = new Date("2026-08-08T10:00:00Z");

    for (let i = 0; i < 6; i++) {
      await checkRateLimit(contador, "login:test@x.cl", 5, VENTANA_MS, inicio);
    }

    const despuesDeLaVentana = new Date(inicio.getTime() + VENTANA_MS + 1000);
    const resultado = await checkRateLimit(
      contador,
      "login:test@x.cl",
      5,
      VENTANA_MS,
      despuesDeLaVentana
    );

    expect(resultado.ok).toBe(true);
    const fila = await contador.rateLimitCounter.findUnique({
      where: { key: "login:test@x.cl" },
    });
    expect(fila?.count).toBe(1);
  });
});

describe("reiniciarRateLimit", () => {
  it("pone el contador en 0 si existe una fila", async () => {
    const contador = crearContadorEnMemoria();
    await checkRateLimit(contador, "login:ok@x.cl", 5, VENTANA_MS, new Date());

    await reiniciarRateLimit(contador, "login:ok@x.cl");

    const fila = await contador.rateLimitCounter.findUnique({
      where: { key: "login:ok@x.cl" },
    });
    expect(fila?.count).toBe(0);
  });

  it("no lanza si la clave nunca falló (no hay fila)", async () => {
    const contador = crearContadorEnMemoria();
    await expect(
      reiniciarRateLimit(contador, "login:nunca@x.cl")
    ).resolves.not.toThrow();
  });
});
