import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearEmpleadoSchema } from "@/lib/finanzas/schemas";
import { normalizarRut, esRutValido } from "@/lib/finanzas/rut";
import { cifrar, ultimos4 } from "@/lib/finanzas/crypto";
import { serializeEmployee } from "@/lib/finanzas/serialize";
import { withAudit } from "@/lib/finanzas/audit";

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

// GET /api/finanzas/empleados — lista paginada, filtro por status (ACTIVO por defecto)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "ACTIVO";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10) ||
        PAGE_SIZE_DEFAULT
    )
  );

  const where = { status: status as "ACTIVO" | "DESVINCULADO" };

  const [empleados, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({
    data: empleados.map((e) => serializeEmployee(e, session.user)),
    meta: { page, pageSize, total },
  });
}

// POST /api/finanzas/empleados — crea trabajador
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearEmpleadoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  if (!esRutValido(input.rut)) {
    return apiError("RUT inválido", 400);
  }
  const rut = normalizarRut(input.rut);

  const existente = await prisma.employee.findUnique({ where: { rut } });
  if (existente) return apiError("Ya existe un trabajador con ese RUT", 409);

  const bankAccountEnc = input.bankAccount ? cifrar(input.bankAccount) : null;
  const bankAccountLast4 = input.bankAccount
    ? ultimos4(input.bankAccount)
    : null;

  const empleado = await prisma.$transaction(async (tx) => {
    const creado = await tx.employee.create({
      data: {
        fullName: input.fullName,
        rut,
        email: input.email ?? null,
        phone: input.phone ?? null,
        hiredAt: input.hiredAt,
        baseSalary: input.baseSalary,
        afp: input.afp ?? null,
        health: input.health ?? null,
        bankName: input.bankName ?? null,
        bankAccountType: input.bankAccountType ?? null,
        bankAccountEnc,
        bankAccountLast4,
      },
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "CREAR",
      entityType: "Employee",
      entityId: creado.id,
      after: creado,
    });

    return creado;
  });

  return NextResponse.json(serializeEmployee(empleado, session.user), {
    status: 201,
  });
}
