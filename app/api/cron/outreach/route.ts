import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/outreach/smtp";
import { getTemplate } from "@/lib/outreach/templates";
import {
  generateOptOutToken,
  buildUnsubscribeUrl,
} from "@/lib/outreach/unsubscribe";
import { ensureSystemUser } from "@/lib/outreach/system-user";

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

// GET /api/cron/outreach — lote diario de outreach. Idempotente: un
// contacto que ya tiene un OutreachSend para la campaña activa nunca vuelve
// a aparecer en la query de elegibles, así que correr el cron dos veces el
// mismo día no reenvía nada. Responde 200 siempre (incluso sin campaña
// activa o sin elegibles) para que Vercel no reintente sobre un lote que ya
// mandó parte de los correos.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  let totalSent = 0;
  let totalFailed = 0;
  const results: Array<{ campaign: string; sent: number; failed: number }> = [];

  for (const campaign of campaigns) {
    const template = getTemplate(campaign.templateKey);

    const eligible = await prisma.contact.findMany({
      where: {
        email: { not: null },
        optOut: false,
        emailStatus: { not: "REBOTADO" },
        company: { isActive: true, segment: campaign.segment },
        outreachSends: { none: { campaignId: campaign.id } },
      },
      include: { company: true },
      take: campaign.dailyCap,
    });

    let attachment:
      | { filename: string; contentType: string; contentBase64: string }
      | undefined;
    if (campaign.pdfBlobUrl) {
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

    for (const contact of eligible) {
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
            empresa: contact.company.name,
            comuna: contact.company.commune,
            rubro: contact.company.category,
            contacto:
              contact.name === contact.company.name ? null : contact.name,
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
            companyId: contact.companyId,
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
            companyId: contact.companyId,
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
            companyId: contact.companyId,
            status: "FALLIDO",
            error: e instanceof Error ? e.message : "Error desconocido",
            attempts: 1,
          },
        });
      }

      await sleep(jitterMs());
    }

    results.push({ campaign: campaign.name, sent, failed });
  }

  return NextResponse.json({
    campaigns: campaigns.length,
    sent: totalSent,
    failed: totalFailed,
    results,
  });
}
