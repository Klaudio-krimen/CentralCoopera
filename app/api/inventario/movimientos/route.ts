import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import {
  MovimientoError,
  registrarMovimiento,
} from "@/lib/inventario/movimiento";

// GET /api/inventario/movimientos — historial de movimientos, más reciente primero
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const movements = await prisma.inventoryMovement.findMany({
    include: {
      item: { select: { name: true, measureUnit: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(movements);
}

// POST /api/inventario/movimientos — registra un movimiento y ajusta la cantidad del ítem
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return apiError("Body inválido");
  const { itemId, type, quantity, reason } = body as Record<string, unknown>;
  if (typeof itemId !== "string" || !itemId.trim())
    return apiError("itemId requerido");
  if (reason != null && typeof reason !== "string")
    return apiError("Motivo inválido");
  try {
    const movimiento = await prisma.$transaction((tx) =>
      registrarMovimiento(tx, {
        itemId,
        tipo: type,
        cantidad: quantity,
        reason: typeof reason === "string" ? reason.trim() || null : null,
        userId: session.user.id,
      })
    );
    return NextResponse.json(movimiento, { status: 201 });
  } catch (error) {
    if (error instanceof MovimientoError)
      return apiError(error.message, error.status);
    return apiError("No se pudo registrar el movimiento", 500);
  }
}
