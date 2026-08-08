import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearAnticipoSchema } from "@/lib/finanzas/schemas";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/anticipos — paginado, filtros employeeId y status
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const [anticipos, total] = await Promise.all([
    prisma.advance.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip,
      take,
      include: { employee: { select: { fullName: true } } },
    }),
    prisma.advance.count({ where }),
  ]);

  return NextResponse.json({
    data: anticipos,
    meta: construirMeta(total, page, pageSize),
  });
}

// POST /api/finanzas/anticipos — crea un anticipo en estado PENDIENTE
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearAnticipoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  const empleado = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });
  if (!empleado) return apiError("Trabajador no encontrado", 404);

  const anticipo = await prisma.$transaction(async (tx) => {
    const creado = await tx.advance.create({
      data: {
        employeeId: input.employeeId,
        amount: input.amount,
        requestedAt: input.requestedAt,
        notes: input.notes ?? null,
        createdById: session.user.id,
      },
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "CREAR",
      entityType: "Advance",
      entityId: creado.id,
      after: creado,
    });

    return creado;
  });

  return NextResponse.json(anticipo, { status: 201 });
}
