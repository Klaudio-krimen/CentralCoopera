import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const choferes = await prisma.user.findMany({ where: { role: "CHOFER" } });

  for (const c of choferes) {
    await prisma.tracker.upsert({
      where: { userId: c.id },
      update: { label: c.name, isActive: true },
      create: {
        label: c.name,
        type: "USUARIO",
        kind: "CHOFER",
        userId: c.id,
      },
    });
  }

  console.log(
    `Trackers verificados/creados para ${choferes.length} chofer(es).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
