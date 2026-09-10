import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/outreach/smtp";
import { getTemplate } from "@/lib/outreach/templates";
import {
  generateOptOutToken,
  buildUnsubscribeUrl,
} from "@/lib/outreach/unsubscribe";
import { ensureSystemUser } from "@/lib/outreach/system-user";
import {
  allocateDailyBudget,
  pickCompanyContact,
} from "@/lib/outreach/eligibility";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Jitter entre envíos (PROSPECCION_OUTREACH.md §10): nunca disparar N
// correos en el mismo segundo, aunque N sea chico. Rango fijo, no
// configurable — no es una perilla que valga la pena exponer.
function jitterMs() {
  return 3000 + Math.random() * 4000;
}

function isAuthorized(req: NextRequest): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;
  // Vercel Cron manda Authorization: Bearer $CRON_SECRET automáticamente
  // cuando el proyecto tiene CRON_SECRET configurado. Se acepta también un
  // header propio para poder gatillar el cron a mano en pruebas.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const custom = req.headers.get("x-cron-secret");
  return bearer === configured || custom === configured;
}

// Inicio del día en curso, en UTC — ventana para contar lo ya enviado hoy
// contra el tope global. El cron corre una vez al día (Vercel Cron
// `0 12 * * 1-5`), así que un día UTC alcanza; no se persigue exactitud de zona.
function inicioDelDiaUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

