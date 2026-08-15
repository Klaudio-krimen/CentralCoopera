import type { PrismaClient, Shift } from "@prisma/client";
import { turnosACerrar, type TurnoAbierto } from "./turnos";

/**
 * Acceso a base para turnos. Separado de `lib/turnos.ts` a propósito: aquel es
 * puro y testeable, éste toca Prisma y por eso no puede importarse desde un
 * `*.test.ts` (vitest corre sin base).
 */

/**
 * Cierra los turnos que dejaron de reportar posición y devuelve cuántos cerró.
 *
 * No hay cron: esto se llama desde los dos endpoints que ya se consultan solos
 * — el mapa de Operaciones (cada 15 s mientras alguien lo mira) y el panel del
 * chofer (cada 60 s mientras tiene la app abierta). Un turno colgado se cierra
 * la próxima vez que cualquiera de los dos consulte, que en la práctica es
 * dentro del minuto. Es idempotente: si no hay nada que cerrar no escribe.
 */
export async function cerrarTurnosInactivos(
  db: PrismaClient,
  ahora: Date = new Date()
): Promise<number> {
  const abiertos: TurnoAbierto[] = await db.shift.findMany({
    where: { endedAt: null },
    select: { id: true, userId: true, startedAt: true },
  });
  if (abiertos.length === 0) return 0;

  // Array.from y no [...Set]: el `target` de tsconfig.json no permite iterar un
  // Set con spread sin --downlevelIteration.
  const userIds = Array.from(new Set(abiertos.map((t) => t.userId)));
  const trackers = await db.tracker.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });

  const ultimaSenalPorUsuario = new Map<string, Date>();
  if (trackers.length > 0) {
    // `distinct` + orderBy desc → la primera fila por trackerId es la más
    // reciente. Mismo patrón que /api/posiciones/activas.
    const ultimas = await db.position.findMany({
      where: { trackerId: { in: trackers.map((t) => t.id) } },
      distinct: ["trackerId"],
      orderBy: [{ trackerId: "asc" }, { recordedAt: "desc" }],
      select: { trackerId: true, recordedAt: true },
    });

    const porTracker = new Map(ultimas.map((p) => [p.trackerId, p.recordedAt]));
    for (const t of trackers) {
      const senal = porTracker.get(t.id);
      if (t.userId && senal) ultimaSenalPorUsuario.set(t.userId, senal);
    }
  }

  const cierres = turnosACerrar(abiertos, ultimaSenalPorUsuario, ahora);
  if (cierres.length === 0) return 0;

  // `updateMany` no sirve: cada turno cierra en su propia última señal.
  await db.$transaction(
    cierres.map((c) =>
      db.shift.update({
        where: { id: c.id },
        data: { endedAt: c.endedAt, endedReason: "INACTIVIDAD" },
      })
    )
  );

  return cierres.length;
}

/** El turno abierto del usuario, o `null`. No cierra nada por su cuenta. */
export function turnoAbiertoDe(
  db: PrismaClient,
  userId: string
): Promise<Shift | null> {
  return db.shift.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}
