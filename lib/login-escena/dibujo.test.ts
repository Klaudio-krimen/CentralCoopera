import { it, expect } from "vitest";
import { C } from "./paleta";
import { dibujarFondo } from "./fondo";
import { dibujarOperaria, ELIZABETH } from "./operaria";
import { dibujarLampara, dibujarPalanca } from "./lampara";
import { crearPincel, type Pincel } from "./pincel";
import { crearEstado, transicion, paso, type Fase } from "./maquina";
const colors = new Set<string>([
  ...Object.values(C),
  ...Object.values(ELIZABETH),
  "#141414",
]);
function pincel(): Pincel {
  return {
    rect(x, y, w, h, color) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(320);
      expect(y + h).toBeLessThanOrEqual(180);
      expect(colors.has(color)).toBe(true);
    },
  };
}
it("fondo determinista con disco, rack y ruma de Alba", () => {
  const a = new Uint32Array(320 * 180),
    b = new Uint32Array(a.length);
  dibujarFondo(pincel());
  dibujarFondo(crearPincel(a));
  dibujarFondo(crearPincel(b));
  expect(a).toEqual(b);
  expect(a[94 * 320 + 184] & 0xffffff).toBe(0x4d342a);
});
it.each([
  "OSCURO",
  "ENTRA",
  "BUSCA",
  "ENCIENDE",
  "REVELA",
  "ILUMINADO",
  "MIRA",
  "TAPA_OJOS",
  "ERROR",
  "SENTADA",
  "EXITO",
] as Fase[])("dibuja %s dentro del lienzo", (fase) => {
  const s = paso({ ...crearEstado(true), fase }, 100);
  dibujarOperaria(pincel(), s.ch);
  dibujarLampara(pincel(), s.lamp);
  dibujarPalanca(pincel(), s.lever);
});
it("espeja el torso cuando la operaria se da vuelta", () => {
  const s = transicion(crearEstado(), "SALTAR");
  const collect = (face: number) => {
    const rectangles: number[][] = [];
    dibujarOperaria(
      {
        rect(x, y, w, h, color) {
          if (color === C.vest) rectangles.push([x, y, w, h]);
        },
      },
      { ...s.ch, face }
    );
    return rectangles;
  };
  const normal = collect(1),
    mirror = collect(-1);
  expect(mirror).toEqual(
    normal.map(([x, y, w, h]) => [2 * s.ch.x - x - w + 1, y, w, h])
  );
});
