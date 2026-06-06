# Librería: Utilidades

**Archivo:** `lib/utils.ts`

## Funciones requeridas

---

### `calculateDiscrepancy(declared: number, received: number): number`
Calcula el porcentaje de diferencia entre lo declarado y lo recibido.
- Fórmula: `Math.abs(declared - received) / declared * 100`
- Si `declared === 0`: retorna 0 (evita división por cero)

---

### `getDiscrepancySeverity(percentDiff: number): DiscrepancySeverity | null`
Clasifica la severidad según el porcentaje:
- `0 ≤ diff ≤ umbral` → `null` (sin discrepancia)
- `umbral < diff ≤ 5` → `"MENOR"`
- `5 < diff ≤ 20` → `"MODERADA"`
- `diff > 20` → `"GRAVE"`

El umbral se lee de `process.env.DISCREPANCY_THRESHOLD_PERCENT`

---

### `formatOrderCode(year: number, seq: number): string`
Formatea el código de orden: `RET-{YEAR}-{seq padded to 4 digits}`
- Ejemplo: `formatOrderCode(2026, 42)` → `"RET-2026-0042"`

---

### `formatDate(date: Date | string): string`
Formatea una fecha para mostrar en la interfaz: `"DD/MM/YYYY HH:mm"`

---

### `formatQuantity(value: number, unit: MaterialUnit): string`
Formatea cantidad con unidad: `"150 kg"`, `"3 m³"`, `"20 unidades"`

---

### `apiError(message: string, status: number, code?: string): NextResponse`
Helper para construir respuestas de error consistentes en las API Routes.
Retorna `NextResponse.json({ error: message, code }, { status })`
