import { describe, it, expect } from "vitest";
import {
  crearEstado,
  transicion,
  paso,
  INTRO,
  HOME,
  SEAT,
  SUCCESS_MS,
  type EstadoEscena,
  type Fase,
} from "./maquina";
function avanzar(state: EstadoEscena, milliseconds: number) {
  for (let t = 0; t < milliseconds; t += 20)
    state = paso(state, Math.min(20, milliseconds - t));
  return state;
}
describe("guion de la escena", () => {
  it("recorre todas las fases del prototipo en 5,26 s y 1,42 s", () => {
    for (const [first, duration] of [
      [true, 5260],
      [false, 1420],
    ] as const) {
      let s = crearEstado(first);
      const visited = new Set<Fase>();
      for (let t = 0; t <= duration; t += 20) {
        visited.add(s.fase);
        s = paso(s, 20);
      }
      expect(s.fase).toBe("ILUMINADO");
      expect(s.formOp).toBe(1);
      expect(visited.has("ENCIENDE")).toBe(true);
      expect(visited.has("ENTRA")).toBe(first);
      expect(visited.has("BUSCA")).toBe(first);
    }
  });
  it.each(Array.from(INTRO))(
    "salta %s y respeta el foco sin esperar",
    (fase) => {
      const s = { ...crearEstado(true), fase };
      expect(transicion(s, "SALTAR").fase).toBe("ILUMINADO");
      const email = transicion(s, "FOCO_CORREO");
      expect(email.fase).toBe("MIRA");
      expect(email.ch.x).toBe(HOME);
      const password = transicion(s, "FOCO_CLAVE");
      expect(password.fase).toBe("TAPA_OJOS");
      expect(password.ch.face).toBe(-1);
      expect(password.formOp).toBe(1);
      expect(password.ch.torch).toBe(false);
    }
  );
  it("vuelve al foco después del error, incluso con blur intermedio", () => {
    let s = transicion(crearEstado(), "FOCO_CLAVE");
    s = transicion(s, "ERROR");
    expect(avanzar(s, 1200).fase).toBe("TAPA_OJOS");
    expect(avanzar(transicion(s, "BLUR"), 1200).fase).toBe("ILUMINADO");
  });
  it("se sienta a los 30 s y actividad/foco la despiertan", () => {
    let s = transicion(crearEstado(), "FOCO_CORREO");
    expect(avanzar(s, 29980).fase).toBe("MIRA");
    s = avanzar(s, 30000);
    expect(s.fase).toBe("SENTADA");
    s = avanzar(s, 1500);
    expect(s.ch.sit).toBe(true);
    expect(transicion(s, "ACTIVIDAD").fase).toBe("MIRA");
    expect(transicion(s, "FOCO_CLAVE").fase).toBe("TAPA_OJOS");
  });
  it("éxito es terminal, enciende los tubos dentro del plazo de navegación", () => {
    const success = transicion(crearEstado(true), "EXITO");
    expect(transicion(success, "ERROR")).toBe(success);
    expect(transicion(success, "FOCO_CLAVE")).toBe(success);
    const s = avanzar(success, SUCCESS_MS);
    expect(SUCCESS_MS).toBeLessThanOrEqual(800);
    expect(s.light.sweep).toBe(330);
    expect(s.lever).toBe(1);
  });
  it("movimiento reducido: ilumina y cambia poses sin oscilación ni flashes", () => {
    let s = crearEstado(true, true);
    expect(s.fase).toBe("ILUMINADO");
    expect(s.light.I).toBe(1);
    s = transicion(s, "FOCO_CLAVE");
    expect(s.ch.face).toBe(-1);
    expect(s.ch.bob).toBe(0);
    s = transicion(s, "ERROR");
    expect(s.light.I).toBe(1);
    expect(s.lamp.a).toBe(0);
    expect(transicion(s, "EXITO").light.sweep).toBe(330);
  });
  it("no modifica el estado recibido ni necesita DOM", () => {
    const original = crearEstado(true),
      snapshot = structuredClone(original);
    paso(original, 100);
    transicion(original, "FOCO_CLAVE");
    expect(original).toEqual(snapshot);
  });
  it("se sienta en el único dibujo del temporizador con movimiento reducido", () => {
    const state = paso(crearEstado(false, true), 30000);
    expect(state.fase).toBe("SENTADA");
    expect(state.ch.x).toBe(SEAT);
    expect(state.ch.sit).toBe(true);
    expect(state.ch.head).toBe("down");
    expect(transicion(state, "FOCO_CLAVE").ch.sit).toBe(false);
  });
  it("el encendido tiene como máximo dos flashes completos y el error uno", () => {
    let s = { ...crearEstado(true), fase: "ENCIENDE" as const },
      previous = 1,
      flashes = 0;
    for (let i = 0; i < 700; i += 20) {
      s = paso(s, 20) as typeof s;
      if (previous < s.light.I) flashes++;
      previous = s.light.I;
    }
    expect(flashes).toBeLessThanOrEqual(2);
  });
});
