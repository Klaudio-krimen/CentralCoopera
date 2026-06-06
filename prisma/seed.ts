import { PrismaClient, UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Counter ──────────────────────────────────────────────
  await prisma.orderCounter.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', count: 0 },
  })

  // ── Users ─────────────────────────────────────────────────
  const adminPw  = await hash('admin123', 12)
  const choferPw = await hash('chofer123', 12)
  const recepPw  = await hash('recep123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cooperapro.cl' },
    update: {},
    create: {
      name: 'Administrador Sistema',
      email: 'admin@cooperapro.cl',
      password: adminPw,
      role: UserRole.ADMIN,
    },
  })

  const chofer1 = await prisma.user.upsert({
    where: { email: 'carlos.rojas@cooperapro.cl' },
    update: {},
    create: {
      name: 'Carlos Rojas Fuentes',
      email: 'carlos.rojas@cooperapro.cl',
      password: choferPw,
      role: UserRole.CHOFER,
    },
  })

  const chofer2 = await prisma.user.upsert({
    where: { email: 'ana.martinez@cooperapro.cl' },
    update: {},
    create: {
      name: 'Ana Martínez Díaz',
      email: 'ana.martinez@cooperapro.cl',
      password: choferPw,
      role: UserRole.CHOFER,
    },
  })

  await prisma.user.upsert({
    where: { email: 'recepcion@cooperapro.cl' },
    update: {},
    create: {
      name: 'María González Pinto',
      email: 'recepcion@cooperapro.cl',
      password: recepPw,
      role: UserRole.RECEPCION,
    },
  })

  // ── Companies ─────────────────────────────────────────────
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { id: 'comp-1' },
      update: {},
      create: {
        id: 'comp-1',
        name: 'Vidrios del Sur SA',
        address: 'Av. Pajaritos 3500, Maipú',
        contactName: 'Roberto Saavedra',
        contactPhone: '+56 9 7823 4156',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-2' },
      update: {},
      create: {
        id: 'comp-2',
        name: 'Papeles del Pacífico Ltda.',
        address: 'Camino Melipilla 8950, Pudahuel',
        contactName: 'Francisca Vera',
        contactPhone: '+56 9 6341 8802',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-3' },
      update: {},
      create: {
        id: 'comp-3',
        name: 'Metales Reciclados Norte',
        address: 'Los Morros 1240, Cerro Navia',
        contactName: 'Jorge Iturra',
        contactPhone: '+56 9 9102 7364',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-4' },
      update: {},
      create: {
        id: 'comp-4',
        name: 'Cartón Industrial Ltda.',
        address: 'Américo Vespucio 4820, Quilicura',
        contactName: 'Patricia Mora',
        contactPhone: '+56 9 8457 2913',
      },
    }),
    prisma.company.upsert({
      where: { id: 'comp-5' },
      update: {},
      create: {
        id: 'comp-5',
        name: 'Plásticos Reutilizables SpA',
        address: 'Gran Avenida 6712, La Granja',
        contactName: 'Tomás Herrera',
        contactPhone: '+56 9 7265 3048',
      },
    }),
  ])

  // ── Material Types ────────────────────────────────────────
  const materialTypes = await Promise.all([
    prisma.materialType.upsert({
      where: { id: 'mat-carton' },
      update: {},
      create: { id: 'mat-carton', name: 'Cartón', unit: 'kg' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-vidrio' },
      update: {},
      create: { id: 'mat-vidrio', name: 'Vidrio', unit: 'kg' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-plastico' },
      update: {},
      create: { id: 'mat-plastico', name: 'Plástico PET', unit: 'kg' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-metal' },
      update: {},
      create: { id: 'mat-metal', name: 'Metal / Chatarra', unit: 'kg' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-papel' },
      update: {},
      create: { id: 'mat-papel', name: 'Papel blanco', unit: 'kg' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-electronico' },
      update: {},
      create: { id: 'mat-electronico', name: 'Residuo electrónico', unit: 'unidades' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-madera' },
      update: {},
      create: { id: 'mat-madera', name: 'Madera / Pallets', unit: 'unidades' },
    }),
    prisma.materialType.upsert({
      where: { id: 'mat-organico' },
      update: {},
      create: { id: 'mat-organico', name: 'Residuo orgánico', unit: 'litros' },
    }),
  ])

  console.log('✅ Seed completado.')
  console.log('')
  console.log('Credenciales de prueba:')
  console.log('  ADMIN:    admin@cooperapro.cl     / admin123')
  console.log('  CHOFER:   carlos.rojas@cooperapro.cl / chofer123')
  console.log('  RECEPCION: recepcion@cooperapro.cl / recep123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
