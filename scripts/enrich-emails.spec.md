# `scripts/enrich-emails.ts` — spec

## Qué hace

Fase 1 de `PROSPECCION_OUTREACH.md`. Lee
`data/prospects/candidatas_enriquecimiento.csv` (55 empresas con sitio web pero sin
correo, ya filtradas de los CSV originales de Apify) y corre el actor
`vdrmota/contact-info-scraper` sobre cada dominio para extraer correos de contacto.

Escribe `data/prospects/candidatas_enriquecidas.csv` con dos columnas nuevas:
`emails_encontrados` (separados por `;`) y `cantidad_emails`.

## Por qué existe como script y no como endpoint

Es una tarea de un solo uso, cara en créditos de Apify y con tiempos de varios
minutos. No pertenece al ciclo de request/response de la app ni a un cron —
se corre a mano cuando se necesita ampliar la base de prospectos.

## Decisiones de diseño

- **Async + polling, no `run-sync-get-dataset-items`.** Con 55 URLs y `maxDepth: 1`
  el actor puede superar el límite de ~5 minutos del endpoint síncrono. El polling
  no tiene ese techo (con tope de `MAX_POLL_MINUTES`).
- **Merge por dominio, no por URL exacta.** El actor puede normalizar la URL
  (agregar/quitar `www.`, slash final, etc.). El dominio es la clave estable.
- **Extracción defensiva de campos.** No se conoce con certeza el schema exacto de
  salida del actor en la versión vigente — `extractEmails` prueba varios nombres de
  campo (`emails`, `email`, `contactEmails`) en vez de asumir uno solo. Si Apify
  cambia el schema, ajustar solo esa función.
- **Sin dependencias nuevas.** Parser de CSV y carga de `.env.local` escritos a mano
  (unas pocas líneas) para no forzar `npm install` de `papaparse`/`dotenv` solo por
  un script de un uso.
- **Alerta si la tasa de éxito < 40%.** Es la tasa esperada según el diagnóstico de
  `PROSPECCION_OUTREACH.md` §1. Por debajo de eso, algo cambió (dominios caídos,
  actor desactualizado) y conviene revisar a mano antes de seguir.

## Cómo correrlo

```bash
# 1. Agregar a .env.local
APIFY_TOKEN="tu-token-de-apify"

# 2. Correr
npm run enrich:emails
```

## Salida esperada

```
Candidatas a enriquecer: 55
Run iniciado: <id>. Consultando cada 10s...
  estado: RUNNING
  estado: RUNNING
  estado: SUCCEEDED
Apify devolvió 55 resultados.

Resultado: 31/55 empresas con al menos un correo (56.4%).
Guardado en: data/prospects/candidatas_enriquecidas.csv
```

## Siguiente paso

El CSV de salida es el insumo directo de la Fase 2 (`scripts/import-prospects.ts`,
aún no implementado) — junto con los CSV originales de Apify, que aportan además
`rating`, `reviews` y `senal_de_calificacion` para el scoring de cada prospecto.

## Qué NO hace

- No valida que el correo exista de verdad (SMTP check) — eso es trabajo de
  entregabilidad de la Fase 3, no de esta fase.
- No escribe nada en la base de datos. Es puro archivo → archivo.
- No reintenta automáticamente si Apify devuelve `FAILED`. Se corre a mano de nuevo.
