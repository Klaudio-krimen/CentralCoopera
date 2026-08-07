---
description: Convenciones del módulo de Finanzas — porteros sin bypass de ADMIN, auditoría transaccional, montos enteros, imports relativos en lib/finanzas
paths:
  - "app/api/finanzas/**"
  - "app/(admin)/admin/finanzas/**"
  - "lib/finanzas/**"
  - "lib/access.ts"
---

# Reglas del módulo Finanzas

## Autorización

- Usa `hasFinanceAccess()` (lectura) y `canWriteFinance()` (mutación) de `lib/access.ts`.
  **Nunca `hasModuleAccess()`**: tiene bypass de ADMIN cableado y por eso no sirve para Finanzas.
- No modifiques `hasModuleAccess()`. Operaciones, CRM e Inventario dependen de su comportamiento
  actual, incluido el bypass.
- Toda ruta bajo `app/api/finanzas/` llama a un portero en cada método exportado, incluso si el
  middleware ya la protege. `lib/finanzas/routes.test.ts` lo verifica y falla nombrando el archivo.
- `GET /api/finanzas/nominas/[id]/pago` exige `canWriteFinance` y **no** `hasFinanceAccess`: es la
  única ruta que descifra cuentas bancarias.
- Una ruta de API responde `403` con JSON de `apiError()`, nunca con un redirect.

## Auditoría

- Toda mutación escribe su fila con `withAudit()` o `mutarConAuditoria()` de `lib/finanzas/audit.ts`,
  **dentro del mismo `prisma.$transaction`** que la mutación.
- `FinanceAuditLog` es append-only. No escribas rutas ni consultas que actualicen o borren sus filas.
- `before` y `after` nunca llevan `bankAccountEnc` ni `password`: `withAudit()` los redacta, no
  confíes en que el llamador se acuerde.
- Acciones válidas: `CREAR`, `EDITAR`, `ANULAR`, `APROBAR`, `PAGAR`, `DESCIFRAR`, `EXPORTAR`,
  `DESVINCULAR`, `CAMBIAR_PERMISOS`.

## Dinero

- Todos los montos son `Int` en pesos chilenos. Nunca `Float`, `Decimal`, `parseFloat` ni `toFixed`.
- Mostrar con `formatCurrency()` de `lib/utils.ts`. **Ningún test compara su salida literal**: es
  `Intl.NumberFormat` y depende de la versión de ICU del runtime.
- `calcularLiquido()` nunca devuelve un negativo: si las deducciones superan al bruto, devuelve 0.

## Módulos de `lib/finanzas/`

- Funciones puras. Reciben el cliente Prisma o la transacción **por parámetro**, con una interfaz
  estructural mínima, no con el tipo de Prisma.
- Sin `import` de runtime de `@prisma/client` ni de `@/lib/db`. Los tipos van con `import type`.
- **Imports relativos (`./crypto`, `../utils`), nunca el alias `@/`**: Vitest no lee `paths` de
  `tsconfig.json` y un `@/` aquí rompe el test con `Cannot find module`.
- Ninguna lectura de `process.env` en el cuerpo del módulo. Se lee dentro de la función que la usa.
- Cada módulo lleva su `*.test.ts` al lado. Vitest recoge sólo `lib/**/*.test.ts`.

## Rutas y páginas

- Los archivos bajo `app/` **sí** usan el alias `@/`, porque los resuelve Next.
- Valida la entrada con el esquema zod de `lib/finanzas/schemas.ts` antes de tocar la base.
- Serializa toda salida con `serializeEmployee()` o `serializeSupplier()` de
  `lib/finanzas/serialize.ts`. Ninguna entidad sale cruda.
- Pagina en la base con `resolverPaginacion()` de `lib/finanzas/paginacion.ts`. Tope duro de 100
  filas. Nunca en el navegador.
- Timestamps del servidor: `paidAt`, `approvedAt`, `terminatedAt`, `purgedAt`. La única fecha que
  elige el cliente es `FinanceTransaction.date`.
- Nada de `DELETE`. Anular es `status: "ANULADO"`; dar de baja es `isActive: false`; desvincular es
  `status: "DESVINCULADO"` con purga de datos bancarios y de contacto.
- Cada `route.ts` y cada `page.tsx` nuevo lleva su `*.spec.md` al lado.

## Interfaz

- Escritorio y denso: alto de fila 40px, sin animación al ordenar o filtrar.
- Ingreso `#15803D`, egreso `#B91C1C`. El color nunca es el único portador del dato: signo `+`/`−` y
  etiqueta de texto siempre.
- Montos en Geist Mono con `font-variant-numeric: tabular-nums`.
- Los controles de escritura se renderizan sólo si `canWriteFinance(session.user)`, **y además** el
  servidor rechaza la mutación con `403`. Las dos capas, siempre.
- Toda lista define sus tres estados: carga, vacío y error.
