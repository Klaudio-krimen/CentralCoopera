import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

const CATEGORIAS = [
  "MATERIA_PRIMA",
  "PALLET",
  "PINTURA",
  "MATERIAL",
  "HERRAMIENTA",
  "OTRO",
];
const CONDICIONES = ["NUEVO", "USADO"];
const MEDIDAS = ["LITROS", "METROS", "KILOS"];
const MAX_FILAS = 500;

interface FilaImportada {
  name: string;
  category?: string;
  details?: string | null;
  format?: string | null;
  color?: string | null;
  measureValue?: number | null;
  measureUnit?: string | null;
  quantity?: number;
  fillPercent?: number | null;
  condition?: string | null;
  notes?: string | null;
}

// POST /api/inventario/import — recibe filas YA interpretadas por el cliente
// (con lib/inventario/parse.ts, que también arma la previsualización que ve
// la bodeguera antes de confirmar) y las crea en un solo lote. El correlativo
// `numero` se asigna en orden dentro de la transacción, continuando desde el
// máximo existente — igual que POST /api/inventario, pero para N filas.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "INVENTARIO"))
    return apiError("Acceso denegado", 403);

  const body = await req.json();
  const filas: FilaImportada[] = body.items;

  if (!Array.isArray(filas) || filas.length === 0) {
    return apiError("No hay filas para importar");
  }
  if (filas.length > MAX_FILAS) {
    return apiError(`Máximo ${MAX_FILAS} filas por importación`);
  }

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila.name?.trim())
      return apiError(`Fila ${i + 1}: el nombre es requerido`);
    if (fila.category !== undefined && !CATEGORIAS.includes(fila.category)) {
      return apiError(`Fila ${i + 1}: categoría inválida`);
    }
    if (fila.condition != null && !CONDICIONES.includes(fila.condition)) {
      return apiError(`Fila ${i + 1}: condición inválida`);
    }
    if (fila.measureUnit != null && !MEDIDAS.includes(fila.measureUnit)) {
      return apiError(`Fila ${i + 1}: unidad de medida inválida`);
    }
    if (
      fila.fillPercent != null &&
      (fila.fillPercent < 0 || fila.fillPercent > 100)
    ) {
      return apiError(
        `Fila ${i + 1}: el nivel del envase debe estar entre 0 y 100`
      );
    }
  }

  const creados = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.inventoryItem.aggregate({ _max: { numero: true } });
    let siguienteNumero = (ultimo._max.numero ?? 0) + 1;

    const resultado = [];
    for (const fila of filas) {
      const item = await tx.inventoryItem.create({
        data: {
          numero: siguienteNumero++,
          name: fila.name.trim(),
          category: (fila.category as never) ?? "OTRO",
          details: fila.details?.trim() || null,
          format: fila.format?.trim() || null,
          color: fila.color?.trim() || null,
          measureValue: fila.measureValue ?? null,
          measureUnit: (fila.measureUnit as never) ?? null,
          quantity: fila.quantity ?? 0,
          fillPercent: fila.fillPercent ?? null,
          condition: (fila.condition as never) ?? null,
          notes: fila.notes?.trim() || null,
        },
      });
      resultado.push(item);
    }
    return resultado;
  });

  return NextResponse.json(
    { data: creados, count: creados.length },
    { status: 201 }
  );
}
