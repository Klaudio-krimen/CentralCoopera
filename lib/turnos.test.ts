import { describe, it, expect } from "vitest";
import {
  turnosACerrar,
  minutosEnTurno,
  INACTIVIDAD_MS,
  type TurnoAbierto,
} from "./turnos";

const AHORA = new Date("2026-08-15T12:00:00.000Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms);

const turno = (over: Partial<TurnoAbierto> = {}): TurnoAbierto => ({
  id: "t1",
  userId: "u1",
  startedAt: hace(4 * 60 * 60_000), // abierto hace 4 h
  ...over,
});

describe("turnosACerrar", () => {
  it("no cierra un turno cuya última señal es reciente", () => {
    const senales = new Map([["u1", hace(60_000)]]); // hace 1 min
    expect(turnosACerrar([turno()], senales, AHORA)).toEqual([]);
  });

  it("cierra un turno cuya última señal superó el umbral de inactividad", () => {
    const ultima = hace(INACTIVIDAD_MS + 60_000); // 16 min
    const senales = new Map([["u1", ultima]]);

    expect(turnosACerrar([turno()], senales, AHORA)).toEqual([
      { id: "t1", endedAt: ultima },
    ]);
  });

  it("cierra en la hora de la última señal, no en `ahora`", () => {
    // Es la diferencia entre "el turno duró 3 h 44" y "el turno duró 4 h
    // porque nadie miró el mapa hasta ahora".
    const ultima = hace(16 * 60_000);
    const [cierre] = turnosACerrar([turno()], new Map([["u1", ultima]]), AHORA);

    expect(cierre.endedAt).toEqual(ultima);
    expect(cierre.endedAt).not.toEqual(AHORA);
  });

  it("respeta la gracia inicial: un turno recién abierto no se cierra aunque no haya reportado nunca", () => {
    const recien = turno({ startedAt: hace(60_000) }); // abierto hace 1 min
    expect(turnosACerrar([recien], new Map(), AHORA)).toEqual([]);
  });

  it("cierra con duración cero un turno viejo que nunca reportó", () => {
    const inicio = hace(4 * 60 * 60_000);
    const abierto = turno({ startedAt: inicio });

    expect(turnosACerrar([abierto], new Map(), AHORA)).toEqual([
      { id: "t1", endedAt: inicio },
    ]);
  });

  it("ignora una señal anterior al inicio del turno (es de un turno pasado)", () => {
    const inicio = hace(2 * 60 * 60_000);
    const senalVieja = hace(5 * 60 * 60_000); // anterior al turno actual
    const abierto = turno({ startedAt: inicio });

    expect(
      turnosACerrar([abierto], new Map([["u1", senalVieja]]), AHORA)
    ).toEqual([{ id: "t1", endedAt: inicio }]);
  });

  it("evalúa cada chofer por separado", () => {
    const abiertos = [
      turno({ id: "t1", userId: "u1" }),
      turno({ id: "t2", userId: "u2" }),
    ];
    const senales = new Map([
      ["u1", hace(60_000)], // activo
      ["u2", hace(30 * 60_000)], // inactivo
    ]);

    const cierres = turnosACerrar(abiertos, senales, AHORA);
    expect(cierres.map((c) => c.id)).toEqual(["t2"]);
  });

  it("no cierra nada cuando no hay turnos abiertos", () => {
    expect(turnosACerrar([], new Map(), AHORA)).toEqual([]);
  });

  it("cierra un turno cuya señal cae justo en el borde del umbral", () => {
    // El borde es inclusivo: una señal exactamente en el corte ya cuenta como
    // vencida. Fijado acá para que un cambio de `>` a `>=` rompa un test.
    const senales = new Map([["u1", hace(INACTIVIDAD_MS)]]);
    expect(turnosACerrar([turno()], senales, AHORA)).toEqual([
      { id: "t1", endedAt: hace(INACTIVIDAD_MS) },
    ]);
  });
});

describe("minutosEnTurno", () => {
  it("cuenta los minutos enteros transcurridos", () => {
    expect(minutosEnTurno(hace(90 * 60_000), AHORA.getTime())).toBe(90);
  });

  it("nunca devuelve negativos si el reloj del cliente va atrasado", () => {
    const futuro = new Date(AHORA.getTime() + 60_000);
    expect(minutosEnTurno(futuro, AHORA.getTime())).toBe(0);
  });
});
