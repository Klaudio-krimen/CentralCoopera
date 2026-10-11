import { it, expect } from "vitest";
import { C } from "./paleta";
import { crearPincel, type Pincel } from "./pincel";
import { dibujarFondo } from "./fondo";
import { EMBLEMA, ICONO_RECICLAJE, dibujarEmblema } from "./emblema";
import { crearEstado, transicion, paso } from "./maquina";
import { dibujarEmisivos } from "./luz";

const W = 320;
const hex = (c: number) =>
  "#" +
  [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

it("el ícono de reciclaje es una grilla rectangular de 18 columnas", () => {
  expect(
    ICONO_RECICLAJE.every((row) => row.length === 18 && /^[G.]+$/.test(row))
  ).toBe(true);
});

it("pinta el emblema dentro del lienzo y sólo con colores de la paleta", () => {
  const allowed = new Set<string>(Object.values(C));
  for (const neon of [false, true]) {
    const p: Pincel = {
      rect(x, y, w, h, color) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(W);
        expect(y + h).toBeLessThanOrEqual(180);
        expect(allowed.has(color)).toBe(true);
      },
    };
    dibujarEmblema(p, neon);
  }
});

it("el fondo incluye el círculo azul, el ícono verde y COOPERAPRO", () => {
  const px = new Uint32Array(W * 180);
  dibujarFondo(crearPincel(px));
  const at = (x: number, y: number) => hex(px[y * W + x]);
  const { cx, cy } = EMBLEMA;
  expect(at(cx - 15, cy + 12)).toBe(C.brandBlue); // relleno del círculo
  const ix = cx - 9,
    iy = cy - 16;
  expect(at(ix + 8, iy)).toBe(C.brandGreen); // punta superior del ícono
  const colores = new Set<string>();
  for (let y = cy + 2; y < cy + 7; y++)
    for (let x = cx - 20; x < cx + 20; x++) colores.add(at(x, y));
  expect(colores.has(C.brandCream)).toBe(true); // COOPERA
  expect(colores.has(C.brandGreen)).toBe(true); // PRO
});

it("en EXITO, el barrido de luces enciende el emblema en modo neón", () => {
  let s = transicion(crearEstado(false, true), "EXITO");
  s = paso(s, 800);
  const neon: string[] = [];
  dibujarEmisivos(
    {
      rect: (_x, _y, _w, _h, color) => {
        neon.push(color);
      },
    },
    s,
    { x: 0, y: 0 }
  );
  expect(s.light.sweep).toBeGreaterThan(EMBLEMA.cx + EMBLEMA.r);
  expect(neon).toContain(C.neon);
});

it("antes del éxito el emblema no brilla", () => {
  const s = transicion(crearEstado(false, true), "SALTAR");
  const colores: string[] = [];
  dibujarEmisivos(
    {
      rect: (_x, _y, _w, _h, color) => {
        colores.push(color);
      },
    },
    s,
    { x: 0, y: 0 }
  );
  expect(colores).not.toContain(C.neon);
});
