# Configuración del webhook de leads

**Archivo:** `components/crm/WebhookSettings.tsx`

- Carga y actualiza el estado del webhook usando `/api/configuracion/webhook`.
- Presenta el endpoint sin credenciales y comunica que el secreto se envía mediante `x-webhook-secret`.
- Permite copiar endpoint y secreto con controles separados.
- Solicita confirmación antes de rotar el secreto y advierte que la integración deberá actualizarse.
- Solo presenta el secreto recibido durante una rotación; no lo guarda en URL ni almacenamiento persistente.
- Expone errores al usuario sin detalles de respuesta internos.
