import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import { resolverCategoriaInventario } from "@/lib/inventario/category";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { INVENTORY_CATEGORIES } from "@/lib/inventario/category";
import { MovimientoError } from "@/lib/inventario/movimiento";

const textoOpcional = z.string().trim().nullable().optional();
const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  details: textoOpcional,
  format: textoOpcional,
  color: textoOpcional,
  notes: textoOpcional,
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  condition: z.enum(["NUEVO", "USADO"]).nullable().optional(),
  measureUnit: z.enum(["LITROS", "METROS", "KILOS"]).nullable().optional(),
  measureValue: z.number().finite().nonnegative().nullable().optional(),
  quantity: z.number().finite().nonnegative().optional(),
  fillPercent: z.number().int().min(0).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/inventario/[id] — ficha del ítem
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
// isActive:false (archivar) sólo lo puede hacer ADMIN.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const body = parsed.data;
  if (body.isActive === false && session.user.role !== "ADMIN")
    return apiError("Solo un administrador puede archivar un ítem", 403);
  try {
    const item = await prisma.$transaction(async (tx) => {
      const lock = await tx.inventoryItem.updateMany({
        where: { id },
        data: { quantity: { increment: 0 } },
      });
      if (lock.count !== 1) throw new MovimientoError("No encontrado", 404);
      const anterior = await tx.inventoryItem.findUniqueOrThrow({
        where: { id },
      });
      const data: Prisma.InventoryItemUpdateInput = { ...body };
      if (body.category !== undefined || body.name !== undefined)
        data.category = resolverCategoriaInventario(
          body.name ?? anterior.name,
          body.category ?? anterior.category
        );
      for (const campo of ["details", "format", "color", "notes"] as const) {
        if (body[campo] !== undefined) data[campo] = body[campo] || null;
      }
      const actualizado = await tx.inventoryItem.update({
        where: { id },
        data,
      });
      if (body.quantity !== undefined && body.quantity !== anterior.quantity) {
        await tx.inventoryMovement.create({
          data: {
            itemId: id,
            type: "AJUSTE",
            quantity: body.quantity,
            quantityBefore: anterior.quantity,
            quantityAfter: body.quantity,
            reason: "Edición en línea (Stock)",
            userId: session.user.id,
          },
        });
      }
      if (
        body.fillPercent !== undefined &&
        body.fillPercent !== anterior.fillPercent
      ) {
        await tx.inventoryMovement.create({
          data: {
            itemId: id,
            type: "NIVEL",
            quantity: body.fillPercent ?? 0,
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
  } catch (error) {
    if (error instanceof MovimientoError)
      return apiError(error.message, error.status);
    return apiError("No se pudo actualizar el ítem", 500);
  }
}

// DELETE /api/inventario/[id] — borrado duro, sólo para duplicados que nunca
// se tocaron. Sólo ADMIN. Se rechaza si el ítem tiene algún InventoryMovement
// (InventoryMovement.itemId es onDelete: Cascade — un ítem con historial real
// se archiva, nunca se borra; borrar destruiría la trazabilidad que es la
// razón de ser del módulo). Un duplicado recién creado o recién importado, sin
// ningún ajuste todavía, sí se puede borrar directo.
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);
  if (session.user.role !== "ADMIN") {
    return apiError("Solo un administrador puede eliminar un ítem", 403);
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });
  if (!item) return apiError("No encontrado", 404);

  const movimientos = await prisma.inventoryMovement.count({
    where: { itemId: params.id },
  });
  if (movimientos > 0) {
    return apiError(
      "Este ítem tiene movimientos registrados, no se puede eliminar. Archívalo en vez de borrarlo.",
      409
    );
  }

  await prisma.inventoryItem.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}
