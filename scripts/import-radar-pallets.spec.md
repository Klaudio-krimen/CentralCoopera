# `scripts/import-radar-pallets.ts` — spec

## Qué hace

Épica `01-ingesta-modelo` de `blueprints/importacion-radar-pallets/`. Incorpora
al CRM los ~127 prospectos con contacto verificado del "Radar de Clientes
Pallets V7" (`IMPORTACION_RADAR_PALLETS.md`). Lee las 3 hojas del Excel
exportadas por el usuario a CSV UTF-8
(`data/prospects/raw/radar_prospectos.csv`, `radar_top20.csv`,
`radar_top25.csv`), las procesa con la lógica pura de `lib/outreach/radar.ts`
(`parseRadarSheet` → `consolidateRows` → `toRadarProspect`) y crea o enriquece
`Company` + `Contact`.

**No reemplaza nada.** Se suma a las ~120 empresas del import anterior (Apify,
`import-prospects.ts`).

## Por qué existe como script y no como endpoint

Igual que `import-prospects.ts`: corre sobre archivos locales generados fuera
del ciclo request/response (el usuario exporta el `.xlsx` a mano) y su ejecución
es puntual —cuando llega una versión nueva del Radar, no en cada request. Un
`/api/prospects/import` para cargas desde el navegador es trabajo aparte.

## Decisiones de diseño

- **Lógica pura separada en `lib/outreach/radar.ts`.** Parseo de CSV,
  `splitPhones`, `normalizeCompanyName`, `classifySegment`, `consolidateRows` y
  `toRadarProspect` no tocan Prisma ni `fs`: se testean con Vitest sin base de
  datos (`lib/outreach/radar.test.ts`). Este script es sólo el I/O (leer los
  CSV, hablar con Prisma) sobre esa lógica.
- **Dedup por nombre de empresa normalizado, sin RUT ni `place_id`.** Ninguna
  de las 3 hojas del Radar trae RUT ni identificador de Google Places (spec §3),
  así que la clave de dedupe es `normalizeCompanyName(name)`: minúsculas, sin
  tildes (la `ñ` se conserva), espacios colapsados, sufijo societario final de
  una lista **cerrada** (`s.a`, `spa`, `ltda`, `limitada`, `sac`, `eirl`, …)
  quitado. **Match exacto** tras normalizar, nunca substring — así "Novofarma
  Service" y "Laboratorio Novofarma Service" no se fusionan. Riesgo aceptado
  (spec §10): nombre comercial vs razón social puede no matchear; revisar el
  reporte del `--dry-run` antes de la corrida real.
- **Consolidación entre las 3 hojas antes de tocar la base.** Una empresa puede
  estar en varias hojas; `consolidateRows` deja una sola fila por empresa: gana
  la de **más campos con valor**; si empatan, la de la hoja de mayor prioridad
  (`Prospectos verificados` > `TOP 20` > `TOP 25`). `dedupedWithinBatch` en el
  resumen = filas colapsadas acá.
- **`--dry-run` primero, siempre.** `process.argv.includes("--dry-run")` → no
  escribe ni una fila; recorre el mismo pipeline, hace las mismas lecturas y
  emite el mismo resumen para revisar el plan. La corrida real se hace después
  de leerlo (spec §11).
- **Actualizar rellena, nunca pisa** (CLAUDE.md §10, regla dura 2). `fillData`
  se arma sólo con claves cuyo valor actual es `null`/`""`; hay `update` sólo si
  quedó con keys. Del Radar, una `Company` existente sólo puede recibir
  `category` (desde `Tipo`) y `segment` (derivado) — no trae web/comuna/geo. Un
  `Contact` existente recibe `email`/`phone`/`notes` vacíos.
- **El match de `Contact` busca por `email` OR `phone`, nunca uno excluyendo al
  otro.** Reintroducir "buscar sólo por email" es el bug de producción del
  2026-08-05 (un contacto ya cargado a mano con teléfono y sin correo no se
  detectaba y se duplicaba). Un correo entrante que no matchea ningún contacto
  de una empresa que ya tiene contactos → se **crea uno nuevo**, no se pisa el
  existente (spec §5: "correo distinto → conservar ambos").
