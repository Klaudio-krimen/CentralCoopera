# API Route: `/api/evidencias`

**Archivo:** `app/api/evidencias/route.ts`

## POST `/api/evidencias`

- Requiere sesión y acceso a Operaciones.
- Valida `file`, `orderId`, etapa y coordenadas; la política cruza rol, propietario y estado.
- CHOFER solo sube evidencia de su propia orden y en las etapas permitidas.
- Guarda el archivo y crea `Evidence` con timestamp del servidor y coordenadas validadas.
- Falla de forma cerrada ante etapa desconocida, orden ajena o estado no permitido.

## DELETE `/api/evidencias?id=...` o `?path=...`

- Requiere sesión y acceso a Operaciones.
- ADMIN puede borrar; CHOFER solo elimina evidencia de su orden mientras está en `EN_RETIRO`.
- RECEPCION y roles de otros módulos no pueden borrar evidencia.
- Errores de API usan `apiError`; la ruta real es esta colección, no `/api/evidencias/[id]`.
