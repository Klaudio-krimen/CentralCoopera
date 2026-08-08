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
      update: { count: number; windowStart: Date };
    }): Promise<ContadorRegistro>;
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
  const fila = await contador.rateLimitCounter.findUnique({ where: { key } });

  const ventanaExpirada =
    !fila || ahora.getTime() - fila.windowStart.getTime() >= windowMs;

  if (ventanaExpirada) {
    await contador.rateLimitCounter.upsert({
      where: { key },
      create: { key, count: 1, windowStart: ahora },
      update: { count: 1, windowStart: ahora },
    });
    return { ok: true, retryAfterSec: 0 };
  }

  const nuevoConteo = fila.count + 1;
  if (nuevoConteo > limit) {
    const restanteMs =
      windowMs - (ahora.getTime() - fila.windowStart.getTime());
    return { ok: false, retryAfterSec: Math.ceil(restanteMs / 1000) };
  }

  await contador.rateLimitCounter.upsert({
    where: { key },
    create: { key, count: nuevoConteo, windowStart: fila.windowStart },
    update: { count: nuevoConteo, windowStart: fila.windowStart },
  });

  return { ok: true, retryAfterSec: 0 };
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
