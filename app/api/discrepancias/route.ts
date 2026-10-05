import { DiscrepancySeverity, DiscrepancyStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

// GET /api/discrepancias?status=PENDIENTE&page=1
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "OPERACIONES"))
    return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(
    parsePositiveInteger(searchParams.get("limit"), 25),
    100
  );

  const statusValue = status
    ? Object.values(DiscrepancyStatus).find((value) => value === status)
    : undefined;
  const severityValue = severity
    ? Object.values(DiscrepancySeverity).find((value) => value === severity)
    : undefined;
  if (status && !statusValue) return apiError("Estado inválido");
  if (severity && !severityValue) return apiError("Severidad inválida");

  const where: Prisma.DiscrepancyWhereInput = {
    ...(statusValue ? { status: statusValue } : {}),
    ...(severityValue ? { severity: severityValue } : {}),
  };

  const [discrepancias, total] = await Promise.all([
    prisma.discrepancy.findMany({
      where,
      include: {
        order: {
          include: {
            company: { select: { name: true } },
            driver: { select: { name: true } },
          },
        },
        detectedBy: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.discrepancy.count({ where }),
  ]);

  return NextResponse.json({ discrepancias, total, page, limit });
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// PATCH /api/discrepancias — cambiar estado (ADMIN o acceso a Operaciones)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "OPERACIONES"))
    return apiError("Acceso denegado", 403);

  const { id, status, resolutionNote } = await req.json();

  if (!id) return apiError("id es requerido");
  if (!status) return apiError("status es requerido");

  const validStatuses = ["EN_INVESTIGACION", "RESUELTA"];
  if (!validStatuses.includes(status)) return apiError("Estado inválido");

  const discrepancia = await prisma.discrepancy.findUnique({ where: { id } });
  if (!discrepancia) return apiError("Discrepancia no encontrada", 404);

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.discrepancy.update({
      where: { id },
      data: {
        status,
        ...(status === "RESUELTA"
          ? {
              resolvedAt: new Date(),
              resolvedById: session.user.id,
              resolutionNote: resolutionNote ?? null,
            }
          : {}),
      },
    });

    // If resolved, check if all discrepancies for this order are resolved → close order
    if (status === "RESUELTA") {
      const pending = await tx.discrepancy.count({
        where: { orderId: d.orderId, status: { not: "RESUELTA" } },
      });
      if (pending === 0) {
        await tx.pickupOrder.update({
          where: { id: d.orderId },
          data: { status: "CERRADA" },
        });
      }
    }

    return d;
  });

  return NextResponse.json(updated);
}
