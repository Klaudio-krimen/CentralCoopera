import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasFinanceAccess } from "@/lib/access";
import { resumirPeriodo, agruparPorCategoria } from "@/lib/finanzas/reportes";

// GET /api/finanzas/reportes?desde=&hasta= — agregados del período
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);

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
    include: { category: { select: { name: true } } },
  });

  const resumen = resumirPeriodo(transacciones);
  const categorias = agruparPorCategoria(transacciones);

  return NextResponse.json({ ...resumen, categorias });
}
