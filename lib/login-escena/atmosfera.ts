/** Geometría y ruido deterministas del acabado Alba; sin DOM, reloj ni estado global. */
export const HAZ = [
  [22, 48],
  [62, 48],
  [62 + 94 * 0.85, 142],
  [22 + 94 * 0.55, 142],
] as const;
export interface Mota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fase: number;
}
const limitar = (valor: number) => Math.max(0, Math.min(1, valor));
const envolver = (valor: number, ancho: number) =>
  ((valor % ancho) + ancho) % ancho;
export function intensidadRayo(alba: number) {
  const t = limitar((alba - 0.3) / 0.7);
  return t * t * (3 - 2 * t);
}
export function intensidadHaz(x: number, y: number) {
  if (y < 48 || y > 142) return 0;
  const izquierda = 22 + (y - 48) * 0.55;
  const derecha = 62 + (y - 48) * 0.85;
  if (x <= izquierda || x >= derecha) return 0;
  return (
    limitar(Math.min(1, (x - izquierda) / 6, (derecha - x) / 6)) *
    (1 - (y - 48) / 110)
  );
}
export function crearMotas(cantidad = 90): readonly Mota[] {
  let semilla = 11;
  const random = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: cantidad }, () => ({
    x: 22 + random() * 120,
    y: 48 + random() * 94,
    vx: (random() - 0.5) * 2,
    vy: -0.6 - random() * 1.2,
    fase: random() * Math.PI * 2,
  }));
}
/** Una posición por reloj, sin acumulación: resize y frames saltados no cambian el polvo. */
export function xMota(mota: Mota, reloj: number) {
  const t = reloj / 1000;
  return (
    22 +
    envolver(
      mota.x -
        22 +
        mota.vx * 0.6 * t +
        (Math.sin(mota.fase + t / 0.9) - Math.sin(mota.fase)) * 0.72,
      120
    )
  );
}
export function yMota(mota: Mota, reloj: number) {
  return 48 + envolver(mota.y - 48 + mota.vy * reloj * 0.0008, 94);
}
export function brilloMota(mota: Mota, reloj: number) {
  return 0.55 + 0.45 * Math.sin((mota.fase + reloj / 900) * 2.3);
}
export function pulsoRayo(indice: number, reloj: number) {
  // El período menor es 1.9 s; ningún haz produce destellos rápidos.
  return (
    0.55 +
    0.45 *
      Math.sin((reloj * Math.PI * 2) / (1900 + indice * 370) + indice * 2.1)
  );
}
export function debeRecachear(
  escala: number,
  alba: number,
  escalaAnterior: number,
  albaAnterior: number
) {
  return (
    escala !== escalaAnterior ||
    !Number.isFinite(albaAnterior) ||
    Math.abs(alba - albaAnterior) >= 0.02 - 1e-9 ||
    (alba === 1 && albaAnterior !== 1)
  );
}
export function crearGrano(lado = 256): Uint8Array {
  const valores = new Uint8Array(lado * lado);
  let semilla = 99;
  for (let i = 0; i < valores.length; i++) {
    semilla = (semilla * 16807) % 2147483647;
    valores[i] = Math.floor((semilla / 2147483647) * 255);
  }
  return valores;
}
