# Página: Trabajadores

**Ruta:** `/admin/finanzas/trabajadores`
**Acceso:** `hasFinanceAccess`. Alta sólo si `canWriteFinance`.

## Propósito

Lista de trabajadores, filtrable por estado, con alta.

## Datos

`prisma.employee.findMany({ where: { status } })`, `status` desde `?status=` (`ACTIVO` por
defecto, o `DESVINCULADO`), serializado con `serializeEmployee()`.

## Interfaz

- Filtro Activos / Desvinculados con `<Link href>` reales.
- `NuevoTrabajadorForm.tsx` (sólo escritura): crea vía `POST /api/finanzas/empleados`.
- Tabla con nombre, RUT (enmascarado para `FINANZAS_LECTURA`) y sueldo base; cada fila enlaza a
  `/admin/finanzas/trabajadores/[id]`.
