# `/admin/crm/outreach` — spec

Fase 4 de `PROSPECCION_OUTREACH.md` §11 — mitad "vista en el panel CRM: campañas,
enviados, rebotes, bajas" de los dos entregables de esa fase. La otra mitad
(`Activity(type=EMAIL)` visible en la ficha de la empresa) ya existía antes de
esta fase — `app/(admin)/admin/crm/clientes/[id]/page.tsx` ya renderiza
cualquier `Activity`, `EMAIL` incluido, sin cambios necesarios.

## Qué muestra

1. Tarjetas de totales: envíos totales + desglose por estado (en cola,
   enviado, fallido, rebotado).
2. Una tarjeta por campaña con su estado (activa/inactiva), segmento, tope
   diario y su propio desglose de conteos.
3. Tabla de los últimos 50 envíos — empresa, contacto, campaña, estado,
   fecha, y el mensaje de error si falló. Esto es lo que responde
   directamente el criterio de aceptación de la fase: "¿a quién le
   escribimos y qué pasó?".

## Decisiones de diseño

- **Consulta Prisma directo en el Server Component,** no llama a
  `/api/outreach/stats` internamente — mismo patrón que
  `clientes/page.tsx`, `actividades/page.tsx`, etc. (ningún page.tsx del
  CRM llama a su propia API route; cada uno tiene su `getX()` local). La
  API route existe igual porque el documento maestro la especifica en §6
  como endpoint independiente, no porque esta página la necesite.
- **Sin acciones de gestión.** No hay botón para activar/pausar una
  campaña — es deliberado, Fase 4 es "Visibilidad", no "Gestión". Activar
  una campaña sigue siendo un cambio manual en la BD hasta que se
  resuelvan los bloqueantes de Fase 3 (pie legal, SPF/DKIM/DMARC).
- **No chequea `hasModuleAccess` en la página** — mismo patrón que el
  resto de páginas del CRM (la gating real pasa por el layout de
  `(admin)` + que el ítem de nav no aparece si el usuario no tiene acceso
  a CRM). La API route sí valida el acceso, por si se usa desde otro
  lado.
