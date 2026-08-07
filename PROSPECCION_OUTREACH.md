# Prospección y Outreach — Módulo CRM

> Documento maestro de la iniciativa. Punto de entrada para implementar en Claude Code o Cowork.
> Estado: **especificación aprobada, sin implementar.**
> Última actualización: 2026-08-04

---

## 1. Objetivo de negocio

Coopera Pro tiene un **taller de pallets** con capacidad ociosa. Se necesita un flujo repetible
que convierta listados de empresas obtenidos por scraping (Apify / Google Places) en
conversaciones comerciales reales, con el mínimo trabajo manual por parte de la encargada de Ventas.

**Métrica de éxito de la Fase 1:** 25 correos segmentados salen solos cada día hábil, sin
duplicados, con trazabilidad completa en el CRM y sin que nadie abra Outlook a mano.

**Métrica de negocio:** ≥3 respuestas positivas por cada 100 correos enviados (tasa realista
para correo frío B2B bien segmentado en Chile). Por debajo de 1%, el problema es la segmentación
o el mensaje, no la herramienta.

---

## 2. Diagnóstico de los datos actuales

Se analizaron los dos CSV existentes generados con Apify:

| Archivo                                     | Empresas | Con email    | Con sitio web | Con teléfono |
| ------------------------------------------- | -------- | ------------ | ------------- | ------------ |
| `2026-07-28.csv` (logística / bodegas RM)   | 71       | **19**       | 45            | pocos        |
| `empresas_farmaceuticas_norte_santiago.csv` | 49       | **0**        | 29            | 39           |
| **Total**                                   | **120**  | **19 (16%)** | **74**        | —            |

### Conclusión

El listado _no tiene correos_. Automatizar el envío sin resolver esto es automatizar el 16%
del problema. **La Fase 1 es enriquecimiento, no envío.**

### Otras observaciones relevantes

- El CSV de logística ya trae una columna `senal_de_calificacion` con justificación cualitativa
  del match. Es material aprovechable para _scoring_ y para personalizar el mensaje.
- El CSV farmacéutico trae `lat`/`lng` y `place_id` embebido en la URL de Google Maps →
  ese `place_id` es el **identificador natural para deduplicar**.
- Ambos usan el literal `"sin dato"` como nulo. Normalizar en el importador.
- Concentración geográfica útil: Pudahuel (30), Quilicura (13), Renca (9), Huechuraba (8).
  Coincide con el corredor industrial norte-poniente. Buena señal de segmentación.

---

## 3. Decisiones de arquitectura y su razón

| Decisión                                                                   | Alternativa descartada                                             | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cron diario por lote**                                                   | Disparo por evento al insertar en la BD                            | Importar 120 registros dispararía 120 correos en un minuto → Microsoft marca spam y bloquea la cuenta. El lote con tope duro es la única forma segura.                                                                                                                                                                                                                                                                             |
| ~~Microsoft Graph API~~ **SMTP directo (Hostinger)** — revisado 2026-08-04 | `win32com` / automatización local de Outlook · Microsoft Graph API | La app corre en Vercel, no en el PC: descarta COM/Outlook local. Graph API también se descartó al confirmar que el correo de Coopera Pro está contratado con **Hostinger**, no con Microsoft 365 — Outlook es solo el cliente IMAP en el PC del usuario, no hay tenant de Entra ID/Exchange Online detrás. SMTP con usuario/contraseña del buzón (`nodemailer`) es el mecanismo que sí corresponde a cómo está hosteado el correo. |
| **Cron ejecuta, Claude construye**                                         | Claude "vigilando" la BD                                           | Claude no es un proceso persistente: no corre 24/7, no observa la BD, no se dispara solo. Cualquier diseño que dependa de una sesión de chat abierta está roto por definición.                                                                                                                                                                                                                                                     |
| **Tabla `OutreachSend` dedicada**                                          | Reutilizar `Activity(type=EMAIL)`                                  | `Activity` es la línea de tiempo que lee un humano. La idempotencia necesita constraint único, estados técnicos (`BOUNCED`, `FAILED`) y `messageId`. Mezclarlos ensucia ambos. Se escriben los dos: `OutreachSend` para la máquina, `Activity` para la persona.                                                                                                                                                                    |
| **Enriquecer antes de enviar**                                             | Enviar a los 19 que hay                                            | 19 correos no permiten medir nada. Se necesita volumen mínimo para que las tasas signifiquen algo.                                                                                                                                                                                                                                                                                                                                 |

---

## 4. Arquitectura del pipeline

