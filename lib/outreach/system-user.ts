import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SYSTEM_USER_EMAIL = "sistema-outreach@cooperapro.cl";

// Activity.createdById es una FK obligatoria a User — no hay forma de
// registrar la línea de tiempo de un envío automático del cron sin un
// usuario dueño. En vez de aflojar el schema (afectaría todo Activity, no
// solo outreach), se usa un usuario "sistema" de una sola fila: isActive
// false (lib/auth.ts bloquea login de usuarios inactivos) y contraseña
// aleatoria que nunca se entrega a nadie. Mismo patrón singleton que
// ensureWebhookConfig en lib/webhook.ts.
export async function ensureSystemUser() {
  const existing = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
  });
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(32).toString("hex");
  return prisma.user.create({
    data: {
      name: "Sistema — Outreach automático",
      email: SYSTEM_USER_EMAIL,
      password: await bcrypt.hash(randomPassword, 10),
      role: "VENTAS",
      isActive: false,
    },
  });
}
