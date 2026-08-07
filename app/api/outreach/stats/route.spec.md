# `GET /api/outreach/stats` — spec

Fase 4 de `PROSPECCION_OUTREACH.md` §6 y §11. Devuelve enviados, rebotes y
bajas por campaña y en total.

## Auth

Sesión + `hasModuleAccess(session.user, "CRM")` — mismo patrón que el resto
de las rutas de API del CRM (`/api/pipeline`, `/api/discrepancias`, etc.).

## Respuesta

```json
{
  "campaigns": [
    {
      "id": "...",
      "name": "...",
      "segment": "LOGISTICA",
      "isActive": false,
      "dailyCap": 25,
      "subject": "...",
      "pdfBlobUrl": "...",
      "counts": { "EN_COLA": 0, "ENVIADO": 12, "FALLIDO": 1, "REBOTADO": 0 },
      "total": 13
    }
  ],
  "totals": { "EN_COLA": 0, "ENVIADO": 12, "FALLIDO": 1, "REBOTADO": 0 },
  "totalSends": 13,
  "optOuts": 3,
  "recentSends": [
    {
      "id": "...",
      "status": "ENVIADO",
      "sentAt": "...",
      "error": null,
      "campaign": { "name": "...", "segment": "LOGISTICA" },
      "contact": { "name": "...", "email": "..." },
      "company": { "name": "..." }
    }
  ]
}
```

## Decisiones de diseño

- **Lee `OutreachSend` directamente, no `Activity`.** `Activity` y
  `OutreachSend` están desacopladas a propósito (§3 del documento maestro:
  "`Activity` es la línea de tiempo que lee un humano... `OutreachSend` es el
  libro contable técnico"). No hay FK entre ambas, así que las estadísticas
  de envío se calculan desde `OutreachSend`.
- **`optOuts` es un conteo global,** no por campaña — coherente con la regla
  operativa de §9 ("honrar el optOut para siempre y en todas las
  campañas"), `Contact.optOut` no tiene ámbito por campaña.
- **`recentSends` limitado a 50** — es una vista de "qué pasó últimamente",
  no un export completo. Si Ventas necesita el historial completo, es un
  endpoint aparte (fuera de alcance de Fase 4).
- **Solo lectura.** No expone forma de activar/pausar campañas — eso
  requeriría `/api/outreach/campaigns` (PATCH), documentado en §6 pero no
  construido; activar una campaña sigue siendo una acción manual sobre la
  BD, deliberada, hasta que se resuelvan los bloqueantes de Fase 3.
