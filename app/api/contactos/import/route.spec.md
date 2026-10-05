# API Route: importación de contactos CRM

**Archivo:** `app/api/contactos/import/route.ts`

- POST requiere sesión y acceso CRM validado en el handler.
- Valida el cuerpo, cada fila y un máximo de 500 registros por solicitud.
- Ignora placeholders, normaliza valores permitidos y crea empresas faltantes dentro de la transacción
  que crea cada contacto.
- Mantiene los errores por fila genéricos; no expone mensajes ni detalles internos de Prisma.
- Errores globales de API se expresan mediante `apiError`.
