import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { validateCoordinates } from "@/lib/tracking";

// POST /api/posiciones — recibe un ping de posición (teléfono o GPS)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError("JSON inválido", 400);
  }

  const { lat, lng, accuracy, source } = body ?? {};

  if (!validateCoordinates(lat, lng)) {
    return apiError("Coordenadas inválidas", 422);
  }

  // Resolver el tracker por uno de dos caminos de autenticación
  let tracker = null;

  const deviceKey = req.headers.get("x-device-key");
  if (deviceKey) {
    // GPS físico: no tiene turno, reporta siempre que esté activo.
    tracker = await prisma.tracker.findUnique({ where: { deviceKey } });
  } else {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("No autorizado", 401);

    // El turno es el interruptor real del rastreo, no sólo un botón en la UI:
    // sin turno abierto no se guarda la posición, aunque una pestaña vieja
    // siga mandando pings. Es lo que impide que alguien quede rastreado
    // después de terminar su turno o cerrar sesión.
    const turnoAbierto = await prisma.shift.findFirst({
      where: { userId: session.user.id, endedAt: null },
      select: { id: true },
    });
    if (!turnoAbierto) return apiError("Sin turno abierto", 409);

    tracker = await prisma.tracker.findUnique({
      where: { userId: session.user.id },
    });
  }

  if (!tracker || !tracker.isActive) {
    return apiError("Tracker no encontrado o inactivo", 404);
  }

  await prisma.position.create({
    data: {
      trackerId: tracker.id,
      lat,
      lng,
      accuracy: typeof accuracy === "number" ? accuracy : null,
      source: source === "device" ? "device" : "phone",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
