import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import type { InventoryCategory, InventoryCondition } from "@prisma/client";

const CATEGORIAS = [
  "MATERIA_PRIMA",
  "PALLET",
  "PINTURA",
  "MATERIAL",
  "HERRAMIENTA",
  "OTRO",
];
const CONDICIONES = ["NUEVO", "USADO"];
const MEDIDAS = ["LITROS", "METROS", "KILOS"];

const CAMPOS_TEXTO = ["name", "details", "format", "color", "notes"] as const;

// GET /api/inventario/[id] — ficha del ítem
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });
  if (!item) return apiError("No encontrado", 404);

  return NextResponse.json(item);
}

// PATCH /api/inventario/[id] — edición en línea, estilo Excel: click en la
// celda, se guarda. Si el body toca `quantity` o `fillPercent`, se escribe un
// InventoryMovement (AJUSTE / NIVEL respectivamente) en la MISMA transacción,
// con quantityBefore/After y el usuario del servidor — la bodeguera edita una
// celda, el libro de movimientos se llena solo, sin que ella tenga que saberlo.
// isActive:false (archivar) sólo lo puede hacer ADMIN: no hay DELETE porque
// InventoryMovement.itemId es onDelete: Cascade y borraría el historial.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const anterior = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  const body = await req.json();

  if (body.isActive === false && session.user.role !== "ADMIN") {
    return apiError("Solo un administrador puede archivar un ítem", 403);
  }

  if (body.category !== undefined && !CATEGORIAS.includes(body.category)) {
    return apiError("Categoría inválida");
  }
  if (
    body.condition !== undefined &&
    body.condition !== null &&
    !CONDICIONES.includes(body.condition)
  ) {
    return apiError("Condición inválida");
  }
  if (
    body.measureUnit !== undefined &&
    body.measureUnit !== null &&
    !MEDIDAS.includes(body.measureUnit)
  ) {
    return apiError("Unidad de medida inválida");
  }
  if (
    body.fillPercent !== undefined &&
    body.fillPercent !== null &&
    (body.fillPercent < 0 || body.fillPercent > 100)
  ) {
    return apiError("El nivel del envase debe estar entre 0 y 100");
  }
  if (body.quantity !== undefined && body.quantity < 0) {
    return apiError("La cantidad no puede ser negativa");
  }

  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] !== undefined) {
      data[campo] =
        typeof body[campo] === "string" ? body[campo].trim() || null : null;
    }
  }
  if (body.category !== undefined)
    data.category = body.category as InventoryCategory;
  if (body.condition !== undefined)
    data.condition = body.condition as InventoryCondition | null;
  if (body.measureValue !== undefined) data.measureValue = body.measureValue;
  if (body.measureUnit !== undefined) data.measureUnit = body.measureUnit;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const tocaQuantity =
    body.quantity !== undefined && body.quantity !== anterior.quantity;
  const tocaFillPercent =
    body.fillPercent !== undefined && body.fillPercent !== anterior.fillPercent;
  if (tocaQuantity) data.quantity = body.quantity;
  if (tocaFillPercent) data.fillPercent = body.fillPercent;

  const item = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.inventoryItem.update({
      where: { id: params.id },
      data,
    });

    if (tocaQuantity) {
      await tx.inventoryMovement.create({
        data: {
          itemId: params.id,
          type: "AJUSTE",
          quantity: body.quantity,
          quantityBefore: anterior.quantity,
          quantityAfter: body.quantity,
          reason: "Edición en línea (Stock)",
          userId: session.user.id,
        },
      });
    }
    if (tocaFillPercent) {
      await tx.inventoryMovement.create({
        data: {
          itemId: params.id,
          type: "NIVEL",
          quantity: body.fillPercent,
          quantityBefore: anterior.fillPercent,
          quantityAfter: body.fillPercent,
          reason: "Edición en línea (Stock)",
          userId: session.user.id,
        },
      });
    }

    return actualizado;
  });

  return NextResponse.json(item);
}
