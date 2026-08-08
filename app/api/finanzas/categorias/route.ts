import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearCategoriaSchema } from "@/lib/finanzas/schemas";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/categorias — lista de categorías activas
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const categorias = await prisma.financeCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categorias);
}

// POST /api/finanzas/categorias — crea categoría
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearCategoriaSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  try {
    const categoria = await prisma.$transaction(async (tx) => {
      const creada = await tx.financeCategory.create({
        data: { name: input.name, kind: input.kind },
      });

      await withAudit(tx, {
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        actorRole: session.user.role,
        action: "CREAR",
        entityType: "FinanceCategory",
        entityId: creada.id,
        after: creada,
      });

      return creada;
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (e: any) {
    // @@unique([name, kind]) — la carrera la resuelve la base, no un
    // findUnique previo que podría correr al mismo tiempo que otra request.
    if (e?.code === "P2002") {
      return apiError("Ya existe una categoría con ese nombre y tipo", 409);
    }
    throw e;
  }
}
