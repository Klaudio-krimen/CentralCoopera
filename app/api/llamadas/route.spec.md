# `/api/llamadas` — spec

Épica `02-envio-llamadas` de `blueprints/importacion-radar-pallets/` (E2-T4).
Endpoint del CRM para la vista de lista de llamadas: lee los contactos con
teléfono y mueve su `callStatus` (gestión telefónica).

## Qué hace

- **GET** `/api/llamadas?callStatus=&q=` → `Contact[]` con teléfono
  (`phone != null`), ordenados por nombre de empresa. Cada uno con
  `{ id, name, phone, email, callStatus, company: { id, name, segment } }`.
  - `callStatus` (opcional): filtra a ese estado. Si viene y no está en
    `CALL_STATUSES` → `400 { error: "Estado de gestión telefónica inválido" }`.
  - `q` (opcional): `contains` insensible sobre nombre de contacto **o** nombre
    de empresa.
- **PATCH** `/api/llamadas` con `{ id, callStatus }` → el `Contact` actualizado.
  - `id` faltante → `400 { error: "id requerido" }`.
  - `callStatus` presente, no `null`, y fuera de `CALL_STATUSES` → `400
{ error: "Estado de gestión telefónica inválido" }`, sin escribir.
  - `id` inexistente → `404 { error: "Contacto no encontrado" }`.
  - Update **parcial**: sólo `callStatus` (spread condicional). Ningún otro
    campo se toca.

`CALL_STATUSES = ["POR_LLAMAR", "LLAMADA", "SIN_RESPUESTA", "CORREO_CONSEGUIDO"]`
— validación de enum a mano con `.includes()`; `zod` está acotado a
`app/api/finanzas/*`.

## Auth

Prólogo idéntico en GET y PATCH, dentro del handler (el CRM **no** gatea en
middleware — eso es sólo `/api/finanzas`):

```ts
const session = await getServerSession(authOptions);
if (!session) return apiError("No autorizado", 401);
if (!hasModuleAccess(session.user, "CRM"))
  return apiError("Acceso denegado", 403);
```

"VENTAS o ADMIN" = `hasModuleAccess(session.user, "CRM")` (ADMIN pasa por el
bypass de esa función), nunca `session.user.role === "VENTAS"`. Las respuestas
de error son JSON `{ error }` + status — **nunca** `NextResponse.redirect`: un
`fetch` que recibe un redirect a `/login` obtiene HTML y el bug aparece como
error de parseo.

## Qué NO hace

- No escribe `Activity`. El `callStatus` es un estado, como
  `ContactTemperature` — no una línea de tiempo. `Activity(type: "EMAIL")` la
  sigue escribiendo sólo el cron.
- No toca `temperature`, `score`, `notes` ni ningún otro campo del `Contact`.
- No crea ni desactiva contactos.
- No acepta fechas del cliente (timestamps del servidor).
- No pagina — el volumen de contactos con teléfono es chico (lista de llamadas
  de Ventas); el filtrado fino vive en el cliente (`ListaLlamadas`).
