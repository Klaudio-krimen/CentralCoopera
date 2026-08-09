# API Route: /api/finanzas/export

**Archivo:** `app/api/finanzas/export/route.ts`

## GET /api/finanzas/export?desde=&hasta=

**Acceso:** `canWriteFinance` únicamente. `FINANZAS_LECTURA` recibe `403`: exportar saca el dato
del sistema, y ese es exactamente el movimiento que el escenario de robo hormiga quiere ver
acotado.

**Rate limit:** 5 por hora por usuario, con `checkRateLimit(prisma, "export:" + userId, 5,
60*60*1000)`. Al superarlo responde `429` con la cabecera `Retry-After` en segundos.

**Implementación:**

1. Lee las `FinanceTransaction` del rango (`desde`/`hasta` sobre `date`, ambos opcionales).
2. Arma el CSV con `filasACsv()` de `lib/finanzas/csv.ts` — cada campo pasa por
   `escaparCampoCsv()`, que además de las comillas neutraliza la inyección de fórmulas de Excel
   (prefijo `'` si el campo empieza con `=`, `+`, `-` o `@`).
3. Audita `EXPORTAR` (`entityType: "FinanceTransaction"`) con el rango y el **conteo** de filas —
   nunca el contenido exportado.

**Respuesta:** `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`.
