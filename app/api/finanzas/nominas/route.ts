import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearNominaSchema } from "@/lib/finanzas/schemas";
import {
  calcularLiquido,
  totalizarNomina,
  type EntradaLiquido,
} from "@/lib/finanzas/payroll";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/nominas — lista de nóminas, opcionalmente filtrada por período
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const period = req.nextUrl.searchParams.get("period");

  const nominas = await prisma.payrollRun.findMany({
    where: period ? { period } : {},
    orderBy: { period: "desc" },
    take: 100,
  });

  return NextResponse.json(nominas);
}

// POST /api/finanzas/nominas — genera el run del período: una línea por cada
// trabajador ACTIVO, descuenta sus anticipos PAGADO, audita CREAR.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearNominaSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const { period, lineas } = parsed.data;

  const activos = await prisma.employee.findMany({
    where: { status: "ACTIVO" },
    orderBy: { fullName: "asc" },
    select: { id: true, baseSalary: true },
  });

  const lineasPorEmpleado = new Map(lineas.map((l) => [l.employeeId, l]));
  const idsActivos = new Set(activos.map((e) => e.id));
  const cubreTodos =
    lineas.length === activos.length &&
    lineas.every((l) => idsActivos.has(l.employeeId)) &&
    activos.every((e) => lineasPorEmpleado.has(e.id));

  if (!cubreTodos) {
    return apiError(
      "Debe venir exactamente una línea por cada trabajador activo, sin duplicados ni faltantes",
      400
    );
  }

  try {
    const nomina = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          period,
          totalGross: 0,
          totalNet: 0,
          createdById: session.user.id,
        },
      });

      const entradas: (EntradaLiquido & {
        employeeId: string;
        advanceIds: string[];
      })[] = [];

      for (const empleado of activos) {
        const linea = lineasPorEmpleado.get(empleado.id)!;
        const anticiposPagados = await tx.advance.findMany({
          where: { employeeId: empleado.id, status: "PAGADO" },
          select: { id: true, amount: true },
        });
        const advancesApplied = anticiposPagados.reduce(
          (suma, a) => suma + a.amount,
          0
        );

        entradas.push({
          employeeId: empleado.id,
          grossAmount: empleado.baseSalary,
          afpAmount: linea.afpAmount,
          healthAmount: linea.healthAmount,
          otherDeductions: linea.otherDeductions,
          advancesApplied,
          advanceIds: anticiposPagados.map((a) => a.id),
        });
      }

      const { totalGross, totalNet } = totalizarNomina(entradas);

      for (const entrada of entradas) {
        const item = await tx.payrollItem.create({
          data: {
            payrollRunId: run.id,
            employeeId: entrada.employeeId,
            grossAmount: entrada.grossAmount,
            afpAmount: entrada.afpAmount,
            healthAmount: entrada.healthAmount,
            otherDeductions: entrada.otherDeductions,
            advancesApplied: entrada.advancesApplied,
            netAmount: calcularLiquido(entrada),
          },
        });

        if (entrada.advanceIds.length > 0) {
          await tx.advance.updateMany({
            where: { id: { in: entrada.advanceIds } },
            data: { status: "DESCONTADO", payrollItemId: item.id },
          });
        }
      }

      const actualizado = await tx.payrollRun.update({
        where: { id: run.id },
        data: { totalGross, totalNet },
      });

      await withAudit(tx, {
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        actorRole: session.user.role,
        action: "CREAR",
        entityType: "PayrollRun",
        entityId: actualizado.id,
        after: actualizado,
      });

      return actualizado;
    });

    return NextResponse.json(nomina, { status: 201 });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      e.code === "P2002"
    ) {
      return apiError("Ya existe una nómina para ese período", 409);
    }
    throw e;
  }
}
