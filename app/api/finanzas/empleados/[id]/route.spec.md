# API Route: /api/finanzas/empleados/[id]

**Archivo:** `app/api/finanzas/empleados/[id]/route.ts`

## GET /api/finanzas/empleados/[id]

**Acceso:** `hasFinanceAccess`.

Ficha del trabajador, serializada con `serializeEmployee()` (mismo enmascarado que la lista). `404`
si no existe. **No audita** — es lectura.

## PATCH /api/finanzas/empleados/[id]

**Acceso:** `canWriteFinance`.

**Cuerpo:** `editarEmpleadoSchema` (todos los campos de `crearEmpleadoSchema` opcionales, más
`status?`).

**Implementación:**

1. `404` si no existe. Si viene `rut`, lo valida con `esRutValido()`.
2. **No puede mover `status` a `DESVINCULADO`** — responde `400` con el mensaje que remite a
   `POST .../desvincular`. Esta ruta edita campos, no da de baja: dar de baja sin pasar por la
   ruta dedicada dejaría el registro en `DESVINCULADO` sin purgar los datos bancarios ni de
   contacto, que es justo lo que la ruta dedicada garantiza en la misma transacción.
3. Si viene `bankAccount`, recifra y recalcula `bankAccountLast4`.
4. Actualiza y audita `EDITAR` con `before`/`after` del registro completo (before/after se
   redactan en `withAudit()`, `bankAccountEnc` nunca queda en el log).

Devuelve el trabajador serializado.
