---
target: CRM module (app/(admin)/admin/crm)
total_score: 23
p0_count: 2
p1_count: 2
timestamp: 2026-07-30T05-18-25Z
slug: app-admin-admin-crm
---
# Crítica de diseño — Módulo CRM (Central Coopera)

**Metodología**: revisión basada en lectura de código fuente (JSX/TSX + clases Tailwind), sin inspección visual en navegador en vivo — no hay credenciales de prueba disponibles para autenticar contra producción, y entrar contraseñas está fuera de alcance. Assessment A (revisión de diseño) se delegó a un sub-agente independiente que no vio este código antes ni conoce cómo se construyó, para evitar mi propio sesgo de haberlo escrito. Assessment B (detector determinístico) corrió por separado. Ambos se sintetizan aquí.

## Design Health Score

| # | Heurística | Score | Hallazgo clave |
|---|-----------|-------|-----------------|
| 1 | Visibilidad del estado del sistema | 3/4 | Toasts confirman la mayoría de acciones, pero el drag del Kanban no muestra estado "en curso" mientras espera el PATCH |
| 2 | Coincidencia con el mundo real | 4/4 | Dominio chileno correcto en todo: etapas de pipeline, CLP vía `Intl.NumberFormat('es-CL')`, español natural |
| 3 | Control y libertad del usuario | 1/4 | Sin undo para desactivar contacto ni para mover una etapa en el Kanban |
| 4 | Consistencia y estándares | 1/4 | Los 3 modales más usados (Contacto/Deal/Actividad) siguen en emerald (`.btn-primary`/`.input-base`) en un módulo cuyo acento es azul |
| 5 | Prevención de errores | 2/4 | Nada previene un drag accidental a "Cerrado perdido" o un click accidental de desactivar |
| 6 | Reconocimiento antes que recuerdo | 3/4 | Chips de filtro en Contactos ayudan; Deals y Actividades no tienen buscador |
| 7 | Flexibilidad y eficiencia | 1/4 | Cero atajos de teclado, cero acciones masivas (ni siquiera selección múltiple en la tabla) |
| 8 | Diseño estético y minimalista | 3/4 | Restringido en general; los 4 colores pastel de KPICards son decorativos sin razón semántica |
| 9 | Ayuda a reconocer/recuperar errores | 2/4 | El error del Kanban al fallar un drag no dice por qué ni cómo reintentar |
| 10 | Ayuda y documentación | 3/4 | Buena ayuda contextual justo donde se necesita (WebhookSettings, plantilla CSV) |
| **Total** | | **23/40** | **Aceptable — se necesitan mejoras significativas antes de que los usuarios estén cómodos** |

## Veredicto anti-patrones

**LLM (Assessment A)**: No es un dashboard genérico de IA — sin gradient text, sin glassmorphism decorativo, sin cards side-stripe, KPIs son solo 4 tarjetas planas. El patrón `.crm-card` evita realmente el anidamiento de cards. Pero cae en el cliché de "hero-metric-card con color pastel distinto por tarjeta" en KPICards, y tiene una fractura real de sistema de diseño: los 3 componentes interactivos más usados (modales de Contacto/Deal/Actividad) nunca se re-skinearon al azul del CRM — alguien acostumbrado a Linear/Stripe lo notaría en el primer click de "Nuevo Contacto".

**Detector determinístico**: 4 hallazgos, los 4 falsos positivos — confirmados a mano contra el código real:
- 3× `bg-black/30 backdrop-blur-sm` (scrims de modal en ContactoModal.tsx:95, DealModal.tsx:113, ActividadModal.tsx:82) — el detector no interpreta el modificador de opacidad `/30`; es un patrón de overlay semitransparente estándar, no un fondo negro puro.
- 1× en ContactoActions.tsx:75 — un ternario `isActive ? 'text-zinc-600 hover:bg-zinc-50' : 'text-emerald-600 hover:bg-emerald-50'` que el detector leyó como zinc-600 sobre emerald-50, pero cada rama es internamente consistente y nunca se cruzan.
- Sin overlay visual en navegador (no aplica — no hay sesión autenticada disponible para inyectar el detector en vivo).

