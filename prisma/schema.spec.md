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
