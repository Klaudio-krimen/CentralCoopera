// RUT chileno: normalización, dígito verificador (módulo 11) y formato.

export function normalizarRut(entrada: string): string {
  const limpio = entrada.replace(/[.\s-]/g, "").toUpperCase();
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
}

/** Módulo 11 con serie cíclica 2-3-4-5-6-7, de derecha a izquierda. */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function esRutValido(rut: string): boolean {
  const normalizado = normalizarRut(rut);
  const [cuerpo, dv] = normalizado.split("-");
  if (!cuerpo || !dv || !/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === dv;
}

/** Con puntos, para mostrar: "12345678-9" → "12.345.678-9". */
export function formatearRut(rut: string): string {
  const normalizado = normalizarRut(rut);
  const [cuerpo, dv] = normalizado.split("-");
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoConPuntos}-${dv}`;
}

/** "12345678-9" → "12.345.***-*". Enmascara el último grupo del cuerpo y el DV. */
export function enmascararRut(rut: string): string {
  const formateado = formatearRut(rut);
  const [cuerpoFormateado, dv] = formateado.split("-");
  const grupos = cuerpoFormateado.split(".");
  grupos[grupos.length - 1] = "*".repeat(grupos[grupos.length - 1].length);
  return `${grupos.join(".")}-${"*".repeat(dv.length)}`;
}
