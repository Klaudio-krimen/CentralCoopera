import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

// Ciclo de gestión telefónica de un Contact (IMPORTACION_RADAR_PALLETS.md §4).
// Validación de enum a mano con `.includes()` — `zod` está acotado a
// `app/api/finanzas/*` (área rules; CLAUDE.md §10 regla 8).
const CALL_STATUSES = [
  "POR_LLAMAR",
  "LLAMADA",
  "SIN_RESPUESTA",
  "CORREO_CONSEGUIDO",
] as const;
type CallStatusValue = (typeof CALL_STATUSES)[number];

// GET /api/llamadas?callStatus=&q= — contactos CON teléfono, para la lista de
// llamadas del CRM. Alimenta las mutaciones y el filtro del cliente; la página
// (server component) consulta `prisma` directo, no esta ruta.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const callStatus = req.nextUrl.searchParams.get("callStatus");
  const q = req.nextUrl.searchParams.get("q");

  if (callStatus && !CALL_STATUSES.includes(callStatus as CallStatusValue)) {
    return apiError("Estado de gestión telefónica inválido");
  }

  const contacts = await prisma.contact.findMany({
    where: {
      phone: { not: null },
      ...(callStatus ? { callStatus: callStatus as CallStatusValue } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      callStatus: true,
      company: { select: { id: true, name: true, segment: true } },
    },
    orderBy: { company: { name: "asc" } },
  });

  return NextResponse.json(contacts);
}

// PATCH /api/llamadas — `{ id, callStatus }` — mueve el estado de gestión
// telefónica de un contacto. NO escribe `Activity` (es un estado, como
// `ContactTemperature`, no una línea de tiempo). NO toca ningún otro campo.
// Timestamps del servidor: no acepta ninguna fecha del cliente.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const { id, callStatus } = await req.json();
  if (!id) return apiError("id requerido");
  if (
    callStatus !== undefined &&
    callStatus !== null &&
    !CALL_STATUSES.includes(callStatus)
  ) {
    return apiError("Estado de gestión telefónica inválido");
  }

  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: { ...(callStatus !== undefined ? { callStatus } : {}) },
    });
    return NextResponse.json(contact);
  } catch {
    return apiError("Contacto no encontrado", 404);
  }
}
