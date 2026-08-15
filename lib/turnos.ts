/**
 * Lógica pura de turnos de chofer. Sin Prisma, sin `process.env`, sin `@/`:
 * `vitest.config.ts` sólo recoge `lib/**\/*.test.ts` y no resuelve el alias
 * `@/`, así que todo lo que deba poder probarse vive acá y recibe sus datos
 * por parámetro. El acceso a la base está en `lib/turnos-server.ts`.
 */

/**
 * Sin señal por más de este tiempo, el turno se cierra solo.
 *
 * `usePositionPing` envía cada 90 s, así que 15 min son diez pings perdidos:
 * suficiente para descartar un túnel, una calle sin cobertura o la pantalla
 * apagada un rato, y poco para que un teléfono sin batería quede colgado en el
 * mapa toda la tarde.
 */
export const INACTIVIDAD_MS = 15 * 60_000;

export interface TurnoAbierto {
  id: string;
  userId: string;
  startedAt: Date;
}

export interface CierrePendiente {
  id: string;
  endedAt: Date;
}

/**
 * Decide qué turnos abiertos deben cerrarse por inactividad.
 *
 * No cierra "ahora" sino en la última señal real: el turno terminó de hecho
 * cuando el teléfono dejó de reportar, no cuando alguien abrió el mapa y
 * disparó la revisión. Sin eso, la duración de un turno dependería de a qué
 * hora se asomó Operaciones a mirar.
 */
export function turnosACerrar(
  abiertos: TurnoAbierto[],
  ultimaSenalPorUsuario: Map<string, Date>,
  ahora: Date = new Date()
): CierrePendiente[] {
  const corte = new Date(ahora.getTime() - INACTIVIDAD_MS);
  const cierres: CierrePendiente[] = [];

  for (const turno of abiertos) {
    // Gracia: un turno recién abierto todavía no alcanzó a mandar su primer
    // ping. Cerrarlo acá lo mataría antes de que el GPS despierte.
    if (turno.startedAt > corte) continue;

    const ultima = ultimaSenalPorUsuario.get(turno.userId);
    if (ultima && ultima > corte) continue;

    // Una señal anterior al inicio del turno es de un turno pasado: el chofer
    // abrió turno y nunca reportó. En ese caso el turno duró cero.
    const endedAt =
      ultima && ultima > turno.startedAt ? ultima : turno.startedAt;
    cierres.push({ id: turno.id, endedAt });
  }

  return cierres;
}

/** Duración en minutos enteros de un turno abierto, para mostrarla al chofer. */
export function minutosEnTurno(
  startedAt: Date | string,
  ahora: number = Date.now()
): number {
  return Math.max(
    0,
    Math.floor((ahora - new Date(startedAt).getTime()) / 60_000)
  );
}
