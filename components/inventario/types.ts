// Espejo del modelo InventoryItem que usa la UI de Inventario. Campos que la
// tabla no muestra (createdAt, updatedAt, el `unit` deprecado) quedan fuera a
// propósito — los objetos reales de Prisma igual calzan (TS no aplica excess
// property check sobre valores que no son literales).

export type InventoryCategory =
  "MATERIA_PRIMA" | "PALLET" | "PINTURA" | "MATERIAL" | "HERRAMIENTA" | "OTRO";

export type InventoryMeasureUnit = "LITROS" | "METROS" | "KILOS";
export type InventoryCondition = "NUEVO" | "USADO";

export interface InventoryItemRow {
  id: string;
  numero: number | null;
  name: string;
  category: InventoryCategory;
  details: string | null;
  format: string | null;
  color: string | null;
  measureValue: number | null;
  measureUnit: InventoryMeasureUnit | null;
  quantity: number;
  fillPercent: number | null;
  condition: InventoryCondition | null;
  notes: string | null;
  isActive: boolean;
}

export const CATEGORIA_LABEL: Record<InventoryCategory, string> = {
  MATERIA_PRIMA: "Materia prima",
  PALLET: "Pallet",
  PINTURA: "Pintura",
  MATERIAL: "Material",
  HERRAMIENTA: "Herramienta",
  OTRO: "Otro",
};

export const CATEGORIAS: InventoryCategory[] = [
  "MATERIA_PRIMA",
  "PALLET",
  "PINTURA",
  "MATERIAL",
  "HERRAMIENTA",
  "OTRO",
];

export const MEDIDA_LABEL: Record<InventoryMeasureUnit, string> = {
  LITROS: "L",
  METROS: "m",
  KILOS: "kg",
};

/** Cantidad como la escribe la bodega: "80%" para un envase abierto, o el conteo. */
export function formatearCantidad(
  item: Pick<InventoryItemRow, "quantity" | "fillPercent">
): string {
  if (item.fillPercent != null) return `${item.fillPercent}%`;
  return String(item.quantity);
}
