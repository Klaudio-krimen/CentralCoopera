import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess, canWriteFinance } from "@/lib/access";
import { crearProveedorSchema } from "@/lib/finanzas/schemas";
import { cifrar, ultimos4 } from "@/lib/finanzas/crypto";
import { serializeSupplier } from "@/lib/finanzas/serialize";
import { withAudit } from "@/lib/finanzas/audit";

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

// GET /api/finanzas/proveedores — lista paginada de activos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10) ||
        PAGE_SIZE_DEFAULT
    )
  );

  const where = { isActive: true };

  const [proveedores, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return NextResponse.json({
    data: proveedores.map((p) => serializeSupplier(p, session.user)),
    meta: { page, pageSize, total },
  });
}

// POST /api/finanzas/proveedores — crea proveedor
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const body = await req.json();
  const parsed = crearProveedorSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  const input = parsed.data;

  const bankAccountEnc = input.bankAccount ? cifrar(input.bankAccount) : null;
  const bankAccountLast4 = input.bankAccount
    ? ultimos4(input.bankAccount)
    : null;

  const proveedor = await prisma.$transaction(async (tx) => {
    const creado = await tx.supplier.create({
      data: {
        name: input.name,
        rut: input.rut ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        bankName: input.bankName ?? null,
        bankAccountEnc,
        bankAccountLast4,
      },
    });

    await withAudit(tx, {
      actorId: session.user.id,
      actorEmail: session.user.email ?? "",
      actorRole: session.user.role,
      action: "CREAR",
      entityType: "Supplier",
      entityId: creado.id,
      after: creado,
    });

    return creado;
  });

  return NextResponse.json(serializeSupplier(proveedor, session.user), {
    status: 201,
  });
}
