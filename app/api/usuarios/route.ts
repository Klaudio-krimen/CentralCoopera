import { ModuleAccess, Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hash } from "bcryptjs";
import { withAudit } from "@/lib/finanzas/audit";
import { sendMail } from "@/lib/outreach/smtp";

// GET /api/usuarios?role=CHOFER
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (session.user.role !== "ADMIN") return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");

  const parsedRole = role
    ? Object.values(UserRole).find((value) => value === role)
    : undefined;
  if (role && !parsedRole) return apiError("Rol inválido");

  const users = await prisma.user.findMany({
    where: parsedRole ? { role: parsedRole } : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      moduleAccess: true,
      isActive: true,
      createdAt: true,
      _count: { select: { ordersAsDriver: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

const VALID_MODULES = Object.values(ModuleAccess);

const FINANCE_MODULES: ModuleAccess[] = ["FINANZAS", "FINANZAS_LECTURA"];

/** true si moduleAccess tiene FINANZAS y/o FINANZAS_LECTURA. */
function tieneModulosFinanzas(moduleAccess: readonly ModuleAccess[]): boolean {
  return moduleAccess.some((m) => FINANCE_MODULES.includes(m));
}

/** Envía el aviso de cambio de permisos de Finanzas. No lanza si falla el
 *  envío — la auditoría ya quedó escrita, que es la garantía dura; el
 *  correo es el aviso, no la evidencia. */
async function notificarCambioPermisosFinanzas(
  actorEmail: string,
  targetEmail: string,
  antes: readonly ModuleAccess[],
  despues: readonly ModuleAccess[]
) {
  const destinatarios = (process.env.FINANZAS_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const destinatario of destinatarios) {
    try {
      await sendMail({
        to: destinatario,
        subject: "Cambio de permisos de Finanzas — Coopera Pro",
        text: `${actorEmail} cambió los permisos de Finanzas de ${targetEmail}.\nAntes: ${antes.join(", ") || "ninguno"}\nAhora: ${despues.join(", ") || "ninguno"}`,
        html: `<p><strong>${actorEmail}</strong> cambió los permisos de Finanzas de <strong>${targetEmail}</strong>.</p><p>Antes: ${antes.join(", ") || "ninguno"}<br/>Ahora: ${despues.join(", ") || "ninguno"}</p>`,
      });
    } catch {
      console.warn("[finanzas] fallo al notificar cambio de permisos", {
        destinatario,
      });
    }
  }
}

/** true si `input` es un array donde cada valor es un módulo válido (array vacío incluido). */
function isValidModuleAccess(input: unknown): input is ModuleAccess[] {
  return (
    Array.isArray(input) &&
    input.every(
      (module): module is ModuleAccess =>
        typeof module === "string" &&
        VALID_MODULES.some((valid) => valid === module)
    )
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUserRole(value: unknown): UserRole | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(UserRole).find((role) => role === value);
}

// POST /api/usuarios — crear usuario (solo ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (session.user.role !== "ADMIN") {
    console.warn("[auth] acceso denegado a POST /api/usuarios", {
      userId: session.user.id,
      role: session.user.role,
    });
    return apiError("Acceso denegado", 403);
  }

  const body: unknown = await req.json().catch(() => null);
  if (!isJsonObject(body)) return apiError("Body inválido");
  const { name, email, password, role, moduleAccess } = body;

  if (typeof name !== "string" || !name.trim())
    return apiError("Nombre requerido");
  if (typeof email !== "string" || !email.trim())
    return apiError("Email requerido");
  if (typeof password !== "string" || !password.trim())
    return apiError("Contraseña requerida");
  if (password.length < 8)
    return apiError("La contraseña debe tener al menos 8 caracteres");
  const userRole = parseUserRole(role);
  if (!userRole) return apiError("Rol inválido");
  const modules: unknown = moduleAccess === undefined ? [] : moduleAccess;
  if (!isValidModuleAccess(modules)) return apiError("Módulos inválidos");

  const existing = await prisma.user.findUnique({
    where: { email: email.trim() },
  });
  if (existing) return apiError("Ya existe un usuario con ese email");

  const hashed = await hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: userRole,
        moduleAccess: modules,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        moduleAccess: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (created.role === "CHOFER") {
      await tx.tracker.upsert({
        where: { userId: created.id },
        update: { label: created.name, isActive: true },
        create: {
          label: created.name,
          type: "USUARIO",
          kind: "CHOFER",
          userId: created.id,
        },
      });
    }
    return created;
  });

  return NextResponse.json(user, { status: 201 });
}

// PATCH /api/usuarios — editar o desactivar (solo ADMIN)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (session.user.role !== "ADMIN") {
    console.warn("[auth] acceso denegado a PATCH /api/usuarios", {
      userId: session.user.id,
      role: session.user.role,
    });
    return apiError("Acceso denegado", 403);
  }

  const body: unknown = await req.json().catch(() => null);
  if (!isJsonObject(body)) return apiError("Body inválido");
  const { id, name, email, password, role, moduleAccess, isActive } = body;

  if (typeof id !== "string" || !id.trim()) return apiError("id requerido");
  if (name !== undefined && typeof name !== "string")
    return apiError("Nombre inválido");
  if (email !== undefined && typeof email !== "string")
    return apiError("Email inválido");
  if (password !== undefined && typeof password !== "string")
    return apiError("Contraseña inválida");
  if (isActive !== undefined && typeof isActive !== "boolean")
    return apiError("Estado inválido");
  const userRole = role === undefined ? undefined : parseUserRole(role);
  if (role !== undefined && !userRole) return apiError("Rol inválido");
  if (moduleAccess !== undefined && !isValidModuleAccess(moduleAccess)) {
    return apiError("Módulos inválidos");
  }

  // Prevent self-deactivation
  if (id === session.user.id && isActive === false) {
    return apiError("No puedes desactivarte a ti mismo");
  }
  // Prevent self-demotion (te dejaría sin acceso al panel de usuarios)
  if (
    id === session.user.id &&
    userRole !== undefined &&
    userRole !== UserRole.ADMIN
  ) {
    return apiError("No puedes quitarte el rol de administrador a ti mismo");
  }

  const previousUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true, email: true, moduleAccess: true },
  });
  if (!previousUser) return apiError("Usuario no encontrado", 404);

  // Estado resultante tras este PATCH — se calcula ANTES del chequeo de
  // contraseña de más abajo. Mirar sólo el estado previo dejaría colar el
  // caso "otorgar FINANZAS y fijar password en la misma llamada".
  const moduleAccessFinal: ModuleAccess[] =
    moduleAccess === undefined ? previousUser.moduleAccess : moduleAccess;

  // Cierra el hallazgo #4: un ADMIN no elige la contraseña de una cuenta de
  // Finanzas, ni de una que esté por pasar a serlo en esta misma llamada.
  // Puede disparar el enlace de /api/auth/recuperar; no puede fijarla él
  // mismo.
  if (
    password?.trim() &&
    (tieneModulosFinanzas(previousUser.moduleAccess) ||
      tieneModulosFinanzas(moduleAccessFinal))
  ) {
    return apiError(
      "No puedes fijar la contraseña de una cuenta de Finanzas. Usa el enlace de recuperación.",
      403
    );
  }

  const data: Prisma.UserUpdateInput = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (isActive !== undefined) data.isActive = isActive;
  if (password?.trim()) {
    if (password.length < 8)
      return apiError("La contraseña debe tener al menos 8 caracteres");
    data.password = await hash(password, 12);
    data.passwordChangedAt = new Date();
  }
  if (userRole !== undefined) data.role = userRole;
  if (moduleAccess !== undefined) {
    data.moduleAccess = moduleAccess;
  }

  const antesFinanzas = previousUser.moduleAccess.filter((m) =>
    FINANCE_MODULES.includes(m)
  );
  const despuesFinanzas = moduleAccessFinal.filter((m) =>
    FINANCE_MODULES.includes(m)
  );
  const cambioPermisosFinanzas =
    moduleAccess !== undefined &&
    JSON.stringify([...antesFinanzas].sort()) !==
      JSON.stringify([...despuesFinanzas].sort());

  const user = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        moduleAccess: true,
        isActive: true,
      },
    });

    if (cambioPermisosFinanzas) {
      await withAudit(tx, {
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        actorRole: session.user.role,
        action: "CAMBIAR_PERMISOS",
        entityType: "User",
        entityId: id,
        before: { moduleAccess: previousUser.moduleAccess },
        after: { moduleAccess: actualizado.moduleAccess },
      });
    }

    const shouldTrackAsChofer =
      actualizado.role === "CHOFER" && actualizado.isActive;
    if (shouldTrackAsChofer) {
      await tx.tracker.upsert({
        where: { userId: actualizado.id },
        update: { label: actualizado.name, isActive: true },
        create: {
          label: actualizado.name,
          type: "USUARIO",
          kind: "CHOFER",
          userId: actualizado.id,
        },
      });
    } else if (
      actualizado.role === "CHOFER" ||
      previousUser.role === "CHOFER"
    ) {
      await tx.tracker.updateMany({
        where: { userId: actualizado.id },
        data: { isActive: false },
      });
    }

    return actualizado;
  });

  // Después de que la transacción confirmó, nunca antes: el aviso no debe
  // salir si el cambio termina revirtiéndose por un error posterior.
  if (cambioPermisosFinanzas) {
    await notificarCambioPermisosFinanzas(
      session.user.email ?? "",
      user.email,
      antesFinanzas,
      despuesFinanzas
    );
  }

  return NextResponse.json(user);
}

