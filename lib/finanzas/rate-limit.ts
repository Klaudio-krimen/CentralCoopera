// Rate limiting de ventana fija sobre Postgres (RateLimitCounter), no en
// memoria ni Redis: en Vercel las instancias se reutilizan y se reinician
// sin aviso, así que un contador en memoria de proceso no es un límite real.

export interface ContadorRegistro {
  id: string;
  key: string;
  count: number;
  windowStart: Date;
}

export interface ClienteContador {
  rateLimitCounter: {
    findUnique(args: {
      where: { key: string };
    }): Promise<ContadorRegistro | null>;
    upsert(args: {
      where: { key: string };
      create: { key: string; count: number; windowStart: Date };
      update: {
        count: number | { increment: number };
        windowStart?: Date;
      };
    }): Promise<ContadorRegistro>;
    updateMany(args: {
      where: { key: string; windowStart: { lte: Date } };
      data: { count: number; windowStart: Date };
    }): Promise<{ count: number }>;
    update(args: {
      where: { key: string };
      data: { count: number; windowStart: Date };
    }): Promise<ContadorRegistro>;
  };
}

export interface ResultadoRateLimit {
  ok: boolean;
  retryAfterSec: number;
}

/** Ventana fija: si `ahora - windowStart >= windowMs` el contador se
 *  reinicia a 1; si no, incrementa. `ahora` es opcional para poder testear
 *  el cruce de ventana sin esperar de verdad. */
export async function checkRateLimit(
  contador: ClienteContador,
  key: string,
  limit: number,
  windowMs: number,
  ahora: Date = new Date()
): Promise<ResultadoRateLimit> {
  const limiteVentana = new Date(ahora.getTime() - windowMs);
  const reiniciada = await contador.rateLimitCounter.updateMany({
    where: { key, windowStart: { lte: limiteVentana } },
    data: { count: 1, windowStart: ahora },
  });

  if (reiniciada.count > 0) {
    return { ok: true, retryAfterSec: 0 };
  }

  const fila = await contador.rateLimitCounter.upsert({
    where: { key },
    create: { key, count: 1, windowStart: ahora },
    update: { count: { increment: 1 } },
  });

  const retryAfterSec = Math.max(
    0,
    Math.ceil(
      (windowMs - (ahora.getTime() - fila.windowStart.getTime())) / 1000
    )
  );
  return fila.count <= limit
    ? { ok: true, retryAfterSec: 0 }
    : { ok: false, retryAfterSec };
}

/** Reinicia el contador de una clave tras un intento exitoso. No hace nada
 *  si la clave nunca falló (no hay fila que reiniciar). */
export async function reiniciarRateLimit(
  contador: ClienteContador,
  key: string
): Promise<void> {
  const fila = await contador.rateLimitCounter.findUnique({ where: { key } });
  if (!fila) return;

  await contador.rateLimitCounter.update({
    where: { key },
    data: { count: 0, windowStart: new Date() },
  });
}
