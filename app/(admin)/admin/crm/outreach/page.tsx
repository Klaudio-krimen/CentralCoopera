import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/crm/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/crm/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/crm/ui/table";

const STATUSES = ["EN_COLA", "ENVIADO", "FALLIDO", "REBOTADO"] as const;

const STATUS_LABEL: Record<string, string> = {
  EN_COLA: "En cola",
  ENVIADO: "Enviado",
  FALLIDO: "Fallido",
  REBOTADO: "Rebotado",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  EN_COLA: "secondary",
  ENVIADO: "default",
  FALLIDO: "destructive",
  REBOTADO: "destructive",
};

const SEGMENT_LABEL: Record<string, string> = {
  LOGISTICA: "Logística",
  FARMACEUTICA: "Farmacéutica",
  OTRO: "Otro",
};

function emptyCounts() {
  return Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    (typeof STATUSES)[number],
    number
  >;
}

// Fase 4 de PROSPECCION_OUTREACH.md §11 — panel de solo lectura, sin
// acciones de gestión (activar/pausar campañas queda para cuando exista
// /api/outreach/campaigns). El objetivo único es que Ventas pueda responder
// "¿a quién le escribimos y qué pasó?" sin pedir ayuda.
async function getOutreachStats() {
  const [campaigns, grouped, optOuts, recentSends] = await Promise.all([
    prisma.outreachCampaign.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.outreachSend.groupBy({
      by: ["campaignId", "status"],
      _count: { id: true },
    }) as unknown as Promise<
      { campaignId: string; status: string; _count: { id: number } }[]
    >,
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

  return {
    campaigns: campaignsWithCounts,
    totals,
    totalSends: Object.values(totals).reduce((a, b) => a + b, 0),
    optOuts,
    recentSends,
  };
}

export default async function OutreachPage() {
  const { campaigns, totals, totalSends, optOuts, recentSends } =
    await getOutreachStats();

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">
          Outreach
        </h1>
        <p className="text-crm-muted text-sm mt-1">
          {totalSends} envío{totalSends !== 1 ? "s" : ""} registrado
          {totalSends !== 1 ? "s" : ""} · {campaigns.length} campaña
          {campaigns.length !== 1 ? "s" : ""} · {optOuts} baja
          {optOuts !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-5 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <Card>
          <CardHeader>
            <CardDescription>Total envíos</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalSends}
          </CardContent>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardHeader>
              <CardDescription>{STATUS_LABEL[s]}</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {totals[s]}
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        className="space-y-3 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-sm font-semibold text-crm-foreground">Campañas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {campaigns.length === 0 && (
            <p className="text-sm text-crm-muted">
              Todavía no hay campañas creadas.
            </p>
          )}
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div>
                  <CardTitle>{c.name}</CardTitle>
                  <CardDescription>{c.subject}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                  <Badge variant="outline">
                    {SEGMENT_LABEL[c.segment] ?? c.segment}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  {STATUSES.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-crm-secondary px-2 py-0.5 text-crm-muted"
                    >
                      {STATUS_LABEL[s]}: {c.counts[s]}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-crm-muted mt-2">
                  Tope diario: {c.dailyCap} · Total histórico: {c.total}
                  {!c.pdfBlobUrl && " · sin PDF adjunto"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div
        className="space-y-3 animate-fade-up"
        style={{ animationDelay: "180ms" }}
      >
        <h2 className="text-sm font-semibold text-crm-foreground">
          Últimos envíos
        </h2>
        <div className="crm-card">
          {recentSends.length === 0 ? (
            <p className="text-sm text-crm-muted p-4">
              Todavía no se ha enviado ningún correo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSends.map((send) => (
                  <TableRow key={send.id}>
                    <TableCell className="font-medium">
                      {send.company.name}
                    </TableCell>
                    <TableCell>
                      {send.contact.email ?? send.contact.name}
                    </TableCell>
                    <TableCell>{send.campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[send.status]}>
                        {STATUS_LABEL[send.status] ?? send.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-crm-muted">
                      {send.sentAt
                        ? formatDate(send.sentAt)
                        : formatDate(send.createdAt)}
                    </TableCell>
                    <TableCell className="text-crm-muted max-w-[240px] truncate">
                      {send.error ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
