import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";
import { toCsv } from "@/lib/csv";

const CATEGORIA_LABEL: Record<string, string> = {
  MATERIA_PRIMA: "Materia prima",
  PALLET: "Pallet",
  PINTURA: "Pintura",
  MATERIAL: "Material",
  HERRAMIENTA: "Herramienta",
  OTRO: "Otro",
};

// GET /api/inventario/export — CSV con las mismas 12 columnas de la planilla
// original de bodega, en el mismo orden, para que quien lo abra en Excel no
// note la diferencia con lo que ya conocía.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { numero: "asc" },
  });

  const filas = items.map((item) => ({
    numero: item.numero ?? "",
    nombre: item.name,
    marcaDetalles: item.details ?? "",
    formato: item.format ?? "",
    color: item.color ?? "",
    litros: item.measureUnit === "LITROS" ? (item.measureValue ?? "") : "",
    metros: item.measureUnit === "METROS" ? (item.measureValue ?? "") : "",
    kilos: item.measureUnit === "KILOS" ? (item.measureValue ?? "") : "",
    cantidad:
      item.fillPercent != null ? `${item.fillPercent}%` : String(item.quantity),
    nuevo: item.condition === "NUEVO" ? "X" : "",
    usado: item.condition === "USADO" ? "X" : "",
    comentario: item.notes ?? "",
    categoria: CATEGORIA_LABEL[item.category] ?? item.category,
  }));

  const csv = toCsv(filas, [
    { key: "numero", label: "NUMERO" },
    { key: "nombre", label: "NOMBRE" },
    { key: "marcaDetalles", label: "MARCA-DETALLES" },
    { key: "formato", label: "FORMATO" },
    { key: "color", label: "COLOR" },
    { key: "litros", label: "LITROS" },
    { key: "metros", label: "METROS" },
    { key: "kilos", label: "KILOS" },
    { key: "cantidad", label: "CANTIDAD" },
    { key: "nuevo", label: "NUEVO" },
    { key: "usado", label: "USADO" },
    { key: "comentario", label: "COMENTARIO" },
    { key: "categoria", label: "CATEGORIA" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventario-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
