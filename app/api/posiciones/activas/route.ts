import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import { INACTIVIDAD_MS } from "@/lib/turnos";
import { cerrarTurnosInactivos } from "@/lib/turnos-server";

// GET /api/posiciones/activas — quién está en la calle AHORA (ADMIN o acceso a Operaciones)
//
// "Activo" ya no significa `tracker.isActive`, que es una bandera administrativa
// permanente. Antes esta ruta devolvía la última posición de todo tracker activo
// sin filtrar por tiempo, así que un chofer que cerró sesión hace tres días
// seguía pintado en el mapa para siempre. Ahora:
//
//   · tracker de USUARIO      → aparece sólo si su chofer tiene turno abierto
//   · tracker de DISPOSITIVO  → aparece sólo si su última señal es reciente
//     (un GPS físico no tiene turno: su equivalente es seguir reportando)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "OPERACIONES"))
    return apiError("Acceso denegado", 403);

  // El mapa se consulta cada 15 s mientras alguien lo mira, así que este
  // barrido es lo que en la práctica hace de cron para el cierre por
  // inactividad. Corre antes de la consulta para que el resultado ya lo refleje.
  await cerrarTurnosInactivos(prisma);

  const corteDispositivo = new Date(Date.now() - INACTIVIDAD_MS);

  // Prisma `distinct` + orderBy desc → la primera fila por trackerId es la más reciente
  const latest = await prisma.position.findMany({
    where: {
      tracker: { isActive: true },
      OR: [
        {
          tracker: {
            type: "USUARIO",
            user: { shifts: { some: { endedAt: null } } },
          },
        },
        {
          tracker: { type: "DISPOSITIVO" },
          recordedAt: { gte: corteDispositivo },
        },
      ],
    },
    distinct: ["trackerId"],
    orderBy: [{ trackerId: "asc" }, { recordedAt: "desc" }],
    include: {
      tracker: {
        select: {
          label: true,
          kind: true,
          type: true,
          user: {
            select: {
              shifts: {
                where: { endedAt: null },
                orderBy: { startedAt: "desc" },
                take: 1,
                select: { startedAt: true },
              },
            },
          },
        },
      },
    },
  });

  const result = latest.map((p) => ({
    trackerId: p.trackerId,
    label: p.tracker.label,
    kind: p.tracker.kind,
    lat: p.lat,
    lng: p.lng,
    recordedAt: p.recordedAt,
    // Desde cuándo está en turno. `null` para los GPS físicos, que no tienen.
    enTurnoDesde: p.tracker.user?.shifts[0]?.startedAt ?? null,
  }));

  return NextResponse.json(result);
}
