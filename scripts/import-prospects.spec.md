# `scripts/import-prospects.ts` — spec

## Qué hace

Fase 2 de `PROSPECCION_OUTREACH.md`. Lee los dos CSV crudos de Apify
(`data/prospects/raw/logistica_2026-07-28.csv` y
`data/prospects/raw/farmaceutica_norte_santiago.csv`, distinto schema cada
uno) más el CSV de correos enriquecidos de la Fase 1
(`data/prospects/candidatas_enriquecidas.csv`), normaliza, deduplica y
crea/actualiza `Company` + `Contact` en la base de datos.

## Por qué existe como script y no como endpoint

Corre sobre archivos locales generados fuera del ciclo de request/response
(descargas de Apify), y su ejecución es puntual — cuando llega un lote nuevo
de prospección, no en cada request. `/api/prospects/import` (aún no
implementado) es el paso siguiente para cuando el flujo necesite aceptar CSV
subidos desde el navegador; este script cubre la carga inicial de los CSV que
ya existen.

## Decisiones de diseño

- **Lógica pura separada en `lib/outreach/prospects.ts`.** Parseo de CSV,
  normalización por fuente, cálculo de la clave de dedupe y selección del
  mejor correo no tocan Prisma ni el sistema de archivos — así se testean con
  Vitest sin una base de datos real. Este script es solo el I/O (leer CSV,
  llamar Prisma) sobre esa lógica.
- **Dedupe con prioridad `placeId → dominio → nombre+comuna`,** tal como
  especifica `PROSPECCION_OUTREACH.md` §2 y §5. Solo el CSV farmacéutico trae
  `place_id` (embebido en la URL de Google Maps); el de logística cae a
  dominio o, si no tiene sitio web, a nombre+comuna normalizado (sin acentos,
  minúsculas).
- **Dedupe en dos niveles: dentro del lote y contra la BD.** Dos filas del
  mismo run que comparten clave se colapsan antes de tocar la base (evita un
  round-trip innecesario); además, cada prospecto se busca en la BD antes de
  crear, así que correr el script dos veces con los mismos CSV no duplica
  nada — es el criterio de aceptación de la Fase 2.
- **Actualizar rellena, nunca pisa.** Si la empresa ya existe y Ventas ya
  editó un campo a mano en el CRM, el importador no lo sobrescribe — solo
  completa los campos que están vacíos. Mismo criterio para `Contact`: si ya
  existe, no se crea uno nuevo — se completan solo `email`/`phone`/`notes`
  que estén vacíos.
- **El match de `Contact` existente busca por email O por teléfono, nunca
  uno excluyendo al otro.** Bug real encontrado en producción el
  2026-08-05: la versión original solo buscaba por email cuando el
  prospecto traía uno, así que un contacto ya existente con el mismo
  teléfono pero sin correo (típico de una carga manual previa a este
  importador) no se detectaba como el mismo contacto — se creaba uno
  nuevo. Con 78 empresas ya cargadas a mano antes de la Fase 2, esto
  duplicó el 100% de los contactos que se cruzaron con datos previos.
  Corregido para buscar por `OR: [email, phone]` y rellenar el existente en
  vez de crear uno nuevo.
- **Enriquecimiento por dominio, no por fila.** El CSV de la Fase 1 mapea
  dominio → lista de correos encontrados. Si una fila no trae correo directo
  (el CSV farmacéutico nunca trae uno), se busca su dominio en ese mapa y se
  aplica `pickBestEmail` — prefiere una casilla genérica (`info@`,
  `contacto@`, `ventas@`, `sac@`) sobre una nominativa antes de crear el
  contacto, siguiendo la regla de exposición mínima de §9 del documento
  maestro.
- **"Solo teléfono" no es un caso especial en el modelo.** Una empresa sin
  sitio ni correo (directo o enriquecido) igual se importa a Company/Contact
  — simplemente nunca va a cumplir el criterio de elegibilidad de outreach
  (`email != null`), así que queda de forma natural fuera de cualquier
  campaña de correo y disponible para que Ventas la llame. No se agregó un
  flag `callListOnly` porque sería redundante con esa exclusión implícita.
- **Sin dependencias nuevas.** Mismo criterio que `enrich-emails.ts`: parser
  de CSV y carga de `.env.local` escritos a mano.
- **`tsconfig.scripts.json` dedicado.** El `tsconfig.json` raíz usa
  `module: esnext` / `moduleResolution: bundler` (lo que necesita Next.js).
  `ts-node` no es un bundler: al importar `lib/outreach/prospects.ts` con esa
  config falla con `ERR_MODULE_NOT_FOUND`. `db:seed` ya resolvía esto con
  `--compiler-options` inline, pero esa sintaxis depende de cómo cada shell
  escapa las comillas (falla en Git Bash). `tsconfig.scripts.json` (CommonJS,
  extiende del raíz) es portable entre shells — cualquier script nuevo que
  importe otro módulo local debería usar `ts-node --project
tsconfig.scripts.json <script>` en vez de JSON inline.

## Cómo correrlo

```bash
npm run import:prospects
```

Requiere `DATABASE_URL` y `DIRECT_URL` reales en `.env.local` (ver
`VARIABLES_ENTORNO.md`) — el CLI de Prisma no carga `.env.local`
automáticamente como sí lo hace Next.js, por eso el script lo carga a mano
(mismo patrón que `enrich-emails.ts`).

## Salida esperada

```
Filas leídas: 71 logística + 49 farmacéutica = 120

Resultado de la importación:
  Empresas creadas:      92
  Empresas actualizadas: 3
  Contactos creados:     81
  Contactos duplicados (omitidos): 0
  Solo teléfono (lista de llamadas Ventas): 39
  Sin ningún dato de contacto (omitidos): 0
  Duplicados dentro del mismo lote: 0
```

## Qué NO hace

- No valida que el correo exista de verdad (SMTP check) — trabajo de
  entregabilidad de la Fase 3.
- No crea `OutreachCampaign` ni `OutreachSend` — eso es Fase 3.
- No borra ni desactiva empresas que dejaron de aparecer en un CSV nuevo.
- No expone un endpoint HTTP — ver "Por qué existe como script" arriba.

## Siguiente paso

`/api/prospects/import` (Fase 2, aún no implementado) para cargas manuales
desde el CRM, y luego la Fase 3 (motor de envío) sobre los `Contact` que
quedaron con `email != null`.
