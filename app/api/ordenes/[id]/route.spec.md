# API Route: `/api/ordenes/[id]`

**Archivo:** `app/api/ordenes/[id]/route.ts`

## GET

- Requiere acceso al módulo Operaciones; CHOFER solo consulta órdenes propias.
- Retorna 404 para una orden inexistente y 403 para acceso denegado.
- Incluye empresa, conductor, materiales, evidencias y discrepancia necesarias para la vista.

## PATCH

- Requiere sesión y permiso para la acción concreta según rol, propietario y estado.
- CHOFER propietario puede editar materiales, firmar y transitar solo durante `EN_RETIRO`.
- RECEPCION/ADMIN puede registrar recepción; `receivedItems` debe cubrir una vez cada material,
  con cantidades numéricas no negativas antes de calcular discrepancia.
- Transición CHOFER permitida: `EN_RETIRO` → `EN_TRANSITO`; otros estados y acciones se limitan
  por la política pura en `lib/operations/authorization.ts`.
- Firma valida formato PNG base64 y tamaño máximo; latitud/longitud se validan por rango.
- Timestamps y códigos se asignan en servidor. Los cambios de varias tablas usan transacción.
- Cada error de API pasa por `apiError` y no retorna credenciales ni campos cifrados.
