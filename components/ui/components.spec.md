# Componentes UI Base

**Ubicación:** `components/ui/`

## Componentes requeridos

Todos los componentes usan Tailwind CSS. Deben ser simples, sin dependencias externas salvo las mencionadas.

---

### StatusBadge
Chip de color para mostrar el estado de una orden.

**Props:** `status: PickupOrderStatus`

**Colores:**
- BORRADOR → gris
- EN_RETIRO → amarillo
- EN_TRANSITO → azul
- RECIBIDA → verde
- DISCREPANCIA → rojo
- CERRADA → gris oscuro

---

### DiscrepancyBadge
Chip de severidad para discrepancias.

**Props:** `severity: DiscrepancySeverity`

**Colores:** MENOR → amarillo, MODERADA → naranja, GRAVE → rojo

---

### LoadingSkeleton
Placeholder animado para mostrar mientras cargan datos.

**Props:** `lines?: number` (default 3), `className?: string`

---

### ConfirmDialog
Modal de confirmación reutilizable.

**Props:**
- `title: string`
- `message: string`
- `confirmLabel: string` (default "Confirmar")
- `cancelLabel: string` (default "Cancelar")
- `variant: "danger" | "warning" | "default"`
- `onConfirm(): void`
- `onCancel(): void`

---

### PageHeader
Encabezado de página consistente.

**Props:** `title: string`, `subtitle?: string`, `backHref?: string`, `actions?: ReactNode`

---

### EmptyState
Estado vacío para listas sin resultados.

**Props:** `message: string`, `icon?: ReactNode`, `action?: ReactNode`
