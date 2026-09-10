# `/admin/crm/llamadas` — spec

Épica `02-envio-llamadas` de `blueprints/importacion-radar-pallets/` (E2-T6).
Vista del CRM para gestionar las llamadas a los prospectos "teléfono sin correo"
(los que el importador del Radar dejó en `callStatus: "POR_LLAMAR"`, más
cualquier contacto con teléfono).

## Estructura

- **`page.tsx`** — server component. `getLlamadas()` llama `prisma.contact.findMany`
  DIRECTO (`where: { phone: { not: null } }`, `include` la empresa `{ id, name,
segment }`, `orderBy` por nombre de empresa). Header estándar del CRM
  (`animate-fade-up`, `<h1 text-2xl font-bold tracking-tight text-crm-foreground>`
  - `<p text-crm-muted text-sm mt-1>` con el conteo por estado). Pasa la data a
    `<ListaLlamadas>`. **No** consulta `/api/llamadas` — esa ruta es para las
    mutaciones y el filtro del cliente.
- **`components/crm/ListaLlamadas.tsx`** — `'use client'`. `useState(search)`,
  `useState(callStatusFilter)`, `useMemo` para filtrar en memoria. Filtros =
  `<Button size="sm" variant={activo ? "default" : "outline"}>` (botones
  segmentados reales, no `<select>` nativo). Tabla con
  `@/components/crm/ui/table`: una fila por contacto — empresa · contacto ·
  teléfono · `<CallStatusSelect contactId value={callStatus} />` in-line en un
  `<TableCell>`.

## Interacción

- Cambiar el `<CallStatusSelect>` → `PATCH /api/llamadas` → `router.refresh()`
  (la page vuelve a consultar y re-renderiza con el estado nuevo).
- Click en una fila **fuera del `<Select>`** → `router.push("/admin/crm/clientes/"
  - company.id)`. El `<TableCell>`del select hace`e.stopPropagation()` para no
    disparar esa navegación.
- Filtro por estado (`Todos` / los 4 `CallStatus`) + búsqueda por nombre de
  contacto o de empresa, ambos en cliente sobre la data ya cargada.

## Estados

- **Sin contactos con teléfono** → empty state `<div className="crm-card
text-center py-16">` con ícono `PhoneCall` y "No hay contactos con teléfono para
  llamar." — nunca una tabla vacía sin encabezado.
- **Filtro sin coincidencias** → una fila de tabla con "Ningún contacto coincide
  con el filtro." (la tabla y su encabezado siguen visibles).

## Nav

`components/ui/AdminSidebar.tsx`: ítem `{ href: "/admin/crm/llamadas", label:
"Llamadas", icon: PhoneCall }` en el array `nav` del `ModuleDef` `key: "crm"`,
entre `Outreach` y `Configuración`. `middleware.ts` **no** se toca — la rama
`else if (pathname.startsWith("/admin/crm"))` ya cubre la subruta.

## Qué NO hace

- No escribe `Activity` (el `callStatus` es un estado, como `ContactTemperature`).
- No pagina en el navegador — el volumen es la lista de llamadas de Ventas.
- No crea ni borra contactos; sólo mueve el `callStatus` vía el endpoint.
- No usa `.card` / `.btn-primary` / `.input-base` (paleta de Operaciones) — sólo
  `crm-*` y los primitivos de `components/crm/ui/*`.
