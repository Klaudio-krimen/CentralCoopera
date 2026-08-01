import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CHOFER_EMAILS = [
  "carlos.rojas@cooperapro.cl",
  "ana.martinez@cooperapro.cl",
];
const DEMO_DEVICE_KEY = "GPS-001-DEMO";

async function main() {
  // Tracker del dispositivo demo (no tiene User asociado)
  const { count: deviceCount } = await prisma.tracker.deleteMany({
    where: { deviceKey: DEMO_DEVICE_KEY },
  });
  console.log(
    `Tracker de dispositivo demo (${DEMO_DEVICE_KEY}): ${deviceCount} eliminado(s).`
  );

  // Trackers tipo USUARIO huérfanos: su User fue borrado por fuera de este script
  // (Tracker.userId no tiene onDelete: Cascade, así que quedan con userId: null en vez
  // de desaparecer) — siguen apareciendo como fantasmas en el mapa hasta que se limpian.
  const orphaned = await prisma.tracker.findMany({
    where: { type: "USUARIO", userId: null },
    select: { id: true, label: true },
  });
  if (orphaned.length > 0) {
    await prisma.tracker.deleteMany({
      where: { id: { in: orphaned.map((t) => t.id) } },
    });
    console.log(
      `Trackers huérfanos eliminados: ${orphaned.map((t) => t.label).join(", ")}`
    );
  }

  for (const email of DEMO_CHOFER_EMAILS) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log(`${email}: no existe, se omite.`);
        continue;
      }

      // Tracker (borra en cascada sus Position) + el usuario, en una sola transacción:
      // si el usuario tiene historial real y el delete falla, el borrado del tracker
      // se revierte también — nunca queda un chofer real sin tracker por un intento
      // fallido. Prisma mapea la mayoría de estas violaciones a P2003/P2014, pero las
      // relaciones requeridas (ej. PickupOrder.driverId) generan un RESTRICT que
      // Postgres reporta con el código 23001 en vez de 23503 — Prisma no lo reconoce
      // como "known error" y lo envuelve en PrismaClientUnknownRequestError sin
      // `.code`, así que hay que detectarlo también por el mensaje.
      await prisma.$transaction([
        prisma.tracker.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
      console.log(`${email}: eliminado.`);
    } catch (e: any) {
      const isForeignKeyViolation =
        e?.code === "P2003" ||
        e?.code === "P2014" ||
        /foreign key constraint/i.test(e?.message ?? "");
      if (isForeignKeyViolation) {
        console.log(
          `${email}: tiene actividad real registrada (órdenes/evidencias), NO se eliminó. Revisa manualmente.`
        );
      } else {
        console.error(
          `${email}: error inesperado, se continúa con el siguiente.`,
          e
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