// DELETE /api/usuarios?id=xxx — eliminar usuario (solo ADMIN)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (session.user.role !== "ADMIN") {
    console.warn("[auth] acceso denegado a DELETE /api/usuarios", {
      userId: session.user.id,
      role: session.user.role,
    });
    return apiError("Acceso denegado", 403);
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("id requerido");

  if (id === session.user.id) {
    return apiError("No puedes eliminar tu propia cuenta");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return apiError("Usuario no encontrado", 404);

  if (target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: id } },
    });
    if (otherAdmins === 0) {
      return apiError("No puedes eliminar al único administrador");
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (error: unknown) {
    // Foreign key: el usuario tiene historial (órdenes, evidencias, discrepancias, etc.).
    // Prisma mapea la mayoría de estas violaciones a P2003/P2014, pero las relaciones
    // requeridas (ej. PickupOrder.driverId) generan un RESTRICT que Postgres reporta con
    // el código 23001 en vez de 23503 — Prisma no lo reconoce como "known error" y lo
    // envuelve en PrismaClientUnknownRequestError sin `.code`, así que hay que detectarlo
    // también por el mensaje.
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : undefined;
    const errorMessage = error instanceof Error ? error.message : "";
    const isForeignKeyViolation =
      errorCode === "P2003" ||
      errorCode === "P2014" ||
      /foreign key constraint/i.test(errorMessage);
    if (isForeignKeyViolation) {
      return apiError(
        "No se puede eliminar: este usuario tiene actividad registrada (órdenes, evidencias u otro historial). Desactívalo en su lugar.",
        409
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
