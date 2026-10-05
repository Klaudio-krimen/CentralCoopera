import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { escaparCampoCsv } from "@/lib/finanzas/csv";

type CsvValue = string | number | null;

// GET /api/reportes?type=discrepancias&from=2026-01-01&to=2026-12-31&format=json|csv
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "OPERACIONES"))
    return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "ordenes";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const driverId = searchParams.get("driverId");
  const companyId = searchParams.get("companyId");
  const format = searchParams.get("format") ?? "json";

  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59`);
  const createdAt = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

  let data: unknown[];
  let filename: string;
  let csvHeaders: string[];
  let csvRows: CsvValue[][];

  if (type === "discrepancias") {
    const discrepancies = await prisma.discrepancy.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(driverId ? { order: { driverId } } : {}),
        ...(companyId ? { order: { companyId } } : {}),
      },
      include: {
        order: {
          include: {
            company: { select: { name: true } },
            driver: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    data = discrepancies;
    filename = `discrepancias_${new Date().toISOString().slice(0, 10)}.csv`;
    csvHeaders = [
      "Código Orden",
      "Empresa",
      "Chofer",
      "Material",
      "Declarado",
      "Recibido",
      "Diferencia %",
      "Severidad",
      "Estado",
      "Fecha",
    ];
    csvRows = discrepancies.map((discrepancy) => [
      discrepancy.order.orderCode,
      discrepancy.order.company.name,
      discrepancy.order.driver?.name ?? "",
      discrepancy.materialType ?? "",
      discrepancy.declaredQuantity ?? "",
      discrepancy.receivedQuantity ?? "",
      discrepancy.differencePercent
        ? discrepancy.differencePercent.toFixed(2)
        : "",
      discrepancy.severity,
      discrepancy.status,
      new Date(discrepancy.createdAt).toLocaleDateString("es-CL"),
    ]);
  } else if (type === "choferes") {
    const ordersByDriver = await prisma.pickupOrder.groupBy({
      by: ["driverId"],
      where: createdAt ? { createdAt } : {},
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    data = ordersByDriver;

    const driverIds = ordersByDriver
      .map((row) => row.driverId)
      .filter((id): id is string => id !== null);
    const drivers = await prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, name: true },
    });
    const driverMap = new Map(
      drivers.map((driver) => [driver.id, driver.name])
    );

    filename = `reporte_choferes_${new Date().toISOString().slice(0, 10)}.csv`;
    csvHeaders = ["Chofer", "Total Órdenes"];
    csvRows = ordersByDriver.map((row) => [
      row.driverId
        ? (driverMap.get(row.driverId) ?? row.driverId)
        : "Sin asignar",
      row._count.id,
    ]);
  } else {
    const orders = await prisma.pickupOrder.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(driverId ? { driverId } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: { select: { name: true } },
        driver: { select: { name: true } },
        items: {
          select: {
            materialName: true,
            declaredQuantity: true,
            receivedQuantity: true,
            unit: true,
          },
        },
        _count: { select: { discrepancies: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    data = orders;
    filename = `ordenes_${new Date().toISOString().slice(0, 10)}.csv`;
    csvHeaders = [
      "Código",
      "Empresa",
      "Chofer",
      "Estado",
      "Materiales",
      "Discrepancias",
      "Fecha",
    ];
    csvRows = orders.map((order) => [
      order.orderCode,
      order.company.name,
      order.driver?.name ?? "",
      order.status,
      order.items
        .map(
          (item) => `${item.materialName}: ${item.declaredQuantity}${item.unit}`
        )
        .join(" | "),
      order._count.discrepancies,
      new Date(order.createdAt).toLocaleDateString("es-CL"),
    ]);
  }

  if (format === "csv") {
    // Mitiga inyección de fórmulas en hojas de cálculo que abren el archivo.
    const escape = (value: CsvValue) => escaparCampoCsv(String(value ?? ""));
    const csv = [
      csvHeaders.map(escape).join(","),
      ...csvRows.map((row) => row.map(escape).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ data, total: data.length });
}
