import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { canWriteFinance } from "@/lib/access";
import { serializeEmployee } from "@/lib/finanzas/serialize";
import { withAudit } from "@/lib/finanzas/audit";

// POST /api/finanzas/empleados/[id]/desvincular — da de baja al trabajador y
// purga sus datos bancarios y de contacto. Nunca hay borrado duro de
// Employee: el historial de PayrollItem, Advance y FinanceTransaction se
// conserva íntegro por la obligación tributaria de 6 años.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.employee.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  if (anterior.status === "DESVINCULADO") {
    return apiError("Este trabajador ya está desvinculado", 409);
  }

  const ahora = new Date();

  const empleado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.employee.update({
      where: { id: params.id },
      data: {
        status: "DESVINCULADO",
        terminatedAt: ahora,
        bankAccountEnc: null,
        bankAccountLast4: null,
        bankName: null,
        bankAccountType: null,
        email: null,
        phone: null,
        purgedAt: ahora,
      },
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "DESVINCULAR",
      entityType: "Employee",
      entityId: actualizado.id,
      before: anterior,
      after: actualizado,
    });

    return actualizado;
  });

  return NextResponse.json(serializeEmployee(empleado, session.user));
}
