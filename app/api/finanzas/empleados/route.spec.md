# API Route: /api/finanzas/empleados

**Archivo:** `app/api/finanzas/empleados/route.ts`

## GET /api/finanzas/empleados

**Acceso:** `hasFinanceAccess` (`FINANZAS` o `FINANZAS_LECTURA`).

Lista paginada (25 por página, tope 100), filtrada por `status` (`ACTIVO` por defecto). Cada fila
pasa por `serializeEmployee()`: RUT enmascarado y sin `bankName`/`bankAccountType` para
`FINANZAS_LECTURA`; `bankAccountEnc` nunca sale, sin importar el rol.

**No audita** — es lectura.

## POST /api/finanzas/empleados

**Acceso:** `canWriteFinance` (`FINANZAS`).

**Cuerpo:** `crearEmpleadoSchema` (`fullName`, `rut`, `hiredAt`, `baseSalary`, `afp?`, `health?`,
`bankName?`, `bankAccountType?`, `bankAccount?` en texto plano — la ruta lo cifra).

**Implementación:**

1. Valida el RUT con `esRutValido()` y lo normaliza con `normalizarRut()`.
2. Rechaza con `409` si ya existe un trabajador con ese RUT.
3. Si viene `bankAccount`, lo cifra con `cifrar()` y calcula `bankAccountLast4` con `ultimos4()`.
4. Crea el `Employee` y audita `CREAR` (`entityType: "Employee"`) dentro de la misma
   `prisma.$transaction`.

Devuelve el trabajador serializado con `201`.