## Impresión general

El módulo tiene una base de diseño sólida y disciplinada (números en mono, moneda CLP correcta, empty states útiles, opt-in de notificaciones respetuoso) pero **no terminó de migrarse a sí mismo**: los 3 formularios que Ventas usa constantemente para crear/editar registros se quedaron en la paleta emerald del resto de la app, no dan ninguna confirmación de éxito, y la sección "Clientes" (2 de 7 ítems del nav) nunca se tocó en el rediseño visual. La mayor oportunidad no es agregar nada nuevo — es terminar de aplicar el propio sistema de diseño que el módulo ya define.

## Qué funciona bien

1. **Disciplina numérica real, no solo declarada**: cada valor monetario/porcentaje/score usa `font-mono tabular-nums` de forma consistente, y `lib/utils.ts` usa correctamente `Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP'})` — el único principio de diseño declarado que de verdad se cumple en todas partes, no solo en las tarjetas destacadas.
2. **El opt-in de notificaciones push es inusualmente respetuoso**: nunca pide permiso sin que el usuario lo pida explícitamente, tiene fallback limpio si el navegador no soporta, y da instrucciones concretas si el permiso fue denegado — evita el anti-patrón clásico de "pedir notificaciones al cargar la página".
3. **Los empty states dicen qué hacer, no solo que no hay datos**: "Sin deals todavía / Crea un deal desde la ficha de un cliente en Clientes" es específico y accionable.

## Problemas prioritarios

**[P0] Los 3 modales principales (Contacto/Deal/Actividad) siguen con la paleta emerald, no la azul del CRM**
- **Por qué importa**: es la interacción más frecuente del módulo (crear/editar registros) y contradice el principio de diseño ya declarado ("CRM = acento azul"). El usuario ve un botón azul abrir un formulario con botón "Guardar" verde.
- **Fix**: cambiar `.btn-primary`/`.input-base` por `.crm-btn-primary`/`.crm-input` en `ContactoModal.tsx:236`, `DealModal.tsx:215`, `ActividadModal.tsx:156`.
- **Comando sugerido**: `/impeccable polish`

**[P0] Crear o editar un Contacto/Deal/Actividad no da ninguna confirmación de éxito**
- **Por qué importa**: ninguno de los 3 modales importa `toast` de sonner — el modal solo se cierra y refresca. Es exactamente la tarea que se usó para trazar el "emotional journey" de esta revisión (registrar una llamada de seguimiento) y termina en silencio, mientras que cada otro componente del módulo (ClassifyAllButton, WebhookSettings, NotificationsToggle, CompletarActividadButton, ImportContactsButton) sí confirma con toast.
- **Fix**: agregar `toast.success('Contacto creado')` / `'Deal creado'` / `'Actividad registrada'` (y sus variantes de edición) tras cada submit exitoso.
- **Comando sugerido**: `/impeccable polish`

**[P1] El Kanban del Pipeline es solo-mouse y las tarjetas no llevan al detalle del deal**
- **Por qué importa**: `KanbanBoard.tsx` solo registra `PointerSensor` (sin `KeyboardSensor`) — un usuario de teclado no puede mover un deal de etapa. `DealCard.tsx` no tiene ningún `<Link>`/`onClick`/`href` — ni siquiera con mouse se puede abrir el detalle de un deal desde el Kanban, hay que ir a buscarlo en la tabla de Deals.
- **Fix**: agregar `KeyboardSensor` + un selector visible de etapa por tarjeta como alternativa, y convertir el título de la tarjeta en link a `/admin/crm/deals/[id]`.
- **Comando sugerido**: `/impeccable adapt`

**[P1] Desactivar un contacto no pide confirmación ni da feedback de éxito/error**
- **Por qué importa**: `ContactoActions.tsx` dispara el PATCH al primer click, sin `confirm()` (a diferencia de WebhookSettings, que sí usa `confirm()` para su acción análoga de regenerar secreto) y sin `try/catch` — si la request falla, la UI vuelve a la normalidad sin ningún mensaje, dando falsa confianza de que la desactivación funcionó.
- **Fix**: agregar confirmación + `toast.success`/`toast.error` siguiendo el mismo patrón ya usado en componentes hermanos del mismo archivo.
- **Comando sugerido**: `/impeccable harden`

