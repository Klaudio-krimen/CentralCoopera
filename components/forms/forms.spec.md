# Componentes de Formularios

**Ubicación:** `components/forms/`

## OrdenItemForm

**Propósito:** Formulario inline para agregar/editar un ítem de material en una orden.

**Props:**
- `materialTypes: MaterialType[]` — lista del catálogo
- `onAdd(item: Partial<OrderItem>): void`

**Campos:**
- Selector de tipo de material (obligatorio)
- Input numérico de cantidad (obligatorio, positivo)
- Selector de unidad (pre-rellena según el tipo de material, editable)

---

## RecepcionItemRow

**Propósito:** Fila de una tabla para que el receptor ingrese la cantidad recibida de un ítem, con cálculo de diferencia en tiempo real.

**Props:**
- `item: OrderItem` — ítem declarado
- `onChange(id: string, receivedQty: number): void`

**Muestra:**
- Nombre del material + cantidad declarada (solo lectura)
- Input para cantidad recibida (editable)
- Diferencia calculada en tiempo real: monto y porcentaje
- Color de fondo de la fila según severidad de diferencia (blanco, amarillo, rojo)

---

## DiscrepancyResolveForm

**Propósito:** Formulario para que el admin resuelva una discrepancia.

**Props:**
- `discrepancyId: string`
- `onResolved(): void`

**Campos:**
- Selector de estado (EN_INVESTIGACION o RESUELTA)
- Textarea de notas de resolución (requerido si status = RESUELTA)
- Botón "Guardar"
