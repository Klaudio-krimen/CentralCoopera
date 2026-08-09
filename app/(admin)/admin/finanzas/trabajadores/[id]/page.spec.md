# Página: Ficha de trabajador

**Ruta:** `/admin/finanzas/trabajadores/[id]`
**Acceso:** `hasFinanceAccess`. Edición y desvinculación sólo si `canWriteFinance`.

## Propósito

Ficha de un trabajador: datos completos si puede escribir, sólo lectura si no.

## Datos

`prisma.employee.findUnique({ where: { id } })`, `notFound()` si no existe, serializado con
`serializeEmployee()`.

## Interfaz

- `FINANZAS_LECTURA`: lista de definición (`<dl>`) de sólo lectura.
- `canWriteFinance`: `EditarTrabajadorForm.tsx` — edita todos los campos vía `PATCH
/api/finanzas/empleados/[id]` (RUT nuevo se revalida, cuenta bancaria nueva se recifra). **No
  incluye el campo Estado**: esta ruta no puede mover a `DESVINCULADO`.
- `DesvincularTrabajadorButton.tsx`, visible sólo si el trabajador está `ACTIVO`: confirma qué se
  va a purgar y llama `POST /api/finanzas/empleados/[id]/desvincular`. Es irreversible — no existe
  ruta de reactivación.
