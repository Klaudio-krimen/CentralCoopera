/** QA optativa sobre una base PostgreSQL LOCAL exclusiva de pruebas, nunca producción. */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
  registrarMovimiento,
  MovimientoError,
} from "../lib/inventario/movimiento";
import { consumirTokenReset, TokenResetError } from "../lib/finanzas/reset";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert(
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      /^\/coopera_qa_[a-z0-9_]+$/.test(url.pathname),
    "Usa una BD local exclusiva coopera_qa_*, sin datos reales"
  );
  const prisma = new PrismaClient();
  const userId = `qa-${randomUUID()}`;
  const itemId = `qa-${randomUUID()}`;
  try {
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: "QA concurrencia",
        password: "fixture-sin-login",
        role: "BODEGA",
      },
    });
    await prisma.inventoryItem.create({
      data: { id: itemId, name: "QA stock", quantity: 0 },
    });
    const mover = (tipo: "ENTRADA" | "SALIDA" | "AJUSTE", cantidad: number) =>
      prisma.$transaction(
        (tx) =>
          registrarMovimiento(tx, {
            itemId,
            userId,
            tipo,
            cantidad,
            reason: "QA",
          }),
        { timeout: 20000, maxWait: 20000 }
      );
    const entradas = await Promise.all(
      Array.from({ length: 20 }, () => mover("ENTRADA", 1))
    );
    assert.equal(
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } }))
        .quantity,
      20
    );
    assert.deepEqual(
      entradas.map((m) => m.quantityBefore).sort((a, b) => a! - b!),
      Array.from({ length: 20 }, (_, i) => i)
    );
    assert(entradas.every((m) => m.quantityAfter === m.quantityBefore! + 1));
    const salidas = await Promise.allSettled(
      Array.from({ length: 12 }, () => mover("SALIDA", 3))
    );
    assert.equal(salidas.filter((r) => r.status === "fulfilled").length, 6);
    assert(
      salidas
        .filter((r) => r.status === "rejected")
        .every(
          (r) =>
            r.status === "rejected" &&
            r.reason instanceof MovimientoError &&
            r.reason.status === 409
        )
    );
    assert.equal(
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } }))
        .quantity,
      2
    );
    // Ajustes absolutos y entradas deben compartir el mismo bloqueo y conservar continuidad.
    const mixtos = await Promise.all([
      mover("AJUSTE", 100),
      ...Array.from({ length: 8 }, () => mover("ENTRADA", 1)),
    ]);
    let actual = 2;
    const pendientes = [...mixtos];
    while (pendientes.length) {
      const indice = pendientes.findIndex((m) => m.quantityBefore === actual);
      assert(indice >= 0, "Historial concurrente discontinuo");
      actual = pendientes.splice(indice, 1)[0].quantityAfter!;
    }
    assert.equal(
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } }))
        .quantity,
      actual
    );
    await mover("AJUSTE", 0.3);
    const decimal = await mover("ENTRADA", 0.1);
    assert.equal(
      decimal.quantityBefore,
      0.3,
      "No reconstruir el stock previo por resta de floats"
    );
    assert.equal(decimal.quantityAfter, 0.3 + 0.1);
    const token = await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const canjes = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        prisma.$transaction((tx) => consumirTokenReset(tx, token, new Date()), {
          timeout: 20000,
          maxWait: 20000,
        })
      )
    );
    assert.equal(canjes.filter((r) => r.status === "fulfilled").length, 1);
    assert(
      canjes
        .filter((r) => r.status === "rejected")
        .every(
          (r) => r.status === "rejected" && r.reason instanceof TokenResetError
        )
    );
    assert.equal(
      await prisma.passwordResetToken.count({
        where: { userId, usedAt: null },
      }),
      0
    );
    console.log(
      "QA PostgreSQL OK: 20 entradas, 12 salidas (6 conflictos), ajuste/entradas, decimales y 10 canjes (1 ganador); otros tokens invalidados."
    );
  } finally {
    // Sólo IDs generados por esta ejecución. No toca FinanceAuditLog.
    await prisma.inventoryMovement.deleteMany({ where: { itemId } });
    await prisma.inventoryItem.deleteMany({ where: { id: itemId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Falló QA de concurrencia local; revisar configuración y aserciones."
  );
  process.exitCode = 1;
});
