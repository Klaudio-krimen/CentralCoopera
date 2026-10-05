# TrackResiduos — instrucciones para agentes

Intranet de Coopera Pro (Santiago, Chile): Operaciones, Inventario, CRM y **Finanzas**.
Next.js 15 (App Router) · TypeScript 5 · Prisma 5 sobre PostgreSQL · NextAuth v4 · Tailwind 4 ·
Vitest · desplegado en Vercel.

## Coordinación entre Codex y Claude

Antes de iniciar trabajo, leer [REGISTRO_TRABAJO.md](./REGISTRO_TRABAJO.md).
Registrar allí la tarea, responsable, estado, archivos previstos y rama antes de editar;
al cerrar, anotar cambios, decisiones, verificaciones y referencia de commit/PR o publicación pendiente.
Respetar las tareas y modificaciones del otro agente. El protocolo completo vive en ese documento.
Las reglas técnicas y de seguridad siguen teniendo su fuente de verdad en `CLAUDE.md`.

## Comandos

| Tarea              | Comando                                      |
| ------------------ | -------------------------------------------- |
| Dev                | `npm run dev`                                |
| Typecheck          | `npm run typecheck`                          |
| Tests (todo)       | `npm run test`                               |
| Test de un archivo | `npx vitest run lib/finanzas/crypto.test.ts` |
| Build              | `npm run build`                              |
| Esquema a la BD    | `npm run db:push` — exige respaldo previo    |
| Inspeccionar la BD | `npm run db:studio`                          |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de dar
por terminada cualquier tarea.

El CLI de Prisma **no** lee `.env.local`. Antes de cualquier comando `prisma`, en el mismo shell:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

## No negociable

1. Validar en el servidor. La validación de cliente es UX, no seguridad.
2. Timestamps del servidor, nunca del cliente.
3. Nunca retornar `User.password` ni `Employee.bankAccountEnc` en una respuesta de API.
4. `prisma.$transaction` cuando se tocan varias tablas.
5. Errores de API siempre vía `apiError()` de `lib/utils.ts`.
6. **Finanzas: nunca uses `hasModuleAccess()`** — tiene bypass de ADMIN. Usa `hasFinanceAccess()` o
   `canWriteFinance()` de `lib/access.ts`.
7. **Finanzas: toda mutación escribe auditoría en la misma transacción**, y todos los montos son
   `Int` en pesos chilenos.
8. Nada de secretos en el repo. Todo a `.env.local`, documentado en `VARIABLES_ENTORNO.md`.
9. Cada componente o ruta nueva lleva su `*.spec.md` al lado.

Arquitectura completa, fronteras, reglas de Finanzas y tokens de diseño: ver `CLAUDE.md` en este
mismo directorio, que es la fuente de verdad.
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

| Tarea                      | Comando                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| Typecheck                  | `npm run typecheck`                                                      |
| Tests                      | `npm run test` · un archivo: `npx vitest run lib/outreach/radar.test.ts` |
| Build                      | `npm run build`                                                          |
| Esquema a la BD            | `npm run db:push` (respaldo `pg_dump` verificado antes)                  |
| Importar el Radar (manual) | `npm run import:radar -- --dry-run` → revisar → `npm run import:radar`   |

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
