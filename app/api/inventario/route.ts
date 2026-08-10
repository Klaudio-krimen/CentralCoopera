import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";
import type {
  Prisma,
  InventoryCategory,
  InventoryCondition,
} from "@prisma/client";

const CATEGORIAS = [
  "MATERIA_PRIMA",
  "PALLET",
  "PINTURA",
  "MATERIAL",
  "HERRAMIENTA",
  "OTRO",
];
const CONDICIONES = ["NUEVO", "USADO"];

// GET /api/inventario — lista paginada: búsqueda (nombre/marca), filtro por
// categoría y condición, orden por numero (correlativo visible de la planilla)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const condition = searchParams.get("condition");
  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const where: Prisma.InventoryItemWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category && CATEGORIAS.includes(category)) {
    where.category = category as InventoryCategory;
  }
  if (condition && CONDICIONES.includes(condition)) {
    where.condition = condition as InventoryCondition;
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { numero: "asc" },
      take,
      skip,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: construirMeta(total, page, pageSize),
  });
}

// POST /api/inventario — crea un ítem de la planilla. El correlativo `numero`
// se asigna dentro de la transacción como max(numero)+1: nunca se reutiliza,
// nunca se renumera, así "el 23" de la bodega no cambia de significado.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const body = await req.json();
  const {
    name,
    category,
    details,
    format,
    color,
    measureValue,
    measureUnit,
    quantity,
    fillPercent,
    condition,
    notes,
  } = body;

  if (!name?.trim()) return apiError("El nombre es requerido");
  if (category !== undefined && !CATEGORIAS.includes(category)) {
    return apiError("Categoría inválida");
  }
  if (
    condition !== null &&
    condition !== undefined &&
    !CONDICIONES.includes(condition)
  ) {
    return apiError("Condición inválida");
  }
  if (
    measureUnit !== null &&
    measureUnit !== undefined &&
    !["LITROS", "METROS", "KILOS"].includes(measureUnit)
  ) {
    return apiError("Unidad de medida inválida");
  }
  if (fillPercent != null && (fillPercent < 0 || fillPercent > 100)) {
    return apiError("El nivel del envase debe estar entre 0 y 100");
  }

  const item = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.inventoryItem.aggregate({
      _max: { numero: true },
    });
    const numero = (ultimo._max.numero ?? 0) + 1;

    return tx.inventoryItem.create({
      data: {
        numero,
        name: name.trim(),
        category: category ?? "OTRO",
        details: details?.trim() || null,
        format: format?.trim() || null,
        color: color?.trim() || null,
        measureValue: measureValue ?? null,
        measureUnit: measureUnit ?? null,
        quantity: quantity ?? 0,
        fillPercent: fillPercent ?? null,
        condition: condition ?? null,
        notes: notes?.trim() || null,
      },
    });
  });

  return NextResponse.json(item, { status: 201 });
}
