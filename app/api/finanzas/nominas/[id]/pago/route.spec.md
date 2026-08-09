# API Route: /api/finanzas/nominas/[id]/pago

**Archivo:** `app/api/finanzas/nominas/[id]/pago/route.ts`

**La ruta más sensible del módulo — todo lo demás protege esto.**

## GET /api/finanzas/nominas/[id]/pago

**Acceso:** **`canWriteFinance` únicamente**, no `hasFinanceAccess`. `FINANZAS_LECTURA` recibe
`403` sin descifrar ninguna cuenta, aunque pueda ver la nómina completa en `GET
/api/finanzas/nominas/[id]`.

**Precondición:** `PayrollRun.status` debe ser `APROBADA` o `PAGADA`. `409` con `"La nómina debe
estar aprobada antes de generar el pago"` si está en `BORRADOR`.

**Implementación**, lectura + descifrado + auditoría dentro de la misma `prisma.$transaction` (si
la auditoría falla, no se devuelve nada):

1. Lee la nómina con sus líneas y los datos bancarios cifrados de cada `Employee`.
2. Descifra cada `bankAccountEnc` con `descifrar()` de `lib/finanzas/crypto.ts`.
3. Escribe **una** fila `FinanceAuditLog` con `action: "DESCIFRAR"`, `entityType: "PayrollRun"`, y
   en `after` sólo el **conteo** de cuentas descifradas — **jamás las cuentas**.

**Respuesta:** `{ period, lineas: [{ employeeId, fullName, rut, bankName, bankAccountType,
bankAccount, netAmount }] }`. `bankAccount` en claro es el único lugar de toda la aplicación donde
esto ocurre.

**Errores:** `401` sin sesión · `403` sin `canWriteFinance` · `404` nómina inexistente · `409`
nómina en `BORRADOR` · `500` con el mensaje nombrado `"Falta la variable de entorno
FINANZAS_ENCRYPTION_KEY"` si la clave de cifrado no está configurada — nunca un error genérico,
para no confundir un fallo de configuración con uno de datos.
