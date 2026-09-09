<!-- RADAR-PALLETS:INICIO -->
<!--
  Se ANEXA al AGENTS.md del repo, no lo reemplaza. El Bootstrap lo agrega sólo si el marcador no
  está. Fuente de verdad completa: CLAUDE.md (sección 10) y blueprints/importacion-radar-pallets/.
-->

## Cambio activo: Importación Radar de Clientes Pallets + segmento INDUSTRIA

Incorpora ~127 prospectos de un Excel (3 hojas → CSV) al CRM, habilita el segmento `INDUSTRIA` con
campaña y plantilla, agrega un estado de gestión telefónica en `Contact` con su vista de lista de
llamadas, y cambia el tope de outreach de por-campaña a global. 12 pasos en
`blueprints/importacion-radar-pallets/tasks.json`.

### Comandos

| Tarea | Comando |
|---|---|
| Typecheck | `npm run typecheck` |
| Tests | `npm run test` · un archivo: `npx vitest run lib/outreach/radar.test.ts` |
| Build | `npm run build` |
| Esquema a la BD | `npm run db:push` (respaldo `pg_dump` verificado antes) |
| Importar el Radar (manual) | `npm run import:radar -- --dry-run` → revisar → `npm run import:radar` |

**Portón:** `npm run typecheck && npm run test && npm run build`. `next lint` no es compuerta.
El CLI de Prisma no lee `.env.local` → `export DATABASE_URL`/`DIRECT_URL` en el mismo shell.

### Las 5 reglas que más muerden

1. `lib/outreach/radar.ts` y `lib/outreach/eligibility.ts` son **puros**: sin Prisma/fs en runtime,
   imports **relativos** (nunca `@/`), datos por parámetro. Vitest sólo ve `lib/**/*.test.ts`.
2. El importador **rellena campos vacíos, jamás pisa**. Correo entrante distinto → `Contact` nuevo.
3. `enum ProspectSegment` sólo **gana** valores: `INDUSTRIA` al final, `OTRO` se queda. El `db push`
   que lo agrega NO escribe filas con él.
4. Rutas de API del CRM gatean **en el handler** con `hasModuleAccess(session.user, "CRM")`;
   errores por `apiError` (`{ error }` + status), **nunca** `NextResponse.redirect` en `/api/*`.
5. `middleware.ts` se toca **una vez** (paso 1: agregar `cron` y `outreach/unsubscribe` al
   negative-lookahead) y no se vuelve a tocar.

Reglas completas, dónde vive cada cosa y las trampas: **`CLAUDE.md` sección 10** — es la fuente de
verdad.

<!-- RADAR-PALLETS:FIN -->
