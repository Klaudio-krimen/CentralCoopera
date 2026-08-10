// Interpreta la planilla Excel real de bodega (NUMERO · NOMBRE · MARCA-DETALLES ·
// FORMATO · COLOR · LITROS · METROS · KILOS · CANTIDAD · NUEVO · USADO ·
// COMENTARIO) hacia el modelo InventoryItem. Funciones puras, sin Prisma —
// vitest.config.ts sólo recoge lib/**/*.test.ts, así que esto es lo único
// verificable con el arnés de este repo.

export type MeasureUnit = "LITROS" | "METROS" | "KILOS";
export type Condition = "NUEVO" | "USADO";

export interface CantidadParseada {
  quantity: number;
  fillPercent: number | null;
}

export interface MedidaParseada {
  measureValue: number | null;
  measureUnit: MeasureUnit | null;
}

/** El literal que Apify/planillas usan como nulo en este repo — nunca string vacío. */
const SIN_DATO = "sin dato";

/** Normaliza celdas vacías o el literal "sin dato" a null. Recorta espacios. */
export function normalizarCelda(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const limpio = raw.trim();
  if (limpio === "" || limpio.toLowerCase() === SIN_DATO) return null;
  return limpio;
}

/**
 * CANTIDAD mezcla dos magnitudes en la planilla real:
 *  - un conteo de unidades ("1" taladro)
 *  - cuánto queda de un envase abierto ("80%", "25%")
 * Un tarro al 80% es 1 tarro, 80% lleno — nunca 0.8 unidades.
 */
export function parseCantidad(
  raw: string | null | undefined
): CantidadParseada {
  const celda = normalizarCelda(raw);
  if (celda === null) return { quantity: 0, fillPercent: null };

  const match = celda.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
  if (match) {
    const pct = Math.round(parseFloat(match[1].replace(",", ".")));
    return { quantity: 1, fillPercent: Math.min(100, Math.max(0, pct)) };
  }

  const num = parseFloat(celda.replace(",", "."));
  if (isNaN(num)) return { quantity: 0, fillPercent: null };
  return { quantity: num, fillPercent: null };
}

/**
 * LITROS/METROS/KILOS describen el formato del envase, no el stock: un tarro
 * *es* de 3,7 L. La planilla nunca llena más de una de las tres columnas.
 * Acepta coma decimal chilena ("3,7").
 */
export function parseMedida(
  litros: string | null | undefined,
  metros: string | null | undefined,
  kilos: string | null | undefined
): MedidaParseada {
  const candidatos: [string | null, MeasureUnit][] = [
    [normalizarCelda(litros), "LITROS"],
    [normalizarCelda(metros), "METROS"],
    [normalizarCelda(kilos), "KILOS"],
  ];

  for (const [celda, unidad] of candidatos) {
    if (celda === null) continue;
    const num = parseFloat(celda.replace(",", "."));
    if (!isNaN(num)) return { measureValue: num, measureUnit: unidad };
  }

  return { measureValue: null, measureUnit: null };
}

/**
 * NUEVO/USADO no siempre viene marcado en la planilla real (herramientas
 * sueltas sin ninguna de las dos). Admite el tercer estado: sin definir.
 */
export function parseCondicion(
  nuevo: string | null | undefined,
  usado: string | null | undefined
): Condition | null {
  const esNuevo = normalizarCelda(nuevo) !== null;
  const esUsado = normalizarCelda(usado) !== null;
  if (esNuevo && !esUsado) return "NUEVO";
  if (esUsado && !esNuevo) return "USADO";
  // Ambas marcadas o ninguna: dato contradictorio o ausente, no se adivina.
  return null;
}

const SINONIMOS: Record<string, string[]> = {
  numero: ["numero", "número", "n", "n°", "nro"],
  name: ["nombre"],
  details: ["marca-detalles", "marca detalles", "marca", "detalle", "detalles"],
  format: ["formato"],
  color: ["color"],
  litros: ["litros"],
  metros: ["metros"],
  kilos: ["kilos", "kg"],
  cantidad: ["cantidad"],
  nuevo: ["nuevo"],
  usado: ["usado"],
  notes: ["comentario", "comentarios", "notas", "observacion", "observaciones"],
};

// Filtra los diacríticos combinados (U+0300–U+036F) tras normalizar a NFD.
// Sin regex con flag "u" ni for-of sobre iterador: tsconfig.json de este repo
// no fija `target`, que por defecto tsc resuelve a ES3.
function despojarAcentos(s: string): string {
  const descompuesto = s.normalize("NFD");
  let resultado = "";
  for (let i = 0; i < descompuesto.length; i++) {
    const code = descompuesto.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) resultado += descompuesto[i];
  }
  return resultado;
}

/**
 * Mapea cabeceras de la planilla (case/acento/orden libres) a las claves
 * internas usadas por el resto de este módulo. Cabecera no reconocida → null
 * en esa posición, se ignora en vez de romper la importación completa.
 */
export function mapearCabeceras(headers: string[]): (string | null)[] {
  return headers.map((h) => {
    const normalizada = despojarAcentos(h.trim().toLowerCase());
    for (const [clave, alias] of Object.entries(SINONIMOS)) {
      if (alias.some((a) => despojarAcentos(a) === normalizada)) return clave;
    }
    return null;
  });
}