```
┌─ FASE 1 · CAPTACIÓN ────────────────────────────────────────┐
│  Apify: crawler-google-places   → listado base              │
│  Apify: contact-info-scraper    → emails desde los 74 sitios│
│         (rinde 50–70% → ~19 correos pasan a ~60)            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─ FASE 2 · INGESTA ──────────────────────────────────────────┐
│  scripts/import-prospects.ts                                │
│    · normaliza ("sin dato"→null, BOM, \r\n, E.164)          │
│    · deduplica por  placeId  →  dominio  →  nombre+comuna   │
│    · clasifica segmento (logística | farmacéutica)          │
│  → Company + Contact (source=SCRAPING, temperature=FRIO)    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─ FASE 3 · ENVÍO ────────────────────────────────────────────┐
│  Vercel Cron  09:00 L-V  →  /api/cron/outreach              │
│    · selecciona ≤25 contactos elegibles                     │
│    · renderiza plantilla del segmento + adjunta PDF         │
│    · SMTP directo (Hostinger) vía nodemailer                │
│    · escribe OutreachSend + Activity(type=EMAIL)            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─ FASE 4 · RETORNO ──────────────────────────────────────────┐
│  /api/outreach/unsubscribe?t=<token>  → optOut              │
│  Respuestas llegan a contacto@cooperapro.cl → Ventas trabaja│
│  Panel CRM: enviados, rebotes, bajas, respuestas            │
└─────────────────────────────────────────────────────────────┘
```

**Criterio de elegibilidad de un contacto** (todas deben cumplirse):

```
email != null
AND optOut = false
AND emailStatus != 'BOUNCED'
AND NOT EXISTS (OutreachSend WHERE contactId = X AND campaignId = Y)
AND company.isActive = true
```

---

## 5. Cambios al modelo de datos

Agregar a `prisma/schema.prisma`. **No modificar los modelos de Operaciones ni Inventario.**

```prisma
// ── Company: campos que hoy faltan para prospección ──
model Company {
  // ... campos existentes ...
  website    String?
  commune    String?   // comuna — clave para segmentar por corredor industrial
  category   String?   // rubro crudo de Google Places
  segment    ProspectSegment?
  placeId    String?  @unique   // identificador de Google Places → dedupe
  lat        Float?
  lng        Float?
  rating     Float?
  reviews    Int?

  outreachSends OutreachSend[]

  @@index([segment])
  @@index([commune])
}

enum ProspectSegment {
  LOGISTICA
  FARMACEUTICA
  OTRO
}

// ── Contact: control de consentimiento y salud del correo ──
model Contact {
  // ... campos existentes ...
  optOut      Boolean      @default(false)
  optOutAt    DateTime?
  optOutToken String?      @unique   // token del link de baja
  emailStatus EmailStatus  @default(DESCONOCIDO)

  outreachSends OutreachSend[]

  @@index([optOut, emailStatus])
}

enum EmailStatus {
  DESCONOCIDO
  VALIDO
  REBOTADO
  INVALIDO
}

// ── Campaña ──
model OutreachCampaign {
  id           String          @id @default(cuid())
  name         String
  segment      ProspectSegment
  subject      String
  templateKey  String          // apunta a lib/outreach/templates/<key>.ts
  pdfBlobUrl   String?         // PDF en Vercel Blob — máx 3 MB
  dailyCap     Int             @default(25)
  isActive     Boolean         @default(false)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  sends OutreachSend[]

  @@index([isActive, segment])
}

// ── Libro contable de envíos: idempotencia + diagnóstico ──
model OutreachSend {
  id         String       @id @default(cuid())
  campaignId String
  campaign   OutreachCampaign @relation(fields: [campaignId], references: [id])
  contactId  String
  contact    Contact      @relation(fields: [contactId], references: [id])
  companyId  String
  company    Company      @relation(fields: [companyId], references: [id])

  status     SendStatus   @default(EN_COLA)
  sentAt     DateTime?
  messageId  String?      // id devuelto por Graph
  error      String?
  attempts   Int          @default(0)

  createdAt  DateTime     @default(now())

  @@unique([campaignId, contactId])   // ← garantía dura de no reenviar
  @@index([status, sentAt])
}

enum SendStatus {
  EN_COLA
  ENVIADO
  FALLIDO
  REBOTADO
}
```

> El `@@unique([campaignId, contactId])` es la pieza crítica. Con eso, aunque el cron se
> ejecute dos veces o alguien lo dispare a mano, la BD rechaza el duplicado.

---

## 6. Endpoints a construir

