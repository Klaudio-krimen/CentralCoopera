import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { canWriteFinance } from "@/lib/access";
import { checkRateLimit } from "@/lib/finanzas/rate-limit";
import { filasACsv } from "@/lib/finanzas/csv";
import { withAudit } from "@/lib/finanzas/audit";

const EXPORT_RATE_LIMIT = 5;
const EXPORT_RATE_WINDOW_MS = 60 * 60 * 1000;

const ENCABEZADOS = [
  "Fecha",
  "Tipo",
  "Descripción",
  "Categoría",
  "Proveedor",
  "Método",
  "Estado",
  "Monto",
];

// GET /api/finanzas/export?desde=&hasta= — CSV de movimientos del rango.
// Sólo FINANZAS: exportar saca el dato del sistema, y ese es exactamente el
// movimiento que el rate limit acota (5/hora es el límite duro que evita
// que alguien se lleve la base entera).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  const limite = await checkRateLimit(
    prisma,
    "export:" + session.user.id,
    EXPORT_RATE_LIMIT,
    EXPORT_RATE_WINDOW_MS
  );
  if (!limite.ok) {
    return NextResponse.json(
      { error: "Demasiadas exportaciones. Intenta más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(limite.retryAfterSec) },
      }
    );
  }

  const { searchParams } = req.nextUrl;
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where: Record<string, unknown> = {};
  if (desde || hasta) {
    where.date = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta) } : {}),
    };
  }

  const transacciones = await prisma.financeTransaction.findMany({
    where,
    orderBy: { date: "asc" },
    include: { category: true, supplier: true },
  });

  const filas = transacciones.map((t) => [
    t.date.toLocaleDateString("es-CL"),
    t.kind,
    t.description,
    t.category?.name ?? "",
    t.supplier?.name ?? "",
    t.method,
    t.status,
    String(t.amount),
  ]);

  const csv = filasACsv(ENCABEZADOS, filas);

  // Audita el rango y el conteo de filas antes de devolver — nunca el
  // contenido exportado.
  await withAudit(prisma, {
    actorId: session.user.id,
    actorEmail: session.user.email ?? "",
    actorRole: session.user.role,
    action: "EXPORTAR",
    entityType: "FinanceTransaction",
    after: { desde, hasta, filas: filas.length },
  });

  const rangoLabel = [desde, hasta].filter(Boolean).join("_") || "todos";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos-${rangoLabel}.csv"`,
    },
  });
}
