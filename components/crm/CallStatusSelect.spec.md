# `components/crm/CallStatusSelect.tsx` — spec

## Qué es

Editor in-line del `callStatus` (gestión telefónica) de un `Contact`. Un
`<Select>` de 4 opciones que, al cambiar, hace `PATCH /api/llamadas` y refresca
la vista. Vive dentro de un `<TableCell>` de `ListaLlamadas` (E2-T6).

## De qué se clona

Patrón de `components/crm/CompletarActividadButton.tsx`: `'use client'` +
`useState(loading)` + `useRouter()` + `fetch` con `if (!res.ok) throw` + `toast`
de `sonner` + `router.refresh()`. Diferencia clave: `.finally(() =>
setLoading(false))` — un `catch` sin `finally` deja el control colgado en
`loading` para siempre tras un error de red (pitfall del epic).

Envuelve el primitivo `@/components/crm/ui/select` (`SelectTrigger size="sm"`,
que portaliza su content con `z-50` y por eso cabe en una celda sin romper el
overflow de la tabla).

## Props

| Prop        | Tipo             |                                                               |
| ----------- | ---------------- | ------------------------------------------------------------- |
| `contactId` | `string`         | va en el body del PATCH                                       |
| `value`     | `string \| null` | `callStatus` actual; `null` → el trigger muestra "Sin estado" |

## Comportamiento

1. `onValueChange(v)`: si `v` es vacío o igual al `value` actual, no hace nada.
2. `setLoading(true)` → `fetch("/api/llamadas", { method: "PATCH", headers:
{ "Content-Type": "application/json" }, body: { id: contactId, callStatus:
v } })`.
3. `res.ok` → `toast.success("Estado actualizado")` + `router.refresh()` (la
   página server-component vuelve a consultar y re-renderiza con el estado
   nuevo).
4. Error (red o `!res.ok`) → `toast.error("No se pudo actualizar el estado")`.
5. `finally` → `setLoading(false)`.
6. Mientras `loading`, el componente renderiza `<SpinnerGap className="animate-spin
text-crm-muted" />` en lugar del `<Select>`.

## Qué NO hace

- No escribe `Activity` — eso lo decide el endpoint (y el endpoint tampoco lo
  hace: el `callStatus` es un estado, no una línea de tiempo).
- No valida el valor contra el enum en el cliente: las 4 opciones vienen de un
  array `const`, y el endpoint revalida contra `CALL_STATUSES`.
- No hace optimistic update: espera la respuesta y refresca desde el servidor.
- Sólo tokens `crm-*` (el spinner usa `text-crm-muted`, no `text-zinc-*`).