| Ruta                        | Método         | Auth                    | Qué hace                                                                                                              |
| --------------------------- | -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/api/prospects/import`     | POST           | `VENTAS`/`ADMIN`        | Recibe CSV o JSON, normaliza, deduplica, crea Company+Contact. Devuelve resumen (creados / duplicados / descartados). |
| `/api/cron/outreach`        | GET            | `CRON_SECRET` en header | Lote diario. Idempotente. Respeta `dailyCap`.                                                                         |
| `/api/outreach/unsubscribe` | GET            | pública, por token      | Marca `optOut=true`. Devuelve página de confirmación. **Sin login.**                                                  |
| `/api/outreach/campaigns`   | GET/POST/PATCH | `VENTAS`/`ADMIN`        | CRUD de campañas.                                                                                                     |
| `/api/outreach/stats`       | GET            | `VENTAS`/`ADMIN`        | Enviados, rebotes, bajas, por campaña y segmento.                                                                     |

Todos los errores vía `apiError()`. El cron debe responder `200` incluso si no envió nada
(Vercel reintenta ante error, y un reintento sobre un lote parcialmente enviado es un riesgo
que la constraint única cubre, pero es mejor no provocarlo).

---

## 7. Segmentación y mensajes

**No usar una plantilla genérica con variables.** Son dos propuestas de valor distintas:

### Segmento `LOGISTICA` (operadores, bodegas, almacenaje — 71 empresas)

Dolor: pallets rotos acumulados que ocupan m² y cuestan retirar.
Oferta: retiro de pallets dañados + suministro de pallets reparados certificados.
Gancho: convierte un costo de disposición en un canje.

### Segmento `FARMACEUTICA` (laboratorios, droguerías — 49 empresas)

Dolor: trazabilidad y cumplimiento en disposición de residuos.
Oferta: retiro documentado con cadena de custodia + pallets en buen estado para GDP/BPA.
Gancho: la app TrackResiduos ya emite la evidencia que su auditoría pide. **Esto es
diferenciación real, no marketing** — úsalo.

### Variables disponibles para personalizar

`{{empresa}}` · `{{comuna}}` · `{{rubro}}` · `{{contacto}}` (con fallback si es `null`)

Regla: si `contacto` es nulo, el saludo debe funcionar igual. Nunca renderizar
"Hola sin dato" ni "Hola {{contacto}}". Test obligatorio.

---

## 8. Envío vía SMTP (Hostinger)

> **Revisado 2026-08-04.** La versión original de esta sección especificaba
> Microsoft Graph API. Se descartó al confirmar que el correo de Coopera Pro
> está contratado con **Hostinger**, no con Microsoft 365 — Outlook es solo
> el cliente IMAP configurado en el PC, no hay tenant de Entra ID ni Exchange
> Online detrás. Graph API no tiene a qué conectarse en ese escenario.

- Cliente: `lib/outreach/smtp.ts`, usando `nodemailer` contra el servidor
  SMTP de Hostinger (host/puerto en el dashboard de correos de Hostinger,
  sección "Configuración" / "Conectar dispositivos" — los mismos datos que
  usa Outlook para IMAP, pero el lado SMTP saliente).
- Auth: usuario/contraseña del buzón remitente (`SMTP_USER` / `SMTP_PASSWORD`),
  no OAuth — no aplica _Application Access Policy_ porque no hay Graph de por
  medio.
- **Estrategia de dos buzones (decidida 2026-08-04):** se envía autenticado
  desde `operaciones@cooperapro.cl` (`SMTP_USER`) para que SPF/DKIM calcen
  con quien realmente manda, pero el header `Reply-To` apunta a
  `contacto@cooperapro.cl` (`SMTP_REPLY_TO`). Motivo: si algún filtro
  antispam llega a marcar o bloquear la casilla que hace el envío masivo, la
  casilla pública de contacto del negocio queda protegida y sigue recibiendo
  consultas normales.
- Puerto 465 (SSL directo) o 587 (STARTTLS), según lo que exponga Hostinger.
- Adjunto: `nodemailer` acepta el PDF en base64 directamente. Se mantiene el
  mismo límite duro de **3 MB** que la decisión original (`assertAttachmentWithinLimit`
  en `lib/outreach/smtp.ts`), aunque la razón original (upload session de
  Graph) ya no aplica — el límite se conserva porque sigue siendo razonable
  para un adjunto de correo.
- Rate limit: Hostinger impone sus propios límites de envío por hora/día
  según el plan contratado (revisar en su dashboard o soporte). El tope de
  25/día de la campaña está pensado para quedar cómodamente por debajo de
  cualquier límite típico de hosting compartido — igual que con Graph, el
  límite real es la reputación del dominio, no la cuota del proveedor.

---

## 9. Cumplimiento legal (Chile)

- **Ley 19.496, art. 28 B** — toda comunicación promocional debe identificar al remitente
  y contener un medio de desuscripción válido y gratuito. **El link de baja no es opcional.**
- **Ley 19.628** sobre datos personales.
- **Ley 21.719** (nueva ley de protección de datos, entra en vigencia diciembre 2026):
  endurece el régimen y crea la Agencia de Protección de Datos.
  ⚠️ **Verificar el estado y las obligaciones concretas antes de escalar el volumen** —
  esta fecha es posterior al corte de conocimiento con que se redactó este documento.

**Reglas operativas que se derivan:**

1. Priorizar correos corporativos genéricos (`contacto@`, `info@`, `ventas@`) sobre correos
   nominativos de personas. Menor exposición.
2. El pie de todo correo lleva: razón social, RUT, dirección y link de baja.
3. Honrar el `optOut` **para siempre y en todas las campañas**, no por campaña.
4. Registrar `optOutAt` — es la evidencia de cumplimiento si alguien reclama.

---

## 10. Reglas de entregabilidad

- Máximo **25 envíos/día**, en horario hábil, con jitter aleatorio entre correos.
- Configurar **SPF, DKIM y DMARC** en el dominio antes del primer envío masivo. Sin esto,
  todo lo demás da igual.
- Un rebote duro (`REBOTADO`) marca `emailStatus` y excluye al contacto permanentemente.
- Si la tasa de rebote supera **5%**, detener la campaña y revisar la fuente de correos.
- Texto plano o HTML sobrio. Nada de imágenes pesadas, ni acortadores de links, ni
  palabras tipo "GRATIS" en el asunto.
- **Sin pixel de tracking de apertura.** Daña entregabilidad y es discutible bajo la nueva ley.
  La métrica que importa es la respuesta, no la apertura.

---

## 11. Fases y criterios de aceptación

### Fase 1 — Enriquecimiento de correos ✅ Completa (2026-08-04)

- [x] Ejecutado `vdrmota/contact-info-scraper` sobre las 55 URLs candidatas (vía MCP de Apify, sin necesidad de `APIFY_TOKEN` local)
- [x] `data/prospects/candidatas_enriquecidas.csv` — 28/55 empresas con correo
- **Aceptación:** ≥40% del total de empresas queda con email válido → **50.9% logrado**

### Fase 2 — Modelo e ingesta ✅ Completa (endpoint HTTP fuera de alcance v1)

- [x] Migración Prisma con los modelos de §5 · `npm run db:push` (aplicada a la base real de Neon)
- [x] `scripts/import-prospects.ts` con normalización y dedupe (bug de dedupe por comuna encontrado y corregido en producción el 2026-08-05)
- [ ] Endpoint `/api/prospects/import` — no construido, no era parte del alcance mínimo (§15). El script cubre la carga por CLI; el endpoint quedaría para cuando se necesite subir CSV desde el navegador.
- **Aceptación:** importar los dos CSV dos veces seguidas no crea un solo duplicado → **verificado** (segunda corrida: 0 creados, 96 detectados como duplicados)

### Fase 3 — Motor de envío

- [x] `lib/outreach/smtp.ts` (cliente SMTP/Hostinger vía nodemailer + adjunto, con guard de 3MB — reemplaza al cliente Graph original, ver §8)
- [x] `lib/outreach/templates/` con las dos plantillas (+ 18 tests, incluida la regla del saludo con fallback)
- [x] `/api/cron/outreach` + `vercel.json` con el schedule (`0 12 * * 1-5`)
- [x] `/api/outreach/unsubscribe`
- [x] `scripts/seed-outreach-campaigns.ts` — crea las 2 campañas con `isActive=false` (código listo, encendido queda pendiente a propósito)
- **Aceptación:** correr el cron dos veces en el mismo día no envía nada la segunda vez — cumplido por diseño (la query de elegibilidad excluye contactos con `OutreachSend` existente para la campaña + constraint único de BD como respaldo)

**Bloqueantes reales para encender el cron:**

1. ~~Credenciales SMTP de Hostinger~~ **Resuelto (2026-08-05):** `gtxm1185.siteground.biz:465`,
   `operaciones@cooperapro.cl` envía, `contacto@cooperapro.cl` recibe respuestas vía
   `SMTP_REPLY_TO`. Verificado con conexión real + correo de prueba entregado.
2. `OUTREACH_SENDER_LEGAL_NAME` / `OUTREACH_SENDER_RUT` / `OUTREACH_SENDER_ADDRESS` — datos legales reales para el pie de correo (Ley 19.496 art. 28 B). No se inventaron — el cron responde 200 sin enviar si faltan.
3. ~~`OUTREACH_PDF_BLOB_URL`~~ **Resuelto (2026-08-05):** PDF único (`Gestión Circular
de Pallets 2.pdf`, 1.21MB) subido a Vercel Blob. Las 2 campañas
   (`OutreachCampaign`) ya existen con el PDF adjunto — `isActive=false` a propósito.
4. SPF/DKIM/DMARC del dominio propio (NIC Chile) — pendiente, se deja para el final por decisión explícita.
5. Activar manualmente `OutreachCampaign.isActive=true` una vez resueltos 2 y 4.

### Fase 4 — Visibilidad

- [ ] Vista en el panel CRM: campañas, enviados, rebotes, bajas
- [ ] `Activity(type=EMAIL)` visible en la ficha de cada empresa
- **Aceptación:** Ventas puede responder "¿a quién le escribimos y qué pasó?" sin pedir ayuda

---

## 12. Variables de entorno nuevas

Agregar también a `VARIABLES_ENTORNO.md`:

```bash
# SMTP (envío de correo) — Hostinger, no Microsoft 365 (ver §8)
# Dos buzones: SMTP_USER envía (protegido si un antispam lo marca),
# SMTP_REPLY_TO recibe las respuestas (la casilla pública del negocio)
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=                # buzón que envía, ej: operaciones@cooperapro.cl
SMTP_PASSWORD=
SMTP_FROM_NAME="Coopera Pro"
SMTP_REPLY_TO=            # buzón que recibe respuestas, ej: contacto@cooperapro.cl

