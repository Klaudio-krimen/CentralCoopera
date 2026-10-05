import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import {
  hashToken,
  esTokenUtilizable,
  consumirTokenReset,
  TokenResetError,
} from "@/lib/finanzas/reset";
import { withAudit } from "@/lib/finanzas/audit";

const MENSAJE_INVALIDO = "Enlace inválido o expirado";

// POST /api/auth/recuperar/confirmar — canjea el token y fija la
// contraseña nueva. Pública, como /api/auth/recuperar: el token en sí es
// la credencial. Mismo mensaje de error en los tres casos de fallo
// (inexistente, ya usado, expirado) para no regalarle al atacante si un
// token existió alguna vez.
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return apiError(MENSAJE_INVALIDO);
  const { token, password } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token.trim()) {
    return apiError(MENSAJE_INVALIDO, 400);
  }
  if (typeof password !== "string" || password.length < 8) {
    return apiError("La contraseña debe tener al menos 8 caracteres", 400);
  }

  try {
    const fila = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { email: true, role: true } } },
    });

    if (!fila || !esTokenUtilizable(fila)) {
      return apiError(MENSAJE_INVALIDO, 400);
    }

    const hashed = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const ahora = new Date();
      await consumirTokenReset(tx, fila, ahora);
      await tx.user.update({
        where: { id: fila.userId },
        data: { password: hashed, passwordChangedAt: ahora },
      });
      await withAudit(tx, {
        actorId: fila.userId,
        actorEmail: fila.user.email,
        actorRole: fila.user.role,
        action: "EDITAR",
        entityType: "User",
        entityId: fila.userId,
        after: { password: hashed, passwordChangedAt: ahora },
      });
    });
  } catch (error) {
    if (error instanceof TokenResetError)
      return apiError(MENSAJE_INVALIDO, 400);
    return apiError("No se pudo actualizar la contraseña", 500);
  }

  return NextResponse.json({ ok: true });
}
