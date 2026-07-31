import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hash } from "bcryptjs";

// GET /api/usuarios?role=CHOFER
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (session.user.role !== "ADMIN") return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: role ? { role: role as any } : {},
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

const VALID_MODULES = ["OPERACIONES", "CRM", "INVENTARIO"];

/** true si `input` es un array donde cada valor es un módulo válido (array vacío incluido). */
function isValidModuleAccess(input: unknown): input is string[] {
  return Array.isArray(input) && input.every((m) => VALID_MODULES.includes(m));
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

  const { name, email, password, role, moduleAccess } = await req.json();

  if (!name?.trim()) return apiError("Nombre requerido");
  if (!email?.trim()) return apiError("Email requerido");
  if (!password?.trim()) return apiError("Contraseña requerida");
  if (password.length < 8)
    return apiError("La contraseña debe tener al menos 8 caracteres");
  if (!["CHOFER", "RECEPCION", "ADMIN", "VENTAS", "BODEGA"].includes(role)) {
    return apiError("Rol inválido");
  }
  const modules = moduleAccess ?? [];
  if (!isValidModuleAccess(modules)) return apiError("Módulos inválidos");

  const existing = await prisma.user.findUnique({
    where: { email: email.trim() },
  });
  if (existing) return apiError("Ya existe un usuario con ese email");

  const hashed = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role,
      moduleAccess: modules as any,
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

  const { id, name, email, password, role, moduleAccess, isActive } =
    await req.json();

  if (!id) return apiError("id requerido");

  // Prevent self-deactivation
  if (id === session.user.id && isActive === false) {
    return apiError("No puedes desactivarte a ti mismo");
  }
  // Prevent self-demotion (te dejaría sin acceso al panel de usuarios)
  if (id === session.user.id && role !== undefined && role !== "ADMIN") {
    return apiError("No puedes quitarte el rol de administrador a ti mismo");
  }

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (isActive !== undefined) data.isActive = isActive;
  if (password?.trim()) {
    if (password.length < 8)
      return apiError("La contraseña debe tener al menos 8 caracteres");
    data.password = await hash(password, 12);
  }
  if (role !== undefined) {
    if (!["CHOFER", "RECEPCION", "ADMIN", "VENTAS", "BODEGA"].includes(role)) {
      return apiError("Rol inválido");
    }
    data.role = role;
  }
  if (moduleAccess !== undefined) {
    if (!isValidModuleAccess(moduleAccess))
      return apiError("Módulos inválidos");
    data.moduleAccess = moduleAccess;
  }

  const user = await prisma.user.update({
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
  } catch (e: any) {
    // Foreign key: el usuario tiene historial (órdenes, evidencias, discrepancias, etc.)
    if (e?.code === "P2003" || e?.code === "P2014") {
      return apiError(
        "No se puede eliminar: este usuario tiene actividad registrada (órdenes, evidencias u otro historial). Desactívalo en su lugar.",
        409
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