**[P2] "Clientes" (2 de 7 secciones del nav) nunca se migró a la paleta del CRM**
- **Por qué importa**: `clientes/page.tsx` y `clientes/[id]/page.tsx` usan `text-zinc-900`, `.card`, `.panel`, `text-emerald-700` — cero tokens `crm-*`, mientras las otras 6 secciones sí están migradas. Al hacer click en "Clientes" (resaltado en azul activo en el sidebar) se aterriza en una página que visualmente parece otra app.
- **Fix**: migrar a los tokens `crm-*`, o documentar explícitamente que es una decisión deliberada si Clientes debe seguir siendo una vista cross-módulo.
- **Comando sugerido**: `/impeccable document` (para decidir y registrar la intención) seguido de `/impeccable polish`

## Persona red flags

**Alex (usuario experto, quiere velocidad y atajos)**:
- Cero atajos de teclado en todo el módulo.
- `ContactsTable.tsx` no tiene selección múltiple ni acciones masivas — para registrar seguimiento a 5 leads calientes hay que abrir cada uno por separado; `ClassifyAllButton` es la única acción "masiva" y es todo-o-nada sobre toda la base.
- La tarjeta "Leads Calientes" en KPICards es un `<div>` sin `onClick`/`Link` — el instinto de hacer click en el número para filtrar no lleva a ningún lado.
- Ningún modal usa `autoFocus` en el primer campo — cada "Nuevo X" requiere un click extra antes de poder escribir.
- `DealsTable.tsx` y Actividades no tienen buscador, a diferencia de Contactos — inconsistencia que frena justo en las páginas de deals/seguimientos.

**Sam (lector de pantalla, solo teclado, necesita contraste ≥4.5:1)**:
- Las tarjetas del Kanban son enfocables por teclado (por los atributos que expone `useSortable`) pero Enter/Espacio no hacen nada — un control que parece interactivo pero está funcionalmente muerto para teclado.
- Las filas de `ContactsTable.tsx` y `DealsTable.tsx` usan `<tr onClick>` sin `role`, `tabIndex` ni `onKeyDown` — no hay forma de abrir un registro solo con teclado desde ninguna tabla.
- `TemperatureBadge.tsx`, variante "Frío": texto `#64748b` sobre fondo `#f1f5f9` en 11px — contraste calculado en **~4.34:1**, por debajo del mínimo AA de 4.5:1, en el único dato (temperatura) que esa tabla existe para mostrar.
- Desactivar un contacto no anuncia el cambio de estado a un lector de pantalla (sin toast, sin live region).

## Observaciones menores

- `ContactQuickActions.tsx` mezcla clases zinc/emerald con tokens `crm-*` en el mismo componente pequeño — un eco a menor escala del P0 de mezcla de paletas.
- `PipelineStagesList.tsx` vive bajo el título "Etapas del Pipeline" en Configuración pero es completamente de solo lectura — la página promete configuración pero solo entrega una lista estática.
- `AdminSidebar.tsx` hardcodea `bg-blue-50`/`text-blue-700` para el resaltado activo del CRM en vez de referenciar los tokens `crm-*` de `tailwind.config.ts` — visualmente calza hoy pero no está conectado a la misma fuente de verdad.
- La composición del Dashboard (2/3 gráfico + 1/3 actividad reciente) es un layout genuinamente restringido, evita la "pared de gráficos decorativos".

## Preguntas para considerar

- ¿Fue "Clientes" dejado fuera del rediseño a propósito (por seguir siendo una vista cross-módulo) o fue un olvido? Vale la pena decidirlo explícitamente antes de migrarlo.
- ¿Vale la pena que Ventas pueda operar el Kanban completo desde el teclado, o es una herramienta que en la práctica siempre se usa con mouse/touch?
- Si "Cerrado ganado" no tiene ningún momento de refuerzo positivo hoy, ¿es una omisión o una decisión deliberada de mantener el tono "preciso, sin fricción" sin celebraciones?
