import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function page(title: string, message: string, status: number = 200) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#222">
  <h1 style="font-size:20px">${title}</h1>
  <p>${message}</p>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET /api/outreach/unsubscribe?t=<token> — pública, sin login (así lo pide
// PROSPECCION_OUTREACH.md §6: quien recibe el correo no tiene cuenta en el
// CRM). Marca optOut=true de forma permanente para el contacto — no es por
// campaña, es para siempre (§9, regla operativa 3).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return page("Enlace inválido", "Este enlace de baja no es válido.", 400);
  }

  const contact = await prisma.contact.findUnique({
    where: { optOutToken: token },
  });
  if (!contact) {
    return page(
      "Enlace inválido",
      "Este enlace de baja no es válido o ya expiró.",
      404
    );
  }

  if (!contact.optOut) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { optOut: true, optOutAt: new Date() },
    });
  }

  return page(
    "Listo",
    "No volverás a recibir este tipo de correos de Coopera Pro. Si fue un error, escríbenos y lo revertimos."
  );
}
