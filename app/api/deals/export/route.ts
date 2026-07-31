import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { toCsv } from "@/lib/csv";
import { hasModuleAccess } from "@/lib/access";

// GET /api/deals/export — descarga CSV del listado global de deals
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const deals = await prisma.deal.findMany({
    include: {
      company: { select: { name: true } },
      contact: { select: { name: true } },
      stage: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const csv = toCsv(
    deals.map((d) => ({
      titulo: d.title,
      empresa: d.company.name,
      contacto: d.contact?.name ?? "",
      valor: d.value,
      probabilidad: d.probability,
      etapa: d.stage.name,
      cierreEstimado: d.expectedClose
        ? d.expectedClose.toISOString().slice(0, 10)
        : "",
    })),
    [
      { key: "titulo", label: "Título" },
      { key: "empresa", label: "Empresa" },
      { key: "contacto", label: "Contacto" },
      { key: "valor", label: "Valor" },
      { key: "probabilidad", label: "Probabilidad" },
      { key: "etapa", label: "Etapa" },
      { key: "cierreEstimado", label: "Cierre estimado" },
    ]
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="deals.csv"',
    },
  });
}
