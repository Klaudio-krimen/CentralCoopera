# `components/crm/ListaLlamadas.tsx` — spec

## Qué es

Tabla cliente de `/admin/crm/llamadas` (E2-T6). Recibe de la page (server
component) los contactos con teléfono ya materializados; acá sólo se filtra en
memoria y se edita el `callStatus` in-line con `CallStatusSelect`.

## Props

| Prop   | Tipo                |                                       |
| ------ | ------------------- | ------------------------------------- |
| `data` | `LlamadaContacto[]` | un elemento por contacto con teléfono |

## Comportamiento

1. **Búsqueda** por nombre de contacto o de empresa (insensible a mayúsculas).
   El input lleva `aria-label`: el placeholder no es una etiqueta.
2. **Filtro por estado**: grupo de botones (`role="group"`) con `aria-pressed`
   en el activo; "Todos" quita el filtro.
3. **Navegación a la ficha**: el nombre de la empresa es un `<Link>` real a
   `/admin/crm/clientes/[id]` (foco por teclado, clic medio, abrir en otra
   pestaña). El click en el resto de la fila sigue navegando con
   `router.push` como atajo para el mouse; el enlace y el selector hacen
   `stopPropagation` para no disparar un segundo push.
4. **Estados**: sin datos → tarjeta vacía con ícono; filtro sin resultados →
   fila "Ningún contacto coincide con el filtro."

## Qué NO hace

- No pagina ni consulta: la page decide qué contactos llegan.
- No escribe `Activity`; el estado lo edita `CallStatusSelect` vía
  `PATCH /api/llamadas`.
- Sólo tokens `crm-*` y primitivos de `components/crm/ui/*`.