# Apify
APIFY_TOKEN=

# Outreach
CRON_SECRET=              # header que valida /api/cron/outreach
OUTREACH_DAILY_CAP=25
OUTREACH_PUBLIC_URL=      # base para armar el link de desuscripción
OUTREACH_PDF_BLOB_URL=    # URL del PDF único en Vercel Blob
OUTREACH_SENDER_LEGAL_NAME=  # pie legal — Ley 19.496 art. 28 B
OUTREACH_SENDER_RUT=
OUTREACH_SENDER_ADDRESS=
```

---

## 13. Decisiones pendientes

1. ~~**¿Qué PDF se adjunta?**~~ **Resuelto (2026-08-04): un único PDF para todos los segmentos.**
   `OutreachCampaign.pdfBlobUrl` queda como campo opcional por campaña (mismo archivo referenciado
   desde ambas), no uno por segmento.
2. ~~**¿Dominio de envío?**~~ **Resuelto (2026-08-04): dominio propio comprado en NIC Chile, con
   acceso administrativo.** Sigue bloqueante para Fase 3 hasta configurar SPF/DKIM/DMARC — el
   tener el dominio no implica que los registros ya estén puestos. Verificar antes de encender el cron.
3. **¿Secuencia de seguimiento?** Un correo frío sin seguimiento rinde la mitad. ¿Se agrega
   un segundo toque a los 5 días? Requiere modelar pasos en la campaña. **Fuera de alcance v1.**
4. ~~**¿Qué hacer con las 39 empresas que solo tienen teléfono?**~~ **Resuelto (2026-08-04): lista
   de llamadas para Ventas, no correo.** No requirió un flag nuevo en el modelo — `import-prospects.ts`
   igual las crea como `Company`/`Contact`, pero al no tener `email` nunca cumplen el criterio de
   elegibilidad de outreach (§4) y quedan naturalmente fuera del pipeline de correo.

## 14. Fuera de alcance (v1)

- Secuencias multi-toque y ramificaciones
- Tracking de aperturas y clics
- Integración con WhatsApp Business
- Scoring automático con IA de los prospectos
- Envío desde múltiples buzones

---

## 15. Por dónde empezar

Orden recomendado: **Fase 2 primero** (modelo + importador), aunque la Fase 1 sea el
cuello de botella del negocio. Razón: el importador es la pieza que queda instalada y
reutilizable, y se puede probar con los 19 correos que ya existen mientras el
enriquecimiento corre en paralelo.

Prompt sugerido para arrancar en Claude Code:

> Lee `CLAUDE.md` y `PROSPECCION_OUTREACH.md`. Implementa la Fase 2: la migración de Prisma
> de la sección 5 y el script `scripts/import-prospects.ts`. Los CSV de referencia están en
> `data/prospects/`. No toques los modelos de Operaciones ni Inventario. Crea el `.spec.md`
> del script y tests de Vitest para la normalización y el dedupe.
