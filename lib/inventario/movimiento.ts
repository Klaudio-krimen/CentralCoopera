export type TipoMovimiento = "ENTRADA" | "SALIDA" | "AJUSTE";
export class MovimientoError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function validar(
  tipo: unknown,
  cantidad: unknown
): { tipo: TipoMovimiento; cantidad: number } {
  if (tipo !== "ENTRADA" && tipo !== "SALIDA" && tipo !== "AJUSTE")
    throw new MovimientoError("Tipo de movimiento inválido");
  const qty =
    typeof cantidad === "string" && /^\d+(?:\.\d+)?$/.test(cantidad.trim())
      ? Number(cantidad)
      : cantidad;
  if (
    typeof qty !== "number" ||
    !Number.isFinite(qty) ||
    qty < 0 ||
    (tipo !== "AJUSTE" && qty === 0)
  )
    throw new MovimientoError("Cantidad inválida");
  return { tipo, cantidad: qty };
}

export function calcularMovimiento({
  tipo,
  cantidad,
  actual,
}: {
  tipo: unknown;
  cantidad: unknown;
  actual: number;
}) {
  const entrada = validar(tipo, cantidad);
  if (!Number.isFinite(actual) || actual < 0)
    throw new MovimientoError("Stock actual inválido");
  const despues =
    entrada.tipo === "AJUSTE"
      ? entrada.cantidad
      : actual +
        (entrada.tipo === "SALIDA" ? -entrada.cantidad : entrada.cantidad);
  if (despues < 0)
    throw new MovimientoError("No hay stock suficiente para esta salida", 409);
  if (!Number.isFinite(despues))
    throw new MovimientoError("Cantidad fuera de rango");
  return { quantityBefore: actual, quantityAfter: despues };
}

interface TxMovimiento<T> {
  inventoryItem: {
    updateMany(args: {
      where: { id: string; isActive?: boolean; quantity?: { gte: number } };
      data: { quantity: { increment: number } | { decrement: number } };
    }): Promise<{ count: number }>;
    findUnique(args: {
      where: { id: string };
    }): Promise<{ quantity: number; isActive: boolean } | null>;
    update(args: {
      where: { id: string };
      data: { quantity: number };
    }): Promise<unknown>;
  };
  inventoryMovement: {
    create(args: {
      data: {
        itemId: string;
        type: TipoMovimiento;
        quantity: number;
        quantityBefore: number;
        quantityAfter: number;
        reason: string | null;
        userId: string;
      };
    }): Promise<T>;
  };
}

/** Ejecutar dentro de $transaction: la escritura mantiene el bloqueo de fila hasta el commit. */
export async function registrarMovimiento<T>(
  tx: TxMovimiento<T>,
  input: {
    itemId: string;
    tipo: unknown;
    cantidad: unknown;
    reason: string | null;
    userId: string;
  }
): Promise<T> {
  const { tipo, cantidad } = validar(input.tipo, input.cantidad);
  // Adquiere el mismo bloqueo que PATCH antes de leer el valor histórico exacto.
  await tx.inventoryItem.updateMany({
    where: { id: input.itemId },
    data: { quantity: { increment: 0 } },
  });
  const item = await tx.inventoryItem.findUnique({
    where: { id: input.itemId },
  });
  if (!item) throw new MovimientoError("Ítem no encontrado", 404);
  if (!item.isActive) throw new MovimientoError("El ítem está archivado", 409);
  const valores = calcularMovimiento({ tipo, cantidad, actual: item.quantity });
  if (tipo === "AJUSTE")
    await tx.inventoryItem.update({
      where: { id: input.itemId },
      data: { quantity: valores.quantityAfter },
    });
  else {
    const cambio = await tx.inventoryItem.updateMany({
      where: {
        id: input.itemId,
        ...(tipo === "SALIDA" ? { quantity: { gte: cantidad } } : {}),
      },
      data: {
        quantity:
          tipo === "SALIDA" ? { decrement: cantidad } : { increment: cantidad },
      },
    });
    if (cambio.count !== 1)
      throw new MovimientoError(
        "No hay stock suficiente para esta salida",
        409
      );
  }
  const despues = await tx.inventoryItem.findUnique({
    where: { id: input.itemId },
  });
  if (!despues) throw new MovimientoError("Ítem no encontrado", 404);
  return tx.inventoryMovement.create({
    data: {
      itemId: input.itemId,
      type: tipo,
      quantity: cantidad,
      quantityBefore: item.quantity,
      quantityAfter: despues.quantity,
      reason: input.reason,
      userId: input.userId,
    },
  });
}
