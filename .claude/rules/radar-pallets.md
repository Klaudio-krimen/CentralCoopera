---
paths:
  - "lib/outreach/radar.ts"
  - "lib/outreach/radar.test.ts"
  - "lib/outreach/eligibility.ts"
  - "lib/outreach/eligibility.test.ts"
  - "scripts/import-radar-pallets.ts"
  - "lib/outreach/templates/industria.ts"
---

# Radar de Clientes Pallets — convenciones de área

- **Puro, sin I/O.** `radar.ts` y `eligibility.ts` no importan `@prisma/client`, `@/lib/db` ni
  `fs`. Reciben datos por parámetro (interfaz estructural mínima), `import type` para tipos de
  Prisma. Imports **relativos** (`./prospects`, `./render`), **nunca** el alias `@/` — Vitest no lo
  resuelve y sólo recoge `lib/**/*.test.ts`.
- **Reusar, no re-implementar.** `clean()` y `parseCsv()` vienen de `./prospects` (exportados).
  `renderGreeting`/`assembleEmail`/`escapeHtml` de `./render`. `GENERIC_PREFIXES` y `slugify` son
  **privados** de `prospects.ts` (no exportados): `eligibility.ts` **replica** el array
  `["contacto","info","ventas","contact","sac","atencion","hola"]`; `normalizeCompanyName` es
  función NUEVA en `radar.ts` — no tocar `slugify`/`dedupeKey` de `prospects.ts` (los fija
  `prospects.test.ts`).
- **`normalizeCompanyName`:** `toLowerCase` → NFD sin diacríticos → colapsar espacios → quitar
  sufijo societario final de una lista **cerrada** → trim. Match **exacto** tras normalizar, nunca
  substring.
- **`classifySegment`:** keywords de la spec §6.2, case+acento-insensible. Farmacéutica antes que
  logística. Fallback `INDUSTRIA`.
- **El importador rellena campos vacíos, JAMÁS pisa.** `fillData` sólo con claves `null`/`""`.
  Correo entrante distinto al de todos los contactos de la empresa → `Contact` nuevo (no pisar).
  No reintroducir el bug de dedupe por email-only de 2026-08-05.
- **`callStatus: "POR_LLAMAR"`** sólo cuando el contacto tiene teléfono y NO tiene correo, y sólo si
  hoy está `null` (no pisar un estado que Ventas ya movió).
- **`source: "IMPORT"`** (no agregar valores a `ContactSource`) + nota `"Origen: Radar de Clientes
Pallets V7"`.
- **`industria.ts`** es espejo exacto de `logistica.ts`: misma firma, `renderGreeting`,
  `assembleEmail`, `escapeHtml` en cada valor del HTML. Sin `<img>`, sin `"GRATIS"` en el subject.
  Ese directorio NO lleva `.spec.md`.
- **El script:** `ts-node --project tsconfig.scripts.json`, `loadEnvLocal()` copiado verbatim de
  `import-prospects.ts`, `--dry-run` que no escribe, `ImportStats` con `bySegment`.
