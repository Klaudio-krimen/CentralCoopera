import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { ensurePipelineStages } from "@/lib/pipeline";
import { hasModuleAccess } from "@/lib/access";

// GET /api/pipeline — etapas con sus deals (para el tablero Kanban)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  await ensurePipelineStages();

  const stages = await prisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
    include: {
      deals: {
        include: {
          company: { select: { name: true } },
          contact: { select: { name: true, temperature: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return NextResponse.json(stages);
}

// PATCH /api/pipeline — mover un deal a otra etapa (drag & drop)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const { dealId, stageId } = await req.json();
  if (!dealId || !stageId) return apiError("dealId y stageId requeridos");

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { stageId },
  });

  return NextResponse.json(deal);
}
