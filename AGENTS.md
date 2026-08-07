# TrackResiduos — instrucciones para agentes

Intranet de Coopera Pro (Santiago, Chile): Operaciones, Inventario, CRM y **Finanzas**.
Next.js 14 (App Router) · TypeScript 5 · Prisma 5 sobre PostgreSQL · NextAuth v4 · Tailwind 3 ·
Vitest · desplegado en Vercel.

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
