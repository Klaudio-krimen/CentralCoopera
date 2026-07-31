import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { ensureWebhookConfig, generateWebhookSecret } from "@/lib/webhook";
import { hasModuleAccess } from "@/lib/access";

function buildUrl(origin: string, secret: string) {
  return `${origin}/api/webhooks/leads?secret=${secret}`;
}

// GET /api/configuracion/webhook — estado actual (habilitado + URL con secreto)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const config = await ensureWebhookConfig();
  return NextResponse.json({
    enabled: config.enabled,
    url: buildUrl(req.nextUrl.origin, config.secret),
  });
}

// PATCH /api/configuracion/webhook — { enabled?: boolean, regenerate?: boolean }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  await ensureWebhookConfig();
  const { enabled, regenerate } = await req.json();

  const config = await prisma.crmWebhookConfig.update({
    where: { id: "singleton" },
    data: {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(regenerate ? { secret: generateWebhookSecret() } : {}),
    },
  });

  return NextResponse.json({
    enabled: config.enabled,
    url: buildUrl(req.nextUrl.origin, config.secret),
  });
}
