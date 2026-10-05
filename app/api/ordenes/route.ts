import { PickupOrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasOperationsAccess } from "@/lib/operations/authorization";
import { apiError } from "@/lib/utils";

function isOrderStatus(value: string): value is PickupOrderStatus {
  return (Object.values(PickupOrderStatus) as string[]).includes(value);
}

function positiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// GET /api/ordenes?status=...&driverId=me&code=...&page=...&limit=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user))
    return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status");
  const driverParam = searchParams.get("driverId");
  const codeParam = searchParams.get("code")?.trim();
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(positiveInteger(searchParams.get("limit"), 25), 100);

  let statuses: PickupOrderStatus[] | undefined;
  if (statusParam) {
    const rawStatuses = statusParam.split(",").map((status) => status.trim());
    if (!rawStatuses.every(isOrderStatus))
      return apiError("Estado de orden inválido");
    statuses = rawStatuses;
  }

  const driverId =
    session.user.role === "CHOFER"
      ? session.user.id
      : driverParam === "me"
        ? session.user.id
        : driverParam || undefined;

  const where: Prisma.PickupOrderWhereInput = {
    ...(driverId ? { driverId } : {}),
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(codeParam ? { orderCode: { contains: codeParam.toUpperCase() } } : {}),
  };
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.pickupOrder.findMany({
      where,
      include: {
        company: { select: { name: true } },
        driver: { select: { name: true } },
        items: {
          select: {
            id: true,
            materialName: true,
            declaredQuantity: true,
            unit: true,
          },
        },
        _count: { select: { discrepancies: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.pickupOrder.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

// POST /api/ordenes — crear orden propia; reservado al flujo del chofer.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user) || session.user.role !== "CHOFER") {
    return apiError("Acceso denegado", 403);
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body inválido");
  }
  const companyId = (body as { companyId?: unknown }).companyId;
  if (typeof companyId !== "string" || !companyId.trim()) {
    return apiError("companyId es requerido");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId, isActive: true },
    select: { id: true },
  });
  if (!company) return apiError("Empresa no encontrada o inactiva", 404);

  const order = await prisma.$transaction(async (tx) => {
    const counter = await tx.orderCounter.update({
      where: { id: "singleton" },
      data: { count: { increment: 1 } },
    });
    const year = new Date().getFullYear();
    const orderCode = `RET-${year}-${String(counter.count).padStart(4, "0")}`;

    return tx.pickupOrder.create({
      data: {
        orderCode,
        status: "EN_RETIRO",
        driverId: session.user.id,
        companyId: company.id,
      },
      include: { company: { select: { name: true } } },
    });
  });

  return NextResponse.json(order, { status: 201 });
}
