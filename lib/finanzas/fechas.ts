// Filtros de calendario: rango inclusivo, sin fechas normalizadas silenciosamente.
export function rangoFechas(desde?: string | null, hasta?: string | null) {
  function fecha(valor: string, fin: boolean): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new Error("Fecha inválida");
    const parsed = new Date(`${valor}T00:00:00.000Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== valor
    )
      throw new Error("Fecha inválida");
    if (fin) parsed.setUTCHours(23, 59, 59, 999);
    return parsed;
  }
  const gte = desde ? fecha(desde, false) : undefined;
  const lte = hasta ? fecha(hasta, true) : undefined;
  if (gte && lte && gte > lte)
    throw new Error("El rango de fechas no es válido");
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}
