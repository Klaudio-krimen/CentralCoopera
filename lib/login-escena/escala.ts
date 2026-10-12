export const WIDTH = 320,
  HEIGHT = 180;
export const DISCO = { cx: 184, cy: 94, r: 50 } as const;
/** Área útil de 60×64; las cuatro esquinas quedan dentro del radio seguro 44. */
export const FORMULARIO = {
  x: DISCO.cx - 30,
  y: DISCO.cy - 32,
  w: 60,
  h: 64,
} as const;
export function calcularEscala(width: number, height: number) {
  const escala = Math.max(
    3,
    Math.min(Math.floor(width / WIDTH), Math.floor(height / HEIGHT))
  );
  return {
    escala,
    width: WIDTH * escala,
    height: HEIGHT * escala,
    left: Math.max(0, (width - WIDTH * escala) / 2),
    top: Math.max(0, (height - HEIGHT * escala) / 2),
    formulario: {
      left: FORMULARIO.x * escala,
      top: FORMULARIO.y * escala,
      width: FORMULARIO.w * escala,
      height: FORMULARIO.h * escala,
    },
  };
}
