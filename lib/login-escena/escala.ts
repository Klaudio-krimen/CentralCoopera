export const WIDTH = 320,
  HEIGHT = 180;
export const CARTEL = { x: 221, y: 28, w: 82, h: 102 } as const;
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
      left: CARTEL.x * escala,
      top: CARTEL.y * escala,
      width: CARTEL.w * escala,
      height: CARTEL.h * escala,
    },
  };
}
