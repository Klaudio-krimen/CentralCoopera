# `components/ui/CallStatusBadge.tsx` — spec

## Qué es

Badge read-only del `callStatus` (gestión telefónica) de un `Contact`
(`IMPORTACION_RADAR_PALLETS.md` §4). Píldora con punto de color + etiqueta de
texto. Sin interacción.

## De qué se clona

Clon EXACTO de `components/ui/TemperatureBadge.tsx`: mismo
`Record<Enum, { label, className, dot }>`, misma prop `size: "sm" | "md"`, mismo
markup (`<span>` con `rounded-full border` + punto de 1.5×1.5), mismo patrón de
fallback (`CONFIG[valor] ?? CONFIG[<primer valor>]`).

## Props

| Prop         | Tipo                                                                                    |                                                                    |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `callStatus` | `"POR_LLAMAR" \| "LLAMADA" \| "SIN_RESPUESTA" \| "CORREO_CONSEGUIDO" \| string \| null` | valor desconocido o `null` → cae al estilo y label de `POR_LLAMAR` |
| `size`       | `"sm" \| "md"` (default `"md"`)                                                         | `sm` = `px-2 py-0.5 text-[11px]`; `md` = `px-2.5 py-1 text-xs`     |

## Mapeo de tokens (blueprint §7)

| `callStatus`        | Clases                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `POR_LLAMAR`        | `bg-crm-secondary text-crm-muted border-crm-muted/30` · punto `bg-crm-muted`                        |
| `LLAMADA`           | `bg-crm-temp-tibio-bg text-crm-temp-tibio border-crm-temp-tibio/30` · punto `bg-crm-temp-tibio`     |
| `SIN_RESPUESTA`     | `bg-crm-destructive/10 text-crm-destructive border-crm-destructive/30` · punto `bg-crm-destructive` |
| `CORREO_CONSEGUIDO` | `bg-crm-success/10 text-crm-success border-crm-success/30` · punto `bg-crm-success`                 |

Los cinco tokens del mapeo (`crm-secondary`, `crm-muted`, `crm-temp-tibio` +
`-bg`, `crm-destructive`, `crm-success`) **existen tal cual** en
`tailwind.config.ts theme.extend.colors.crm` — no hubo que sustituir ninguno ni
agregar tokens nuevos.

## Qué NO hace

- No es interactivo — para editar el estado se usa
  `components/crm/CallStatusSelect.tsx`.
- No hace fetch ni conoce `contactId`.
- El color nunca es el único portador del dato: siempre se renderiza el `label`.
