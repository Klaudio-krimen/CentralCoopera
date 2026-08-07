# `GET /api/outreach/unsubscribe` — spec

Fase 3 de `PROSPECCION_OUTREACH.md` §6. Endpoint público, **sin login** — el
enlace va en el pie de cada correo de outreach (`lib/outreach/templates/render.ts`)
y quien lo recibe no tiene cuenta en el CRM. Obligatorio por Ley 19.496 art.
28 B (Chile): toda comunicación promocional debe traer un medio de baja
gratuito.

## Query param

`t` — el `Contact.optOutToken` (24 bytes aleatorios en hex, generado por
`lib/outreach/unsubscribe.ts` la primera vez que ese contacto recibe un
correo).

## Qué hace

1. Sin `t` o con un token que no matchea ningún `Contact` → página de error
   simple (400/404), sin filtrar información sobre si el correo existe en la
   base o no.
2. Con un token válido → `optOut = true`, `optOutAt = now()`. Si el contacto
   ya estaba dado de baja, no hace nada (idempotente — visitar el link dos
   veces no rompe nada ni pisa `optOutAt` con una fecha más nueva).
3. Devuelve una página HTML mínima de confirmación (sin CSS externo, sin
   dependencias — es una página de una sola visita, no vale la pena montarla
   en el App Router de Next).

## Por qué `optOut` es permanente, no por campaña

Regla operativa de §9: "Honrar el `optOut` para siempre y en todas las
campañas, no por campaña". Por eso vive en `Contact`, no en `OutreachSend` —
una vez que alguien se da de baja, la query de elegibilidad del cron
(`app/api/cron/outreach/route.ts`) lo excluye de cualquier campaña futura,
no solo de la que lo llevó a hacer clic.

## Qué NO hace

- No pide confirmación ("¿seguro?") — un solo clic da de baja, tal como
  exige la ley (baja debe ser "gratuita y expedita", no un formulario con
  fricción).
- No requiere CAPTCHA ni rate-limit — es un token de 24 bytes, no adivinable
  por fuerza bruta en un tiempo razonable.
