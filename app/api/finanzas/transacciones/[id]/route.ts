import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { canWriteFinance } from "@/lib/access";
import { editarTransaccionSchema } from "@/lib/finanzas/schemas";
import { withAudit } from "@/lib/finanzas/audit";

// PATCH /api/finanzas/transacciones/[id] — edita o anula (status: ANULADO).
// Nunca borra: no existe DELETE en este archivo.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.financeTransaction.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  const body = await req.json();
  const parsed = editarTransaccionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  const data: Record<string, unknown> = {};
  if (input.kind !== undefined) data.kind = input.kind;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.date !== undefined) data.date = input.date;
  if (input.description !== undefined) data.description = input.description;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.supplierId !== undefined) data.supplierId = input.supplierId;
  if (input.method !== undefined) data.method = input.method;
  if (input.reference !== undefined) data.reference = input.reference;
  if (input.status !== undefined) data.status = input.status;

  const esAnulacion = input.status === "ANULADO";

  const transaccion = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.financeTransaction.update({
      where: { id: params.id },
      data,
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: esAnulacion ? "ANULAR" : "EDITAR",
      entityType: "FinanceTransaction",
      entityId: actualizada.id,
      before: anterior,
      after: actualizada,
    });

    return actualizada;
  });

  return NextResponse.json(transaccion);
}
