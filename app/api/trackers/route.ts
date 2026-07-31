import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

// GET /api/trackers — lista de trackers (ADMIN o acceso a Operaciones)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "OPERACIONES"))
    return apiError("Acceso denegado", 403);

  const trackers = await prisma.tracker.findMany({
    select: {
      id: true,
      label: true,
      type: true,
      kind: true,
      isActive: true,
    },
    orderBy: { label: "asc" },
  });

  return NextResponse.json(trackers);
}