// GET /api/cron/outreach — lote diario de outreach. Lo dispara Vercel Cron.
//
// Selección (IMPORTACION_RADAR_PALLETS.md §7, reescrita en E2-T3):
//  - Tope GLOBAL: `OUTREACH_DAILY_CAP` correos/día (default 25) para TODO el
//    outreach, repartido entre las campañas activas proporcionalmente a su pool
//    de empresas elegibles (`lib/outreach/eligibility.ts` → `allocateDailyBudget`).
//    Antes el tope era `dailyCap` por campaña; ahora `dailyCap` es sólo un techo.
//  - UN solo correo por empresa: la query es por `Company` (no por `Contact`), y
//    `pickCompanyContact` elige el destinatario (genérico > nominativo; a
//    igualdad, el más antiguo).
//  - Exclusión por gestión telefónica: toda empresa con algún contacto cuyo
//    `callStatus` no sea `null` ni `"POR_LLAMAR"` queda fuera (spec §7.8).
//
// Idempotente por empresa: una `Company` con un `OutreachSend` para la campaña
// nunca vuelve a la query (`outreachSends: { none: { campaignId } }`), más el
// `@@unique([campaignId, contactId])` de respaldo. Responde 200 SIEMPRE salvo el
// 401 de `isAuthorized` — nunca un 4xx/5xx sobre un lote que Vercel deba
// reintentar.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const globalCap = Number(process.env.OUTREACH_DAILY_CAP ?? 25);

  const campaigns = await prisma.outreachCampaign.findMany({
    where: { isActive: true },
  });
  if (campaigns.length === 0) {
    return NextResponse.json({
      campaigns: 0,
      sent: 0,
      failed: 0,
      message: "Sin campañas activas",
    });
  }

  const publicUrl = process.env.OUTREACH_PUBLIC_URL;
  const footer = {
    legalName: process.env.OUTREACH_SENDER_LEGAL_NAME ?? "",
    rut: process.env.OUTREACH_SENDER_RUT ?? "",
    address: process.env.OUTREACH_SENDER_ADDRESS ?? "",
  };
  if (!publicUrl || !footer.legalName || !footer.rut || !footer.address) {
    return NextResponse.json(
      {
        error:
          "Faltan variables de entorno de outreach (OUTREACH_PUBLIC_URL / OUTREACH_SENDER_LEGAL_NAME / OUTREACH_SENDER_RUT / OUTREACH_SENDER_ADDRESS) — ver VARIABLES_ENTORNO.md",
      },
      { status: 200 } // 200 a propósito: es un error de config, no algo que Vercel deba reintentar
    );
  }

  const systemUser = await ensureSystemUser();

  // Pool de empresas elegibles por campaña. Query POR EMPRESA — así "1 correo
  // por empresa" sale del modelo y no de un `take` sobre contactos. Cada empresa
  // trae `include`-ados sólo sus contactos elegibles (email, no baja, no rebote).
  const perCampaign = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      companies: await prisma.company.findMany({
        where: {
          isActive: true,
          segment: campaign.segment,
          outreachSends: { none: { campaignId: campaign.id } },
          // Exclusión por gestión telefónica: `isCompanyPhoneManaged` como filtro.
          NOT: {
            contacts: {
              some: { callStatus: { not: null, notIn: ["POR_LLAMAR"] } },
            },
          },
          contacts: {
            some: {
              email: { not: null },
              optOut: false,
              emailStatus: { not: "REBOTADO" },
            },
          },
        },
        include: {
          contacts: {
            where: {
              email: { not: null },
              optOut: false,
              emailStatus: { not: "REBOTADO" },
            },
          },
        },
        orderBy: { createdAt: "asc" }, // FIFO: los prospectos más antiguos primero
      }),
    }))
  );

  // Presupuesto de hoy = tope global menos lo ya enviado hoy (sólo cuentan los
  // `OutreachSend` con `sentAt` — los `FALLIDO`/`EN_COLA` no lo tienen).
  const enviadosHoy = await prisma.outreachSend.count({
    where: { sentAt: { gte: inicioDelDiaUTC() } },
  });
  const presupuesto = Math.max(0, globalCap - enviadosHoy);

  const poolSizes: Record<string, number> = {};
  for (const { campaign, companies } of perCampaign) {
    poolSizes[campaign.id] = companies.length;
  }
  const allocation = allocateDailyBudget(
    campaigns.map((c) => ({ id: c.id, dailyCap: c.dailyCap })),
    poolSizes,
    presupuesto
  );

  let totalSent = 0;
  let totalFailed = 0;
  const results: Array<{
    campaign: string;
    budget: number;
    pool: number;
    sent: number;
    failed: number;
  }> = [];

  for (const { campaign, companies } of perCampaign) {
    const template = getTemplate(campaign.templateKey);
    const cuota = allocation[campaign.id] ?? 0;
    const objetivo = companies.slice(0, cuota);

    let attachment:
      | { filename: string; contentType: string; contentBase64: string }
      | undefined;
    if (objetivo.length > 0 && campaign.pdfBlobUrl) {
      const pdfRes = await fetch(campaign.pdfBlobUrl);
      if (pdfRes.ok) {
        const buffer = Buffer.from(await pdfRes.arrayBuffer());
        attachment = {
          filename: "coopera-pro-pallets.pdf",
          contentType: "application/pdf",
          contentBase64: buffer.toString("base64"),
        };
      }
    }

    let sent = 0;
    let failed = 0;

    for (const company of objetivo) {
      // Un solo contacto por empresa (spec §7.5-7.6).
      const contactId = pickCompanyContact(
        company.contacts.map((c) => ({
          id: c.id,
          email: c.email as string,
          createdAt: c.createdAt,
        }))
      );
      const contact = company.contacts.find((c) => c.id === contactId);
      if (!contact) continue; // defensivo: la query garantiza ≥1 contacto elegible

      try {
        let optOutToken = contact.optOutToken;
        if (!optOutToken) {
          optOutToken = generateOptOutToken();
          await prisma.contact.update({
            where: { id: contact.id },
            data: { optOutToken },
          });
        }

        const email = template(
          {
            empresa: company.name,
            comuna: company.commune,
            rubro: company.category,
            contacto: contact.name === company.name ? null : contact.name,
          },
          {
            ...footer,
            unsubscribeUrl: buildUnsubscribeUrl(publicUrl, optOutToken),
          }
        );

        const result = await sendMail({
          to: contact.email as string,
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachment,
        });

        await prisma.outreachSend.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            companyId: company.id,
            status: "ENVIADO",
            sentAt: new Date(),
            messageId: result.messageId,
            attempts: 1,
          },
        });
        await prisma.activity.create({
          data: {
            type: "EMAIL",
            description: `Outreach automático (${campaign.name}): ${email.subject}`,
            companyId: company.id,
            contactId: contact.id,
            completedAt: new Date(),
            createdById: systemUser.id,
          },
        });

        sent++;
        totalSent++;
      } catch (e) {
        failed++;
        totalFailed++;
        await prisma.outreachSend.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            companyId: company.id,
            status: "FALLIDO",
            error: e instanceof Error ? e.message : "Error desconocido",
            attempts: 1,
          },
        });
      }

      await sleep(jitterMs());
    }

    results.push({
      campaign: campaign.name,
      budget: cuota,
      pool: companies.length,
      sent,
      failed,
    });
  }

  return NextResponse.json({
    campaigns: campaigns.length,
    globalCap,
    presupuesto,
    sent: totalSent,
    failed: totalFailed,
    results,
  });
}
