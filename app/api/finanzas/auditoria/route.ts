import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess } from "@/lib/access";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";

// GET /api/finanzas/auditoria — visor paginado del log, filtros por
// entityType, actorId y rango de fechas. Sólo GET: el log es append-only
// por contrato, no existe ni existirá una ruta que lo actualice o borre.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const entityType = searchParams.get("entityType");
  const actorId = searchParams.get("actorId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;
  if (desde || hasta) {
    where.createdAt = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta) } : {}),
    };
  }

  const [filas, total] = await Promise.all([
    prisma.financeAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.financeAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: filas,
    meta: construirMeta(total, page, pageSize),
  });
}
