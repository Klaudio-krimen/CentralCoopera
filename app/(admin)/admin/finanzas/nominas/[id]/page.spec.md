# Página: Detalle de nómina

**Ruta:** `/admin/finanzas/nominas/[id]`
**Acceso:** `hasFinanceAccess`. Avanzar de estado y ver el pago sólo si `canWriteFinance`.

## Propósito

Cabecera y líneas de una nómina, con las acciones de aprobar/pagar y el panel de pago.

## Datos

`prisma.payrollRun.findUnique()` con sus `items` y `employee.fullName`/`rut`, `notFound()` si no
existe. RUT enmascarado para `FINANZAS_LECTURA`, igual que en la API.

## Interfaz

- Cabecera: período, estado, bruto y líquido totales.
- Tabla de líneas: trabajador, RUT, bruto, AFP, salud, otras deducciones, anticipos aplicados,
  líquido.
- `AccionesNomina.tsx` (sólo escritura): "Aprobar nómina" si `BORRADOR`, "Marcar pagada" si
  `APROBADA`, ninguna si `PAGADA`. Confirma qué y cuánto antes de llamar `PATCH .../[id]`.
- `PanelPago.tsx` (sólo escritura): botón "Ver datos de pago", deshabilitado si la nómina no está
  `APROBADA` o `PAGADA`. Pide `GET .../pago` **bajo demanda** — nunca al cargar la página — y
  muestra las cuentas descifradas sólo mientras la pantalla siga abierta. Cada clic queda auditado
  en el servidor con `action: "DESCIFRAR"`, aunque el usuario nunca vuelva a abrir el panel.
