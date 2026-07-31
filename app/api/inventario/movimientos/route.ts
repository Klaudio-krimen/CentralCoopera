import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

// GET /api/inventario/movimientos — historial de movimientos, más reciente primero
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const movements = await prisma.inventoryMovement.findMany({
    include: {
      item: { select: { name: true, unit: true } },
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

  const { itemId, type, quantity, reason } = await req.json();

  if (!itemId) return apiError("itemId requerido");
  if (!["ENTRADA", "SALIDA", "AJUSTE"].includes(type))
    return apiError("Tipo de movimiento inválido");

  const qty = parseFloat(quantity);
  if (isNaN(qty) || (type !== "AJUSTE" && qty <= 0)) {
    return apiError("Cantidad inválida");
  }
  if (type === "AJUSTE" && qty < 0) return apiError("Cantidad inválida");

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return apiError("Ítem no encontrado", 404);

  let newQuantity: number;
  if (type === "ENTRADA") newQuantity = item.quantity + qty;
  else if (type === "SALIDA") {
    newQuantity = item.quantity - qty;
    if (newQuantity < 0)
      return apiError("No hay stock suficiente para esta salida");
  } else {
    newQuantity = qty; // AJUSTE fija el valor exacto (conteo físico)
  }

  const [, movement] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    }),
    prisma.inventoryMovement.create({
      data: {
        itemId,
        type,
        quantity: qty,
        reason: reason?.trim() || null,
        userId: session.user.id,
      },
    }),
  ]);

  return NextResponse.json(movement, { status: 201 });
}
