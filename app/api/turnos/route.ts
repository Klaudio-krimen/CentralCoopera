import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { cerrarTurnosInactivos, turnoAbiertoDe } from "@/lib/turnos-server";

// Quiénes pueden abrir turno. Coincide con app/(chofer)/layout.tsx: ADMIN entra
// a las pantallas de chofer para probar y necesita poder abrir turno ahí.
const ROLES_CON_TURNO = ["CHOFER", "ADMIN"];

async function sesionDeChofer() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: apiError("No autorizado", 401) };
  if (!ROLES_CON_TURNO.includes(session.user.role))
    return { error: apiError("Acceso denegado", 403) };
  return { user: session.user };
}

// GET /api/turnos — estado del turno del chofer autenticado
export async function GET() {
  const { user, error } = await sesionDeChofer();
  if (error) return error;

  // El barrido de inactivos corre acá y en /api/posiciones/activas: entre los
  // dos, cualquier turno colgado se cierra dentro del minuto sin cron.
  await cerrarTurnosInactivos(prisma);

  const [turno, perfil] = await Promise.all([
    turnoAbiertoDe(prisma, user!.id),
    prisma.user.findUnique({
      where: { id: user!.id },
      select: { locationConsentAt: true },
    }),
  ]);

  return NextResponse.json({
    enTurno: turno !== null,
    startedAt: turno?.startedAt ?? null,
    consentimiento: perfil?.locationConsentAt ?? null,
  });
}

// POST /api/turnos — iniciar turno. Idempotente: si ya hay uno abierto lo devuelve.
export async function POST() {
  const { user, error } = await sesionDeChofer();
  if (error) return error;

  const perfil = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { name: true, locationConsentAt: true },
  });
  if (!perfil) return apiError("Usuario no encontrado", 404);

  // Sin consentimiento no hay turno: el turno ES el rastreo. La UI usa este
  // 409 para mostrar el aviso de ubicación antes de reintentar.
  if (!perfil.locationConsentAt)
    return apiError("Falta aceptar el aviso de ubicación", 409);

  // El tracker es lo que POST /api/posiciones necesita para guardar el ping.
  // Se asegura acá con el mismo upsert de scripts/backfill-trackers.ts, para
  // que un chofer nuevo no abra un turno que jamás podrá reportar.
  await prisma.tracker.upsert({
    where: { userId: user!.id },
    update: { isActive: true },
    create: {
      label: perfil.name,
      type: "USUARIO",
      kind: "CHOFER",
      userId: user!.id,
    },
  });

  // Verificar y crear en la misma transacción: es lo que garantiza un solo
  // turno abierto por chofer, ya que Prisma no expresa un índice único parcial.
  const turno = await prisma.$transaction(async (tx) => {
    const abierto = await tx.shift.findFirst({
      where: { userId: user!.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (abierto) return abierto;
    return tx.shift.create({ data: { userId: user!.id } });
  });

  return NextResponse.json(
    { enTurno: true, startedAt: turno.startedAt },
    { status: 201 }
  );
}

// DELETE /api/turnos — terminar turno. Idempotente: sin turno abierto responde 200.
export async function DELETE() {
  const { user, error } = await sesionDeChofer();
  if (error) return error;

  // Timestamp del servidor, nunca del cliente (regla dura del repo).
  await prisma.shift.updateMany({
    where: { userId: user!.id, endedAt: null },
    data: { endedAt: new Date(), endedReason: "MANUAL" },
  });

  return NextResponse.json({ enTurno: false, startedAt: null });
}
