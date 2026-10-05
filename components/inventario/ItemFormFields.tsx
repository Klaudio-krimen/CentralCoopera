"use client";

import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  type InventoryCategory,
  type InventoryCondition,
  type InventoryMeasureUnit,
} from "./types";

export interface FormState {
  name: string;
  category: InventoryCategory;
  details: string;
  format: string;
  color: string;
  measureValue: string;
  measureUnit: InventoryMeasureUnit | "";
  quantity: string;
  fillPercent: string;
  condition: InventoryCondition | "";
  notes: string;
}

const MEDIDAS: { value: InventoryMeasureUnit | ""; label: string }[] = [
  { value: "", label: "Sin medida" },
  { value: "LITROS", label: "Litros" },
  { value: "METROS", label: "Metros" },
  { value: "KILOS", label: "Kilos" },
];

export default function ItemFormFields({
  form,
  formId,
  onChange,
}: {
  form: FormState;
  formId: string;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label
          htmlFor={`${formId}-name`}
          className="block text-sm font-medium text-zinc-700"
        >
          Nombre *
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          value={form.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="Ej: ESMALTE AL AGUA"
          className="input-base"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-details`}
            className="block text-sm font-medium text-zinc-700"
          >
            Marca / detalles
          </label>
          <input
            id={`${formId}-details`}
            type="text"
            value={form.details}
            onChange={(event) => onChange("details", event.target.value)}
            placeholder="HILTI, 20 pulgadas..."
            className="input-base"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-format`}
            className="block text-sm font-medium text-zinc-700"
          >
            Formato
          </label>
          <input
            id={`${formId}-format`}
            type="text"
            value={form.format}
            onChange={(event) => onChange("format", event.target.value)}
            placeholder="TARRO, BOLSA, MALETA..."
            className="input-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-color`}
            className="block text-sm font-medium text-zinc-700"
          >
            Color
          </label>
          <input
            id={`${formId}-color`}
            type="text"
            value={form.color}
            onChange={(event) => onChange("color", event.target.value)}
            className="input-base"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-category`}
            className="block text-sm font-medium text-zinc-700"
          >
            Categoría
          </label>
          <select
            id={`${formId}-category`}
            value={form.category}
            onChange={(event) => {
              const category = CATEGORIAS.find(
                (value) => value === event.target.value
              );
              if (category) onChange("category", category);
            }}
            className="input-base"
          >
            {CATEGORIAS.map((category) => (
              <option key={category} value={category}>
                {CATEGORIA_LABEL[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-measureUnit`}
            className="block text-sm font-medium text-zinc-700"
          >
            Medida (formato del envase)
          </label>
          <select
            id={`${formId}-measureUnit`}
            value={form.measureUnit}
            onChange={(event) => {
              const measureUnit = MEDIDAS.find(
                (measure) => measure.value === event.target.value
              );
              if (measureUnit) onChange("measureUnit", measureUnit.value);
            }}
            className="input-base"
          >
            {MEDIDAS.map((measure) => (
              <option key={measure.value} value={measure.value}>
                {measure.label}
              </option>
            ))}
          </select>
        </div>
        {form.measureUnit && (
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-measureValue`}
              className="block text-sm font-medium text-zinc-700"
            >
              Valor
            </label>
            <input
              id={`${formId}-measureValue`}
              type="text"
              inputMode="decimal"
              value={form.measureValue}
              onChange={(event) => onChange("measureValue", event.target.value)}
              placeholder="3,7"
              className="input-base font-mono"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-quantity`}
            className="block text-sm font-medium text-zinc-700"
          >
            Cantidad (unidades)
          </label>
          <input
            id={`${formId}-quantity`}
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={form.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
            className="input-base font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-fillPercent`}
            className="block text-sm font-medium text-zinc-700"
          >
            Nivel del envase (%)
          </label>
          <input
            id={`${formId}-fillPercent`}
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            value={form.fillPercent}
            onChange={(event) => onChange("fillPercent", event.target.value)}
            placeholder="Sólo envases abiertos"
            className="input-base font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">
          Estado
        </label>
        <div className="flex gap-4">
          {(
            ["NUEVO", "USADO"] as const satisfies readonly InventoryCondition[]
          ).map((condition) => (
            <label
              key={condition}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <input
                type="radio"
                name={`${formId}-condition`}
                checked={form.condition === condition}
                onChange={() => onChange("condition", condition)}
              />
              {condition === "NUEVO" ? "Nuevo" : "Usado"}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="radio"
              name={`${formId}-condition`}
              checked={form.condition === ""}
              onChange={() => onChange("condition", "")}
            />
            Sin definir
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${formId}-notes`}
          className="block text-sm font-medium text-zinc-700"
        >
          Comentario
        </label>
        <input
          id={`${formId}-notes`}
          type="text"
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Ej: con 3 baterías, sin cable..."
          className="input-base"
        />
      </div>
    </>
  );
}
