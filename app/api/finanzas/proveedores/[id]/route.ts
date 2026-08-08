import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { editarProveedorSchema } from "@/lib/finanzas/schemas";
import { cifrar, ultimos4 } from "@/lib/finanzas/crypto";
import { serializeSupplier } from "@/lib/finanzas/serialize";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/proveedores/[id] — ficha
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const proveedor = await prisma.supplier.findUnique({
    where: { id: params.id },
  });
  if (!proveedor) return apiError("No encontrado", 404);

  return NextResponse.json(serializeSupplier(proveedor, session.user));
}

// PATCH /api/finanzas/proveedores/[id] — edita; la baja es isActive: false,
// nunca borrado duro. Conserva la fila y todas sus transacciones asociadas.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.supplier.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  const body = await req.json();
  const parsed = editarProveedorSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.rut !== undefined) data.rut = input.rut;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.bankName !== undefined) data.bankName = input.bankName;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.bankAccount !== undefined) {
    data.bankAccountEnc = input.bankAccount ? cifrar(input.bankAccount) : null;
    data.bankAccountLast4 = input.bankAccount
      ? ultimos4(input.bankAccount)
      : null;
  }

  const proveedor = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.supplier.update({
      where: { id: params.id },
      data,
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "EDITAR",
      entityType: "Supplier",
      entityId: actualizado.id,
      before: anterior,
      after: actualizado,
    });

    return actualizado;
  });

  return NextResponse.json(serializeSupplier(proveedor, session.user));
}
