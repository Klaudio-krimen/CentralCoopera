import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearTransaccionSchema } from "@/lib/finanzas/schemas";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/transacciones — paginado en la base, con filtros
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const kind = searchParams.get("kind");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const categoryId = searchParams.get("categoryId");
  const supplierId = searchParams.get("supplierId");

  const where: Record<string, unknown> = {};
  if (kind === "INGRESO" || kind === "EGRESO") where.kind = kind;
  if (categoryId) where.categoryId = categoryId;
  if (supplierId) where.supplierId = supplierId;
  if (desde || hasta) {
    where.date = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta) } : {}),
    };
  }

  const [transacciones, total] = await Promise.all([
    prisma.financeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      include: { category: true, supplier: true },
    }),
    prisma.financeTransaction.count({ where }),
  ]);

  return NextResponse.json({
    data: transacciones,
    meta: construirMeta(total, page, pageSize),
  });
}

// POST /api/finanzas/transacciones — crea un ingreso o egreso
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearTransaccionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  const transaccion = await prisma.$transaction(async (tx) => {
    const creada = await tx.financeTransaction.create({
      data: {
        kind: input.kind,
        amount: input.amount,
        date: input.date,
        description: input.description,
        categoryId: input.categoryId ?? null,
        supplierId: input.supplierId ?? null,
        method: input.method,
        reference: input.reference ?? null,
        createdById: session.user.id,
      },
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "CREAR",
      entityType: "FinanceTransaction",
      entityId: creada.id,
      after: creada,
    });

    return creada;
  });

  return NextResponse.json(transaccion, { status: 201 });
}
