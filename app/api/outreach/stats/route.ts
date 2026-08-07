import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

const STATUSES = ["EN_COLA", "ENVIADO", "FALLIDO", "REBOTADO"] as const;

// GET /api/outreach/stats — enviados, rebotes y bajas por campaña y en total.
// Fase 4 de PROSPECCION_OUTREACH.md §6: "que Ventas pueda responder a quién le
// escribimos y qué pasó sin pedir ayuda". Activity y OutreachSend están
// deliberadamente desacoplados (§3) — este endpoint lee OutreachSend
// directamente, no intenta derivar estadísticas desde Activity.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const [campaigns, grouped, optOuts, recentSends] = await Promise.all([
    prisma.outreachCampaign.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.outreachSend.groupBy({
      by: ["campaignId", "status"],
      _count: { id: true },
    }) as unknown as {
      campaignId: string;
      status: string;
      _count: { id: number };
    }[],
    prisma.contact.count({ where: { optOut: true } }),
    prisma.outreachSend.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        campaign: { select: { name: true, segment: true } },
        contact: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    }),
  ]);

  const emptyCounts = () =>
    Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
      (typeof STATUSES)[number],
      number
    >;

  const countsByCampaign = new Map<string, ReturnType<typeof emptyCounts>>();
  const totals = emptyCounts();
  for (const row of grouped) {
    if (!countsByCampaign.has(row.campaignId)) {
      countsByCampaign.set(row.campaignId, emptyCounts());
    }
    const bucket = countsByCampaign.get(row.campaignId)!;
    if (row.status in bucket) {
      bucket[row.status as (typeof STATUSES)[number]] += row._count.id;
      totals[row.status as (typeof STATUSES)[number]] += row._count.id;
    }
  }

  const campaignsWithCounts = campaigns.map((c) => {
    const counts = countsByCampaign.get(c.id) ?? emptyCounts();
    return {
      ...c,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  });

  return NextResponse.json({
    campaigns: campaignsWithCounts,
    totals,
    totalSends: Object.values(totals).reduce((a, b) => a + b, 0),
    optOuts,
    recentSends,
  });
}
