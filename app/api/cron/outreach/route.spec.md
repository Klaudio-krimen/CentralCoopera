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
2. Si faltan los datos legales del remitente (`OUTREACH_PUBLIC_URL`,
   `OUTREACH_SENDER_LEGAL_NAME`, `OUTREACH_SENDER_RUT`,
   `OUTREACH_SENDER_ADDRESS`) responde `200` sin enviar — es un error de
   config, no algo que reintentar (Ley 19.496 art. 28 B).
3. **Query de elegibilidad por `Company`** (no por `Contact`), por cada
   campaña activa: `isActive = true`, `segment` = el de la campaña, sin
   `OutreachSend` previo para esa `campaignId`
   (`outreachSends: { none: { campaignId } }`), **sin gestión telefónica
   iniciada** (`NOT: { contacts: { some: { callStatus: { not: null, notIn:
["POR_LLAMAR"] } } } }` — la regla de `isCompanyPhoneManaged` como filtro),
   y con al menos un contacto enviable (`email != null`, `optOut = false`,
   `emailStatus != REBOTADO`). El `include` trae sólo esos contactos.
   `orderBy: createdAt asc` — los prospectos más antiguos primero.
4. **Tope global.** `globalCap = Number(process.env.OUTREACH_DAILY_CAP ?? 25)`.
   `presupuesto = max(0, globalCap - <OutreachSend con sentAt de hoy UTC>)`.
   `allocateDailyBudget(campañas, poolSizes, presupuesto)` de
   `lib/outreach/eligibility.ts` reparte ese presupuesto entre las campañas
   proporcionalmente a su pool de empresas elegibles, respetando el
   `dailyCap` de cada una como techo. `dailyCap` dejó de ser la meta por
   campaña; el tope real es global y compartido.
5. Por campaña toma sus primeras `allocation[campaignId]` empresas. Descarga
   el PDF de `campaign.pdfBlobUrl` una sola vez por campaña (si hay
   objetivo) y lo adjunta a cada envío.
6. **Un solo correo por empresa.** `pickCompanyContact(contactosElegibles)`
   elige el destinatario: casilla genérica (`info@`, `contacto@`, …) antes
   que nominativa; a igualdad, el `createdAt` menor. Los demás contactos
   quedan como respaldo manual para Ventas.
7. Por empresa elegida: genera `optOutToken` si falta, renderiza la
   plantilla de `lib/outreach/templates`, envía vía `lib/outreach/smtp.ts`,
   y escribe `OutreachSend` (`ENVIADO`) + `Activity(type=EMAIL)` en la ficha
   de la empresa. Jitter aleatorio (3–7s) entre envíos.
8. Si un envío falla, registra `OutreachSend(status=FALLIDO, error=...)` y
   sigue con el resto — un correo roto no frena el lote.

## Por qué el usuario "sistema" (`lib/outreach/system-user.ts`)

`Activity.createdById` es una FK obligatoria a `User`. No hay un usuario
humano detrás de un envío de cron, así que se usa una sola fila reservada
(`sistema-outreach@cooperapro.cl`, `isActive: false` — no puede loguearse,
`lib/auth.ts` bloquea usuarios inactivos) creada la primera vez que corre el
cron. Alternativa descartada: aflojar `createdById` a opcional en el schema
— hubiera afectado todo `Activity`, no solo outreach.

## Idempotencia

Correr el cron dos veces el mismo día no reenvía nada: la query de
elegibilidad de la segunda corrida excluye toda **empresa** que ya tenga un
`OutreachSend` para esa campaña (`company: { outreachSends: { none: {
campaignId } } }`). El `@@unique([campaignId, contactId])` es la garantía
dura por si dos ejecuciones corrieran en paralelo (constraint de BD, no sólo
lógica de aplicación). El "1 correo por empresa" **no** se implementa
tocando ese constraint — sale de que la query es por `Company` y
`pickCompanyContact` elige uno. Además, el tope global descuenta lo ya
enviado hoy (`sentAt >= inicio del día UTC`), así que una segunda corrida el
mismo día arranca con `presupuesto` ya consumido.

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
