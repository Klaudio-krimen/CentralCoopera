// Cálculo puro del líquido a pagar (ver blueprint §5, paso 15). Entero en
// todas sus líneas — el CLP no tiene centavos, nunca punto flotante.

export interface EntradaLiquido {
  grossAmount: number;
  afpAmount: number;
  healthAmount: number;
  otherDeductions: number;
  advancesApplied: number;
}

/** Resta las cuatro deducciones al bruto. Nunca devuelve un negativo: si las
 *  deducciones superan al bruto, devuelve 0 y el llamador decide qué hacer. */
export function calcularLiquido(entrada: EntradaLiquido): number {
  const liquido =
    entrada.grossAmount -
    entrada.afpAmount -
    entrada.healthAmount -
    entrada.otherDeductions -
    entrada.advancesApplied;

  return Math.max(0, liquido);
}

export function totalizarNomina(items: EntradaLiquido[]): {
  totalGross: number;
  totalNet: number;
} {
  return items.reduce(
    (acc, item) => ({
      totalGross: acc.totalGross + item.grossAmount,
      totalNet: acc.totalNet + calcularLiquido(item),
    }),
    { totalGross: 0, totalNet: 0 }
  );
}
