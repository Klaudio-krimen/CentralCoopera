# Especificación: Prisma Schema

**Archivo:** `prisma/schema.prisma`

## Configuración del generador

- `provider = "prisma-client-js"`

## Configuración del datasource

- `provider = env("DATABASE_PROVIDER")` — valor: `"sqlite"` en dev, `"postgresql"` en prod
- `url = env("DATABASE_URL")`

## Modelos a definir

Ver [ESQUEMA_BASE_DATOS.md](../ESQUEMA_BASE_DATOS.md) para los campos completos de cada modelo.

Los modelos son: `User`, `Company`, `MaterialType`, `PickupOrder`, `OrderItem`, `Evidence`, `Discrepancy`

## Inventario

- `InventoryItem.category` usa `InventoryCategory`, que incluye `MATERIA_PRIMA`, `PALLET`,
  `PINTURA`, `MATERIAL`, `HERRAMIENTA`, `OTRO` y `EPP`.
- `EPP` identifica los Elementos de Protección Personal; la clasificación por nombre está en
  `lib/inventario/category.ts` y no cambia cantidades ni movimientos.
- Después de cambiar el enum, generar el cliente Prisma y aplicar el schema sólo con respaldo
  verificado conforme a `AGENTS.md`.

## Relaciones entre modelos

- `User` 1→N `PickupOrder` (como driver)
- `Company` 1→N `PickupOrder`
- `PickupOrder` 1→N `OrderItem`
- `PickupOrder` 1→N `Evidence`
- `PickupOrder` 0→1 `Discrepancy`
- `MaterialType` 1→N `OrderItem`

## Índices adicionales requeridos

- `@@index([driverId, status])` en `PickupOrder`
- `@@index([createdAt])` en `PickupOrder`
- `@@unique([orderCode])` en `PickupOrder`
- `@@index([status])` en `Discrepancy`

## Seeds (datos iniciales)

Crear un archivo `prisma/seed.ts` que inserte:

1. Un usuario ADMIN inicial (email: admin@cooperapro.cl, contraseña: "cambiar123")
2. Los tipos de material base: "Cartón", "Plástico PET", "Plástico Duro", "Papel", "Vidrio", "Metal", "Pallets", "Orgánico", "Mixto"

## Notas para Claude Code

- Ejecutar `npx prisma generate` después de cualquier cambio al schema
- Para SQLite en dev: `npx prisma db push`
- Para PostgreSQL en prod: `npx prisma migrate deploy`
- Para seeds: `npx prisma db seed`

## Actualización AUD-002 (2026-10-05)

La fuente actual usa exclusivamente PostgreSQL; se aplica con db push tras respaldo verificado,
no SQLite. User.passwordChangedAt DateTime? revoca JWT previos al cambio de contraseña.
Se asigna en servidor; null mantiene compatibilidad con usuarios anteriores. Aplicado junto
con InventoryCategory.EPP, sin borrar datos. Ver REGISTRO_TRABAJO.md para respaldo y diff.
