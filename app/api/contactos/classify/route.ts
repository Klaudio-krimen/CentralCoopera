import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { calculateLeadScore, suggestTemperature } from "@/lib/scoring";
import { hasModuleAccess } from "@/lib/access";
import { ensurePipelineStages } from "@/lib/pipeline";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/contactos/classify — { contactId?: string }
// Sin contactId: reclasifica todos los contactos activos. Con contactId:
// reclasifica solo ese contacto. Clasificación 100% por reglas (sin IA) —
// port de auto-crm/src/lib/scoring.ts, ver lib/scoring.ts para la fórmula.
//
// Todo contacto que deja de ser FRIO (score >= 30) y todavía no tiene ningún
// deal, entra automáticamente a la etapa "Prospecto" de la Pizarra para que
// Ventas empiece a contactarlo. Si ya tiene un deal (creado por esta misma
// automatización u a mano), no se toca — evita duplicar deals y evita
// regresar un deal que Ventas ya movió a una etapa más avanzada.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  await ensurePipelineStages();
  const prospectoStage = await prisma.pipelineStage.findFirst({
    where: { name: "Prospecto" },
    orderBy: { order: "asc" },
  });

  const { contactId } = await req.json().catch(() => ({}));

  const contacts = await prisma.contact.findMany({
    where: { isActive: true, ...(contactId ? { id: contactId } : {}) },
    include: {
      activities: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      deals: { select: { value: true } },
      _count: { select: { activities: true } },
    },
  });

  if (contactId && contacts.length === 0)
    return apiError("Contacto no encontrado", 404);

  const now = Date.now();
  const updated: { id: string; score: number; temperature: string }[] = [];

  for (const contact of contacts) {
    const lastActivityAt =
      contact.activities[0]?.createdAt ?? contact.createdAt;
    const daysSinceLastActivity = Math.floor(
      (now - lastActivityAt.getTime()) / MS_PER_DAY
    );
    const dealValue = contact.deals.reduce((sum, d) => sum + d.value, 0);

    const score = calculateLeadScore({
      temperature: contact.temperature,
      hasEmail: !!contact.email,
      hasPhone: !!contact.phone,
      hasRole: !!contact.role,
      activityCount: contact._count.activities,
      daysSinceLastActivity,
      hasDeals: contact.deals.length > 0,
      dealValue,
    });
    const temperature = suggestTemperature(score);

    await prisma.contact.update({
      where: { id: contact.id },
      data: { score, temperature },
    });

    if (
      temperature !== "FRIO" &&
      contact.deals.length === 0 &&
      prospectoStage
    ) {
      await prisma.deal.create({
        data: {
          title: contact.name,
          companyId: contact.companyId,
          contactId: contact.id,
          stageId: prospectoStage.id,
          probability: 20,
        },
      });
    }

    updated.push({ id: contact.id, score, temperature });
  }

  return NextResponse.json({ updated, count: updated.length });
}
