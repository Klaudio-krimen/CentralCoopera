# Librería: Base de Datos

**Archivo:** `lib/db.ts`

## Propósito
Instancia singleton de Prisma Client. Garantiza que solo haya una conexión activa durante el desarrollo (Next.js recrea módulos en hot reload, lo que sin singleton agota las conexiones).

## Patrón
- En desarrollo: guarda la instancia en `globalThis` para reutilizarla entre recargas
- En producción: crea una instancia nueva directamente

## Uso en API Routes
```
// Siempre importar de aquí, nunca crear new PrismaClient() directamente
import { prisma } from '@/lib/db'
```

## Generación de orderCode
`lib/db.ts` (o un archivo separado `lib/orderCode.ts`) incluye la función `generateOrderCode()`:

1. Inicia una transacción de Prisma
2. Obtiene el mayor `orderCode` existente para el año actual
3. Incrementa el correlativo en 1
4. Formatea como `RET-{AÑO}-{NUMERO_4_DIGITOS_CON_CEROS}`
5. Retorna el código dentro de la misma transacción

Esto previene race conditions si dos choferes crean órdenes al mismo tiempo.
