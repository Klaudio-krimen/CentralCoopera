import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";

/**
 * Consentimiento de rastreo de ubicación, por persona y revocable.
 *
 * Antes vivía en `localStorage["chofer-location-consent"]`, lo que lo hacía por
 * dispositivo: dos choferes que compartían un teléfono, y el segundo nunca veía
 * el aviso. Además no había forma de revocarlo ni constancia de quién lo aceptó.
 */

// POST /api/ubicacion/consentimiento — otorgar
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);

  // Timestamp del servidor, nunca del cliente: es el registro de cuándo esta
  // persona aceptó ser rastreada.
  const { locationConsentAt } = await prisma.user.update({
    where: { id: session.user.id },
    data: { locationConsentAt: new Date() },
    select: { locationConsentAt: true },
  });

  return NextResponse.json({ consentimiento: locationConsentAt });
}

// DELETE /api/ubicacion/consentimiento — revocar, y cerrar el turno si estaba abierto
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);

  // Revocar con un turno abierto sería seguir rastreando a alguien que acaba de
  // decir que no. Las dos escrituras van juntas o no van.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { locationConsentAt: null },
    }),
    prisma.shift.updateMany({
      where: { userId: session.user.id, endedAt: null },
      data: { endedAt: new Date(), endedReason: "CONSENTIMIENTO_REVOCADO" },
    }),
  ]);

  return NextResponse.json({ consentimiento: null, enTurno: false });
}
