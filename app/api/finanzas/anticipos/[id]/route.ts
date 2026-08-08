import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { canWriteFinance } from "@/lib/access";
import { editarAnticipoSchema } from "@/lib/finanzas/schemas";
import { withAudit } from "@/lib/finanzas/audit";

// Estados que ya no se pueden tocar desde esta ruta.
const ESTADOS_TERMINALES = ["DESCONTADO", "ANULADO"];
// A dónde puede moverse un anticipo PENDIENTE o PAGADO desde aquí.
// DESCONTADO lo fija únicamente la generación de nómina (paso 15); nunca
// se vuelve a PENDIENTE.
const ESTADOS_DESTINO_VALIDOS = ["PAGADO", "ANULADO"];

// PATCH /api/finanzas/anticipos/[id] — marca pagado o anulado
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.advance.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  const body = await req.json();
  const parsed = editarAnticipoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const { status } = parsed.data;

  if (ESTADOS_TERMINALES.includes(anterior.status)) {
    return apiError("Este anticipo ya no se puede modificar", 409);
  }
  if (!ESTADOS_DESTINO_VALIDOS.includes(status)) {
    return apiError("Transición de estado no permitida", 409);
  }

  const data: Record<string, unknown> = { status };
  // paidAt siempre del servidor — nunca una fecha enviada por el cliente.
  if (status === "PAGADO") data.paidAt = new Date();

  const actualizado = await prisma.$transaction(async (tx) => {
    const act = await tx.advance.update({
      where: { id: params.id },
      data,
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: status === "ANULADO" ? "ANULAR" : "EDITAR",
      entityType: "Advance",
      entityId: act.id,
      before: anterior,
      after: act,
    });

    return act;
  });

  return NextResponse.json(actualizado);
}
