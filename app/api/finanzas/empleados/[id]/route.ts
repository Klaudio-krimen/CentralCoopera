import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { editarEmpleadoSchema } from "@/lib/finanzas/schemas";
import { normalizarRut, esRutValido } from "@/lib/finanzas/rut";
import { cifrar, ultimos4 } from "@/lib/finanzas/crypto";
import { serializeEmployee } from "@/lib/finanzas/serialize";
import { withAudit } from "@/lib/finanzas/audit";

// GET /api/finanzas/empleados/[id] — ficha del trabajador
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const empleado = await prisma.employee.findUnique({
    where: { id: params.id },
  });
  if (!empleado) return apiError("No encontrado", 404);

  return NextResponse.json(serializeEmployee(empleado, session.user));
}

// PATCH /api/finanzas/empleados/[id] — edita, con auditoría before/after
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const anterior = await prisma.employee.findUnique({
    where: { id: params.id },
  });
  if (!anterior) return apiError("No encontrado", 404);

  const body = await req.json();
  const parsed = editarEmpleadoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  if (input.rut !== undefined && !esRutValido(input.rut)) {
    return apiError("RUT inválido", 400);
  }

  if (input.status === "DESVINCULADO" && anterior.status !== "DESVINCULADO") {
    return apiError(
      "Usa POST /api/finanzas/empleados/[id]/desvincular para dar de baja: purga los datos bancarios y de contacto en la misma transacción",
      400
    );
  }

  const data: Record<string, unknown> = {};
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.rut !== undefined) data.rut = normalizarRut(input.rut);
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.hiredAt !== undefined) data.hiredAt = input.hiredAt;
  if (input.baseSalary !== undefined) data.baseSalary = input.baseSalary;
  if (input.afp !== undefined) data.afp = input.afp;
  if (input.health !== undefined) data.health = input.health;
  if (input.bankName !== undefined) data.bankName = input.bankName;
  if (input.bankAccountType !== undefined)
    data.bankAccountType = input.bankAccountType;
  if (input.status !== undefined) data.status = input.status;
  if (input.bankAccount !== undefined) {
    data.bankAccountEnc = input.bankAccount ? cifrar(input.bankAccount) : null;
    data.bankAccountLast4 = input.bankAccount
      ? ultimos4(input.bankAccount)
      : null;
  }

  const empleado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.employee.update({
      where: { id: params.id },
      data,
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "EDITAR",
      entityType: "Employee",
      entityId: actualizado.id,
      before: anterior,
      after: actualizado,
    });

    return actualizado;
  });

  return NextResponse.json(serializeEmployee(empleado, session.user));
}
