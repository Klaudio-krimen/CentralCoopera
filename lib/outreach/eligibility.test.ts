import { describe, it, expect } from "vitest";
import {
  allocateDailyBudget,
  pickCompanyContact,
  isCompanyPhoneManaged,
} from "./eligibility";

const sum = (o: Record<string, number>): number =>
  Object.values(o).reduce((s, n) => s + n, 0);

describe("allocateDailyBudget", () => {
  const caps = (ids: string[], cap = 25) =>
    ids.map((id) => ({ id, dailyCap: cap }));

  it("reparte proporcional al pool: pools 60/10/5, globalCap 25 → suma ≤ 25 y 'a' recibe estrictamente más", () => {
    // Acceptance E2-T2 #1.
    const out = allocateDailyBudget(
      caps(["a", "b", "c"]),
      { a: 60, b: 10, c: 5 },
      25
    );
    expect(sum(out)).toBeLessThanOrEqual(25);
    expect(out.a).toBeGreaterThan(out.b);
    expect(out.a).toBeGreaterThan(out.c);
  });

  it("una campaña con pool 0 recibe 0 y su cuota va a las demás", () => {
    // Acceptance E2-T2 #2.
    const out = allocateDailyBudget(
      caps(["a", "b", "c"]),
      { a: 20, b: 0, c: 20 },
      25
    );
    expect(out.b).toBe(0);
    expect(sum(out)).toBe(25);
    expect(out.a + out.c).toBe(25);
  });

  it("si Σpools ≤ globalCap y nadie llega a su dailyCap, cada campaña toma exactamente su pool", () => {
    // Acceptance E2-T2 #3.
    const out = allocateDailyBudget(
      caps(["a", "b", "c"]),
      { a: 3, b: 4, c: 5 },
      25
    );
    expect(out).toEqual({ a: 3, b: 4, c: 5 });
  });

  it("nunca asigna más que el dailyCap de la campaña", () => {
    const out = allocateDailyBudget(
      [
        { id: "a", dailyCap: 10 },
        { id: "b", dailyCap: 25 },
      ],
      { a: 100, b: 0 },
      50
    );
    expect(out.a).toBeLessThanOrEqual(10);
    expect(out.b).toBe(0);
    expect(sum(out)).toBe(10); // min(50, 100, min(10,100)+min(25,0)) = 10
  });

  it("la suma es min(globalCap, Σpools, Σ min(dailyCap,pool)) y se reparte el remanente por redondeo", () => {
    const out = allocateDailyBudget(
      caps(["a", "b", "c"]),
      { a: 60, b: 10, c: 5 },
      25
    );
    // total 75 > 25; floors 20/3/1 = 24; +1 al de mayor pool restante (a).
    expect(out).toEqual({ a: 21, b: 3, c: 1 });
  });

  it("globalCap 0 o sin campañas → todo 0 / objeto vacío", () => {
    expect(allocateDailyBudget(caps(["a", "b"]), { a: 5, b: 5 }, 0)).toEqual({
      a: 0,
      b: 0,
    });
    expect(allocateDailyBudget([], {}, 25)).toEqual({});
  });

  it("todos los pools en 0 → todo 0", () => {
    expect(allocateDailyBudget(caps(["a", "b"]), { a: 0, b: 0 }, 25)).toEqual({
      a: 0,
      b: 0,
    });
  });

  it("empate de pool restante → +1 a la primera del array (determinista)", () => {
    const out = allocateDailyBudget(
      caps(["a", "b", "c"]),
      { a: 20, b: 0, c: 20 },
      25
    );
    // floors 12/0/12 = 24; +1; a y c empatan en pool restante → gana 'a'.
    expect(out).toEqual({ a: 13, b: 0, c: 12 });
  });
});

describe("pickCompanyContact", () => {
  const d = (iso: string) => new Date(iso);

  it("prefiere la casilla genérica aunque sea más nueva que una nominativa vieja", () => {
    // Acceptance E2-T2 #4 (parte 1).
    const id = pickCompanyContact([
      { id: "g", email: "info@x.cl", createdAt: d("2026-05-01") },
      { id: "n", email: "juan.perez@x.cl", createdAt: d("2020-01-01") },
    ]);
    expect(id).toBe("g");
  });

  it("entre varias genéricas gana la más antigua", () => {
    const id = pickCompanyContact([
      { id: "g2", email: "ventas@x.cl", createdAt: d("2026-02-01") },
      { id: "g1", email: "contacto@x.cl", createdAt: d("2025-01-01") },
      { id: "n", email: "ana@x.cl", createdAt: d("2019-01-01") },
    ]);
    expect(id).toBe("g1");
  });

  it("sin ninguna genérica, gana el contacto de menor createdAt", () => {
    // Acceptance E2-T2 #4 (parte 2).
    const id = pickCompanyContact([
      { id: "nueva", email: "ana@x.cl", createdAt: d("2026-01-01") },
      { id: "vieja", email: "beto@x.cl", createdAt: d("2021-01-01") },
    ]);
    expect(id).toBe("vieja");
  });

  it("empate exacto de createdAt → el primero del array", () => {
    const id = pickCompanyContact([
      { id: "primero", email: "a@x.cl", createdAt: d("2026-01-01T00:00:00Z") },
      { id: "segundo", email: "b@x.cl", createdAt: d("2026-01-01T00:00:00Z") },
    ]);
    expect(id).toBe("primero");
  });

  it("lista vacía → null", () => {
    expect(pickCompanyContact([])).toBeNull();
  });

  it("el match de prefijo genérico es sobre la parte local completa y case-insensitive", () => {
    expect(
      pickCompanyContact([
        { id: "x", email: "INFO@x.cl", createdAt: d("2026-01-01") },
        { id: "y", email: "z@x.cl", createdAt: d("2000-01-01") },
      ])
    ).toBe("x");
    // "ventas.pallets" no es exactamente un prefijo genérico → nominativa.
    expect(
      pickCompanyContact([
        { id: "n", email: "ventas.pallets@x.cl", createdAt: d("2026-01-01") },
        { id: "v", email: "otro@x.cl", createdAt: d("2000-01-01") },
      ])
    ).toBe("v");
  });
});

describe("isCompanyPhoneManaged", () => {
  it("true si algún contacto tiene callStatus distinto de null y de POR_LLAMAR", () => {
    // Acceptance E2-T2 #5.
    expect(isCompanyPhoneManaged([{ callStatus: "LLAMADA" }])).toBe(true);
    expect(
      isCompanyPhoneManaged([
        { callStatus: null },
        { callStatus: "SIN_RESPUESTA" },
      ])
    ).toBe(true);
    expect(isCompanyPhoneManaged([{ callStatus: "CORREO_CONSEGUIDO" }])).toBe(
      true
    );
  });

  it("false si todos son null y/o POR_LLAMAR, y false para lista vacía", () => {
    expect(
      isCompanyPhoneManaged([
        { callStatus: null },
        { callStatus: "POR_LLAMAR" },
      ])
    ).toBe(false);
    expect(isCompanyPhoneManaged([])).toBe(false);
  });
});