- **`callStatus: "POR_LLAMAR"` sólo si el contacto tiene teléfono y no tiene
  correo, y sólo si hoy está `null`.** No pisa un estado que Ventas ya movió
  (área rules). Es un estado, como `ContactTemperature` — no escribe `Activity`.
- **`source: "IMPORT"`** (no se agregan valores a `ContactSource`, CLAUDE.md §7)
  - primera línea de nota `"Origen: Radar de Clientes Pallets V7"`. "Próximo
    paso" y "Observación" entran como texto libre en `notes`: son notas de
    investigación, no historial de contacto (spec §3/§8).
- **`HEADER_MAP` ajustable.** `parseRadarSheet` empareja los rótulos de columna
  tolerando mayúsculas y ausencia de tildes (`"telefono"`, `"correo"`, …). Si el
  export del usuario usa otros nombres, se edita `HEADER_MAP` en
  `lib/outreach/radar.ts` — no este script.
- **Índice de `Company` en memoria.** Se lee **una** vez
  (`prisma.company.findMany`), se indexa por nombre normalizado y se mantiene al
  día con lo que el run crea/actualiza, para que la idempotencia valga incluso
  dentro de la misma corrida.
- **Sin dependencias nuevas** (CLAUDE.md §10, regla 12). El usuario convierte el
  `.xlsx` a 3 CSV; el parser y `loadEnvLocal()` se reusan / copian, no se
  agregan librerías.
- **`tsconfig.scripts.json` dedicado.** `ts-node --project tsconfig.scripts.json`
  (CommonJS / `moduleResolution: node`) para que resuelva `../lib/outreach/radar`
  — misma razón que `import-prospects.ts`.

## Cómo correrlo

```bash
npm run import:radar -- --dry-run   # revisar el plan y el reparto por segmento
# ...leer el resumen...
npm run import:radar                # corrida real
```

Requiere `DATABASE_URL` y `DIRECT_URL` reales en `.env.local` (ver
`VARIABLES_ENTORNO.md`) y los 3 CSV en `data/prospects/raw/`. Es un paso
**manual post-build**, no un `verify` del build order (`blueprint.md` §12).

## Salida esperada

```
Filas del Radar: 127 (118 empresas tras consolidar las 3 hojas)

Resultado de la importación:
  Empresas creadas:        NN
  Empresas enriquecidas:   NN
  Contactos creados:       NN
  Contactos enriquecidos:  NN
  Marcados POR_LLAMAR (teléfono sin correo): NN
  Filas sin dato de contacto (descartadas): NN
  Duplicados dentro del lote (consolidados): NN
  Por segmento:  LOGISTICA NN  ·  FARMACEUTICA NN  ·  INDUSTRIA NN
```

Correrlo **dos veces seguidas** con los mismos CSV: la segunda corrida debe dar
`Empresas creadas: 0` y `Contactos creados: 0` (idempotencia, spec §9). Si la
segunda corrida crea algo, la normalización de nombre difiere entre el índice en
memoria y lo guardado — revisar antes de seguir.

## Qué NO hace

- No envía correos ni activa campañas — las 3 campañas quedan `isActive=false`
  hasta resolver los bloqueantes de entregabilidad (spec §10).
- No crea `OutreachCampaign` ni `OutreachSend` (eso es el seed de E2-T1 y el
  cron).
- No puntúa contactos ni calcula elegibilidad de envío.
- No borra ni desactiva empresas que dejaron de aparecer en una versión nueva
  del Radar.

## Siguiente paso

Épica `02-envio-llamadas`: seed de la campaña `INDUSTRIA` (E2-T1), reparto de
cupo global de 25 correos/día (E2-T2 `eligibility.ts` + E2-T3 cron), y la vista
`/admin/crm/llamadas` con el `callStatus` editable (E2-T4…E2-T6).
