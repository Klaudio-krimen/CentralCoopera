import { expect, it } from "vitest";
import { dibujarOperaria, ELIZABETH } from "./operaria";
import { crearEstado, transicion } from "./maquina";

it("conserva melena larga y visos al espejarse, sin modificar la pose", () => {
  const pose = transicion(crearEstado(false, true), "FOCO_CORREO").ch;
  const original = structuredClone(pose);
  const collect = (face: number) => {
    const hair: number[][] = [];
    dibujarOperaria(
      {
        rect(x, y, w, h, color) {
          if ((Object.values(ELIZABETH) as string[]).includes(color))
            hair.push([x, y, w, h]);
        },
      },
      { ...pose, face }
    );
    return hair;
  };
  const normal = collect(1);
  expect(normal.length).toBeGreaterThan(5);
  expect(Math.max(...normal.map(([, y, , h]) => y + h))).toBeGreaterThan(135);
  expect(collect(-1)).toEqual(
    normal.map(([x, y, w, h]) => [2 * Math.round(pose.x) - x - w + 1, y, w, h])
  );
  expect(pose).toEqual(original);
});
