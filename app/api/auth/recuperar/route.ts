import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/finanzas/rate-limit";
import { generarToken, hashToken, armarEnlace } from "@/lib/finanzas/reset";
import { withAudit } from "@/lib/finanzas/audit";
import { sendMail } from "@/lib/outreach/smtp";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_RATE_LIMIT = 3;
const RESET_RATE_WINDOW_MS = 60 * 60 * 1000;

// POST /api/auth/recuperar — dispara el enlace de recuperación. Pública:
// el matcher del middleware excluye /api/auth. Responde 200 idéntico
// exista o no la cuenta, para no filtrar qué correos están registrados.
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (typeof email === "string" && email.trim()) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user && user.isActive) {
      const claveLimite = `reset:${user.id}`;
      const limite = await checkRateLimit(
        prisma,
        claveLimite,
        RESET_RATE_LIMIT,
        RESET_RATE_WINDOW_MS
      );

      if (limite.ok) {
        const token = generarToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

        await prisma.$transaction(async (tx) => {
          await tx.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          });
          await withAudit(tx, {
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "CREAR",
            entityType: "PasswordResetToken",
            entityId: user.id,
          });
        });

        const baseUrl = process.env.NEXTAUTH_URL ?? "";
        const enlace = armarEnlace(baseUrl, token);

        try {
          await sendMail({
            to: user.email,
            subject: "Recupera tu contraseña — Coopera Pro",
            text: `Usa este enlace para fijar una contraseña nueva. Vence en 30 minutos y sólo funciona una vez:\n${enlace}`,
            html: `<p>Usa este enlace para fijar una contraseña nueva. Vence en 30 minutos y sólo funciona una vez:</p><p><a href="${enlace}">${enlace}</a></p>`,
          });
        } catch {
          console.warn("[finanzas] fallo al enviar correo de recuperación", {
            userId: user.id,
          });
        }
      } else {
        // Rate limit excedido: no emite token ni correo, pero sí audita —
        // igual que un éxito, la respuesta de más abajo no lo delata.
        await withAudit(prisma, {
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          action: "CREAR",
          entityType: "PasswordResetToken",
          entityId: user.id,
          after: { rateLimited: true },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
