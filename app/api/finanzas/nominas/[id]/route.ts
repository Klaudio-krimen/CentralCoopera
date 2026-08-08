import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { editarNominaSchema } from "@/lib/finanzas/schemas";
import { enmascararRut } from "@/lib/finanzas/rut";
import { withAudit } from "@/lib/finanzas/audit";

// Sólo estas transiciones son válidas, y sólo hacia adelante. PAGADA es
// terminal: no hay vuelta atrás (ver blueprint §5, modelo PayrollRun).
const TRANSICIONES_VALIDAS: Record<string, string> = {
  BORRADOR: "APROBADA",
  APROBADA: "PAGADA",
};

// GET /api/finanzas/nominas/[id] — cabecera + líneas, RUT enmascarado para FINANZAS_LECTURA
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const nomina = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: { employee: { select: { fullName: true, rut: true } } },
        orderBy: { employee: { fullName: "asc" } },
      },
    },
  });
  if (!nomina) return apiError("No encontrada", 404);

  const puedeEscribir = canWriteFinance(session.user);

  return NextResponse.json({
    id: nomina.id,
    period: nomina.period,
    status: nomina.status,
    totalGross: nomina.totalGross,
    totalNet: nomina.totalNet,
    approvedAt: nomina.approvedAt,
    paidAt: nomina.paidAt,
    createdAt: nomina.createdAt,
    items: nomina.items.map((item) => ({
      id: item.id,
      employeeId: item.employeeId,
      fullName: item.employee.fullName,
      rut: puedeEscribir ? item.employee.rut : enmascararRut(item.employee.rut),
      grossAmount: item.grossAmount,
      afpAmount: item.afpAmount,
      healthAmount: item.healthAmount,
      otherDeductions: item.otherDeductions,
      advancesApplied: item.advancesApplied,
      netAmount: item.netAmount,
    })),
  });
}

// PATCH /api/finanzas/nominas/[id] — aprueba (BORRADOR→APROBADA) o marca pagada (APROBADA→PAGADA)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.payrollRun.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrada", 404);

  const body = await req.json();
  const parsed = editarNominaSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const { status } = parsed.data;

  if (TRANSICIONES_VALIDAS[anterior.status] !== status) {
    return apiError("Transición de estado no permitida", 409);
  }

  const data: Record<string, unknown> = { status };
  if (status === "APROBADA") {
    data.approvedAt = new Date();
    data.approvedById = session.user.id;
  }
  if (status === "PAGADA") {
    data.paidAt = new Date();
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const act = await tx.payrollRun.update({
      where: { id: params.id },
      data,
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: status === "APROBADA" ? "APROBAR" : "PAGAR",
      entityType: "PayrollRun",
      entityId: act.id,
      before: anterior,
      after: act,
    });

    return act;
  });

  return NextResponse.json(actualizado);
}
