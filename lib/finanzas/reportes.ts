// Agregación pura sobre filas ya leídas (ver blueprint §5, paso 17). Todo
// entero — el CLP no tiene centavos.

export interface TransaccionParaResumen {
  kind: "INGRESO" | "EGRESO";
  amount: number;
  status: string;
  categoryId: string | null;
  category?: { name: string } | null;
}

export interface ResumenPeriodo {
  ingresos: number;
  egresos: number;
  saldo: number;
}

/** Suma ingresos y egresos ignorando las filas ANULADO. saldo = ingresos − egresos. */
export function resumirPeriodo(
  transacciones: TransaccionParaResumen[]
): ResumenPeriodo {
  let ingresos = 0;
  let egresos = 0;

  for (const t of transacciones) {
    if (t.status === "ANULADO") continue;
    if (t.kind === "INGRESO") {
      ingresos += t.amount;
    } else {
      egresos += t.amount;
    }
  }

  return { ingresos, egresos, saldo: ingresos - egresos };
}

const SIN_CATEGORIA = "Sin categoría";

export interface CategoriaAgrupada {
  categoryId: string | null;
  nombre: string;
  monto: number;
}

/** Suma por categoría, ignorando ANULADO, ordenado de mayor a menor monto.
 *  Las transacciones sin categoryId caen bajo "Sin categoría" en vez de
 *  descartarse. */
export function agruparPorCategoria(
  transacciones: TransaccionParaResumen[]
): CategoriaAgrupada[] {
  const mapa = new Map<string, CategoriaAgrupada>();

  for (const t of transacciones) {
    if (t.status === "ANULADO") continue;

    const clave = t.categoryId ?? "__sin_categoria__";
    const existente = mapa.get(clave);
    if (existente) {
      existente.monto += t.amount;
    } else {
      mapa.set(clave, {
        categoryId: t.categoryId,
        nombre: t.category?.name ?? SIN_CATEGORIA,
        monto: t.amount,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.monto - a.monto);
}
