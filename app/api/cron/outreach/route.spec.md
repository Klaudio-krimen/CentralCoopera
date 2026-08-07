# `GET /api/cron/outreach` — spec

Fase 3 de `PROSPECCION_OUTREACH.md`. Lote diario de outreach — lo dispara
Vercel Cron (`vercel.json`, `0 12 * * 1-5` ≈ 09:00 hora de Chile en horario
estándar; con horario de verano se corre ~1h antes en local — aceptable para
un lote diario, no crítico al minuto).

## Auth

Header `Authorization: Bearer $CRON_SECRET` — es el que Vercel agrega solo
cuando el proyecto tiene la variable `CRON_SECRET` configurada. También
acepta `x-cron-secret` como alternativa para gatillarlo a mano en pruebas.
Sin `CRON_SECRET` configurado en el entorno, el endpoint rechaza todo (falla
cerrado, no abierto).

## Qué hace

1. Busca todas las `OutreachCampaign` con `isActive=true`. Si no hay
   ninguna, responde `200` igual (`{ campaigns: 0, sent: 0 }`) — nunca hay
   que hacer que Vercel reintente esto.
2. Por cada campaña activa, arma la query de elegibilidad exacta de
   `PROSPECCION_OUTREACH.md` §4: `email != null`, `optOut = false`,
   `emailStatus != REBOTADO`, `company.isActive = true`, `company.segment`
   igual al segmento de la campaña, y sin `OutreachSend` previo para esa
   `campaignId` (`outreachSends: { none: { campaignId } } }` — el `NOT
EXISTS` de la spec expresado como filtro de relación de Prisma).
3. Toma como máximo `campaign.dailyCap` contactos.
4. Descarga el PDF de `campaign.pdfBlobUrl` una sola vez por campaña (no por
   contacto) y lo adjunta a cada envío.
5. Por contacto: genera `optOutToken` si no tiene uno, renderiza la
   plantilla de `lib/outreach/templates`, envía vía
   `lib/outreach/smtp.ts`, y escribe `OutreachSend` (idempotencia dura por
   el `@@unique([campaignId, contactId])` del schema) + `Activity(type=EMAIL)`
   para que quede en la ficha de la empresa.
6. Espera un jitter aleatorio (3–7s) entre cada envío — nunca dispara todos
   en el mismo segundo.
7. Si un envío falla, registra `OutreachSend(status=FALLIDO, error=...)` y
   sigue con el resto — un correo roto no debe frenar el lote completo.

## Por qué el usuario "sistema" (`lib/outreach/system-user.ts`)

`Activity.createdById` es una FK obligatoria a `User`. No hay un usuario
humano detrás de un envío de cron, así que se usa una sola fila reservada
(`sistema-outreach@cooperapro.cl`, `isActive: false` — no puede loguearse,
`lib/auth.ts` bloquea usuarios inactivos) creada la primera vez que corre el
cron. Alternativa descartada: aflojar `createdById` a opcional en el schema
— hubiera afectado todo `Activity`, no solo outreach.

## Idempotencia

Correr el cron dos veces el mismo día no reenvía nada: la query de
elegibilidad de la segunda corrida excluye automáticamente a cualquier
contacto que ya tenga un `OutreachSend` para esa campaña. El
`@@unique([campaignId, contactId])` es la garantía dura por si dos
ejecuciones corrieran en paralelo (constraint de BD, no solo lógica de
aplicación).

## Envío: SMTP, no Microsoft Graph

Decisión revisada (ver `PROSPECCION_OUTREACH.md` §3 y §8): el correo de
Coopera Pro está contratado con Hostinger, no con Microsoft 365 — Outlook es
solo el cliente IMAP en el PC del usuario, no hay Exchange Online detrás.
Graph API no tiene a qué conectarse sin un tenant de Entra ID real, así que
el envío es SMTP directo (`lib/outreach/smtp.ts`, vía `nodemailer`) contra el
servidor de Hostinger, con el usuario/contraseña del buzón remitente.

## Qué NO hace

- No valida SPF/DKIM/DMARC del dominio remitente — eso es infraestructura
  externa, no responsabilidad del endpoint. Si el dominio no está bien
  configurado, los correos se mandan igual (y probablemente reboten o caigan
  en spam) — es la razón por la que las campañas creadas por
  `seed-outreach-campaigns.ts` quedan `isActive=false` por defecto.
- No reintenta un envío `FALLIDO` automáticamente en la misma corrida ni en
  la siguiente (el `OutreachSend` ya existe para ese `campaignId+contactId`,
  así que la query de elegibilidad no lo vuelve a traer). Reintentar un
  fallido es un caso manual, fuera de alcance v1.
- No pixel de tracking de apertura (regla de entregabilidad §10).
