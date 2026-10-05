import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { ensureWebhookConfig, generateWebhookSecret } from "@/lib/webhook";
import { hasModuleAccess } from "@/lib/access";

function response(
  endpoint: string,
  enabled: boolean,
  secret?: string
): NextResponse {
  return NextResponse.json(
    {
      enabled,
      endpoint,
      headerName: "x-webhook-secret",
      ...(secret ? { secret } : {}),
    },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}

function endpointFor(req: NextRequest): string {
  return new URL("/api/webhooks/leads", req.nextUrl.origin).toString();
}

// GET returns the endpoint but never re-exposes the stored secret.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const config = await ensureWebhookConfig();
  return response(endpointFor(req), config.enabled);
}

// PATCH /api/configuracion/webhook — { enabled?: boolean, regenerate?: boolean }
// A rotated secret is returned once, separately from the URL.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const body: unknown = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return apiError("Body inválido");
  }
  const input = body as { enabled?: unknown; regenerate?: unknown };
  if (
    (input.enabled !== undefined && typeof input.enabled !== "boolean") ||
    (input.regenerate !== undefined && typeof input.regenerate !== "boolean") ||
    (input.enabled === undefined && input.regenerate !== true)
  ) {
    return apiError("Debe indicar enabled o regenerate");
  }

  await ensureWebhookConfig();
  const regenerate = input.regenerate === true;
  const config = await prisma.crmWebhookConfig.update({
    where: { id: "singleton" },
    data: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(regenerate ? { secret: generateWebhookSecret() } : {}),
    },
  });

  return response(
    endpointFor(req),
    config.enabled,
    regenerate ? config.secret : undefined
  );
}
