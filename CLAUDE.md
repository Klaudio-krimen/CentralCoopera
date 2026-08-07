# CLAUDE.md — Memoria del proyecto TrackResiduos

> Archivo de contexto persistente para Claude Code / Cowork.
> Se carga automáticamente al abrir el proyecto. Manténlo corto y actualizado.
> Si algo aquí contradice el código, **el código gana** — y este archivo debe corregirse.

---

## 1. Qué es esto

**TrackResiduos** es la app interna de **Coopera Pro** (Santiago, Chile).
Nació para registrar la cadena de custodia de materiales reciclables y prevenir el robo hormiga
en los retiros que hacen los choferes. Hoy tiene tres módulos vivos:

| Módulo                                                              | Rol dueño             | Estado                              |
| ------------------------------------------------------------------- | --------------------- | ----------------------------------- |
| **Operaciones** — órdenes de retiro, evidencias, discrepancias, GPS | `CHOFER`, `RECEPCION` | Productivo                          |
| **Inventario** — stock de materia prima y pallets                   | `BODEGA`              | Productivo                          |
| **CRM** — empresas, contactos, deals, actividades                   | `VENTAS`              | Base implementada, sin datos reales |

El negocio tiene además un **taller de pallets** que necesita clientes.
De ahí nace la iniciativa activa (ver §6).

---

## 2. Stack

- **Next.js 14** (App Router) + **TypeScript 5**
- **Prisma 5** sobre **PostgreSQL** (`DATABASE_URL` + `DIRECT_URL` → pooler/directa)
- **NextAuth v4** (credenciales + bcrypt), protección por `middleware.ts`
- **Tailwind 3** + `@base-ui/react` + Phosphor/Lucide + Framer Motion
- **Vercel Blob** para imágenes (firmas, evidencias) · **Leaflet** para mapas · **Recharts** para gráficos
- Deploy en **Vercel** · Tests con **Vitest** · Husky + lint-staged en commit

## 3. Comandos

```bash
npm run dev          # desarrollo
npm run build        # prisma generate && next build
npm run typecheck    # tsc --noEmit  ← correr SIEMPRE antes de dar algo por terminado
npm run test         # vitest run
npm run db:push      # aplicar schema.prisma a la BD
npm run db:seed      # sembrar datos base
npm run db:studio    # inspeccionar la BD
```

## 4. Convenciones del repo

- Documentación en **español**, en `MAYUSCULAS.md` en la raíz.
- Cada componente/ruta relevante lleva su `*.spec.md` al lado describiendo qué debe hacer.
  **Si creas un componente nuevo, crea su spec.**
- Permisos: el rol (`UserRole`) define quién eres; `ModuleAccess[]` define qué módulos ves.
  `ADMIN` ve todo sin depender de la lista. No inventes roles nuevos para combinaciones —
  usa `moduleAccess`.
- Errores de API: siempre vía `apiError()` de `lib/utils.ts`. No devolver strings sueltos.

## 5. Reglas duras (no negociables)

1. **Validar en el servidor.** La validación de cliente es UX, no seguridad.
2. **Timestamps del servidor**, nunca del cliente — aplica a fotos, firmas y envíos.
3. **Nunca** retornar `User.password` en una respuesta de API.
4. **Transacciones Prisma** cuando se tocan varias tablas.
5. **Mobile-first** en todo lo que use un chofer en terreno.
6. **Nada de secretos en el repo.** Todo a `.env.local` y documentado en `VARIABLES_ENTORNO.md`.

---

## 6. Iniciativa activa: Prospección y Outreach (taller de pallets)

**Objetivo:** convertir listados scrapeados de empresas (Apify / Google Places) en clientes
del taller de pallets, mediante correo frío segmentado y automatizado desde Outlook.

**Documento maestro → [`PROSPECCION_OUTREACH.md`](./PROSPECCION_OUTREACH.md)**
Léelo completo antes de tocar código de este módulo.

Tres cosas que debes tener claras antes de empezar:

- **El cuello de botella no es enviar, es tener correos.** De 120 empresas scrapeadas, solo
  19 traen email. La Fase 1 es enriquecimiento, no envío.
- **Claude no es el runtime.** Claude construye y supervisa; quien ejecuta es un cron
  (Vercel Cron). No diseñes nada que dependa de una sesión de chat abierta.
- **No se envía por evento, se envía por lote.** Disparar al insertar en la BD = 120 correos
  en un minuto = cuenta bloqueada. Cron diario con tope duro.

---

## 7. Estado y decisiones vigentes

- Módulo CRM: schema completo (`Company`, `Contact`, `Deal`, `PipelineStage`, `Activity`,
  `CrmWebhookConfig`), sin volumen real de datos todavía.
- `ContactSource` ya contempla `SCRAPING`, `IMPORT` y `WEBHOOK` — usar esos, no crear nuevos.
- Envío de correo: **Microsoft Graph API**, no automatización COM local de Outlook.
  Razón: la app corre en Vercel, no en el PC del usuario.
- Idempotencia de envíos: tabla dedicada `OutreachSend` (ver doc maestro), no `Activity`.
  `Activity` es la línea de tiempo que ve el humano; `OutreachSend` es el libro contable técnico.

## 8. Trampas conocidas

- `DIRECT_URL` es obligatoria para migraciones de Prisma; `DATABASE_URL` va por pooler.
  Si una migración cuelga, revisa que no estés usando el pooler.
- Los CSV de Apify vienen con BOM (`utf-8-sig`) y `\r\n`. Normalizar al importar.
- Los CSV usan el literal `"sin dato"` como nulo, no string vacío. Tratarlo como `null`.
- `Company` hoy **no tiene** `website`, `commune` ni identificador externo — se agregan en la
  Fase 2 de la iniciativa activa. Sin eso no hay deduplicación posible.

<!-- FINANZAS:INICIO -->
<!--
  Este archivo NO reemplaza al CLAUDE.md del repo: se ANEXA a él.
  El Bootstrap de blueprints/modulo-finanzas/blueprint.md §10 lo agrega al final del
  CLAUDE.md existente sólo si el marcador de apertura todavía no está presente,
  de modo que re-ejecutar el Bootstrap no duplica la sección.
  Si lo copias a mano: pega este bloque completo al final de CLAUDE.md, nunca encima.
-->

## 9. Módulo Finanzas

Cuarto módulo de TrackResiduos. Sueldos, anticipos, pagos a proveedores y cuadre de ingresos y
egresos. Dos usuarias: Marcela (escritura) y Elizabeth (sólo lectura, ve todo). Los choferes nunca
entran. Diseño completo en `blueprints/modulo-finanzas/blueprint.md`; orden de construcción en
`blueprints/modulo-finanzas/tasks.json`.

### Comandos (los mismos del repo — no hay comandos nuevos)

| Tarea              | Comando                                                  |
| ------------------ | -------------------------------------------------------- |
| Typecheck          | `npm run typecheck`                                      |
| Tests (todo)       | `npm run test`                                           |
| Test de un archivo | `npx vitest run lib/finanzas/crypto.test.ts`             |
| Build              | `npm run build`                                          |
| Esquema a la BD    | `npm run db:push` — exige respaldo previo, ver más abajo |
| Inspeccionar la BD | `npm run db:studio`                                      |

**Portón:** `npm run typecheck && npm run test && npm run build` pasa antes de dar
por terminada cualquier tarea de Finanzas.

**El CLI de Prisma no lee `.env.local`.** Antes de cualquier comando `prisma`, en el mismo shell:

```bash
export DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
export DIRECT_URL="$(grep -m1 '^DIRECT_URL=' .env.local | cut -d= -f2- | tr -d '"')"
```

### Reglas duras de Finanzas

1. **Sin bypass de ADMIN.** Finanzas usa `hasFinanceAccess()` y `canWriteFinance()` de
   `lib/access.ts`. **Nunca** `hasModuleAccess()`, que sí tiene bypass de ADMIN y por eso no sirve
   aquí. `hasModuleAccess()` no se modifica: los otros tres módulos dependen de su comportamiento
   actual.
2. **Toda ruta bajo `app/api/finanzas/` llama a un portero.** `lib/finanzas/routes.test.ts` lo
   verifica mecánicamente en cada `npm run test` y falla nombrando el archivo. No lo desactives: es
   el reemplazo de un test de integración que este repo no puede correr.
3. **Toda mutación escribe auditoría dentro de la misma `prisma.$transaction`.** Usa `withAudit()` o
   `mutarConAuditoria()` de `lib/finanzas/audit.ts`. Una mutación sin auditoría es un defecto, no un
   descuido.
4. **`FinanceAuditLog` es append-only.** No existe ni existirá una ruta que actualice o borre sus
   filas. Si estás por escribir una, para y reporta.
5. **Todos los montos son `Int` en pesos chilenos.** Nunca `Float`, nunca `Decimal`, nunca
   `parseFloat`. El CLP no tiene centavos.
6. **Toda la lógica de seguridad vive en `lib/finanzas/` como funciones puras.** Vitest recoge sólo
   `lib/**/*.test.ts`: lo que no está ahí, nadie lo puede probar en este repo.
7. **`lib/finanzas/*` no importa `@prisma/client` ni `@/lib/db` en tiempo de ejecución.** Recibe el
   cliente o la transacción **por parámetro** y usa `import type` para los tipos. Eso es lo que
   permite testear sin base de datos.
8. **`lib/finanzas/*` usa rutas relativas (`./crypto`), nunca el alias `@/`.** Vitest no lee `paths`
   de `tsconfig.json`. Los archivos bajo `app/` sí usan `@/` porque los resuelve Next.
9. **Ningún módulo de Finanzas lee `process.env` al importarse.** Las variables se leen dentro de la
   función que las usa. Importar `crypto.ts` sin clave debe funcionar; cifrar sin clave debe lanzar.
10. **Paginación en la base de datos, siempre.** `take`/`skip` con `resolverPaginacion()` de
    `lib/finanzas/paginacion.ts`. Tope duro de 100 filas por página. Nunca se pagina en el navegador.
11. **Ninguna entidad sale sin pasar por `lib/finanzas/serialize.ts`.** Es el punto único de salida y
    lo que decide qué ve `FINANZAS_LECTURA`.
12. **Timestamps del servidor.** `paidAt`, `approvedAt`, `terminatedAt`, `purgedAt` nunca vienen del
    cliente. La única fecha que elige el cliente es `FinanceTransaction.date`, que es la fecha
    contable.
13. **Errores siempre por `apiError()` de `lib/utils.ts`.** Las rutas de API devuelven JSON con
    `403`, nunca un redirect: un `fetch` que recibe un redirect a `/login` obtiene HTML y el bug
    aparece como error de parseo.
14. **Cada ruta y pantalla nueva lleva su `*.spec.md` al lado.** Convención del repo.

### Dónde vive cada cosa

| Asunto                       | Fuente única                                                    |
| ---------------------------- | --------------------------------------------------------------- |
| Porteros de Finanzas         | `lib/access.ts` — `hasFinanceAccess()`, `canWriteFinance()`     |
| Auditoría                    | `lib/finanzas/audit.ts` — `withAudit()`, `mutarConAuditoria()`  |
| Cifrado de cuentas bancarias | `lib/finanzas/crypto.ts` — formato `v1:iv:tag:ct`               |
| Validación de entrada        | `lib/finanzas/schemas.ts` (zod) y `lib/finanzas/rut.ts`         |
| Qué campo ve cada rol        | `lib/finanzas/serialize.ts`                                     |
| Rate limiting                | `lib/finanzas/rate-limit.ts` sobre el modelo `RateLimitCounter` |
| Cálculo de líquido           | `lib/finanzas/payroll.ts`                                       |
| Esquema de datos             | `prisma/schema.prisma`, sección Finanzas                        |
| Variables de entorno         | `VARIABLES_ENTORNO.md` — este repo **no** usa `.env.example`    |

### Variables de entorno nuevas

| Variable                           | Requerida           | La lee                      | Dónde se obtiene                                                              |
| ---------------------------------- | ------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `FINANZAS_ENCRYPTION_KEY`          | sí, desde el paso 5 | `lib/finanzas/crypto.ts`    | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `FINANZAS_ENCRYPTION_KEY_PREVIOUS` | no, sólo al rotar   | `lib/finanzas/crypto.ts`    | La clave que se está reemplazando                                             |
| `FINANZAS_NOTIFY_EMAILS`           | sí, desde el paso 9 | `app/api/usuarios/route.ts` | Correos de Marcela y Elizabeth, separados por coma                            |

**Perder `FINANZAS_ENCRYPTION_KEY` hace irrecuperables los datos bancarios cifrados.** No hay puerta
trasera y el respaldo de la base no ayuda: contiene el ciphertext, no la clave. Guardarla en un
gestor de contraseñas fuera del computador que la generó.

### Diseño de Finanzas

Escritorio, denso, sobrio. Superficies blancas con bordes de 1px, sin sombras salvo en diálogos.
Ingreso `#15803D` · Egreso `#B91C1C` · Primario `#1D4ED8` · Texto `#0F172A` · Texto secundario
`#475569` · Borde `#E2E8F0`. El color nunca es el único portador del dato: todo monto lleva signo y
todo estado lleva etiqueta de texto. Montos en Geist Mono con `tabular-nums`. Alto de fila 40px.
Sin animación al ordenar o filtrar una tabla.

### Trampas de este módulo

- **El orden en `middleware.ts` importa literalmente.** La rama de `/api/finanzas` va **antes** del
  `if (pathname.startsWith("/api/"))`, que hace `return NextResponse.next()`; escrita después, nunca
  se evalúa. La de `/admin/finanzas` va antes del fallback genérico de `/admin`, que exige
  `OPERACIONES`.
- **`db push` sobre la base real exige respaldo verificado antes.** `pg_dump "$DIRECT_URL" >
backups/pre-finanzas.sql` y comprobar que no está vacío. `backups/` está en `.gitignore`.
- **`DIRECT_URL` para operaciones de esquema, `DATABASE_URL` por pooler.** Si un `db push` se cuelga,
  estás apuntando al pooler.
- **Ningún test compara la salida de `formatCurrency()`.** Es `Intl.NumberFormat` y su formato exacto
  depende de la versión de ICU del runtime: pasa en una máquina y falla en la siguiente. Los tests
  comparan números.
- **En desarrollo, probar la recuperación de contraseña envía un correo real** por el SMTP de
  Hostinger. Usa una dirección propia.
- **El sidebar filtra Finanzas por `moduleAccess` incluso para ADMIN**, a diferencia de los otros
  tres módulos. No "arregles" esa asimetría: es el punto.
- **No se guardan adjuntos en v1.** Cuando lleguen, **no** pueden usar el patrón actual de Vercel
  Blob (`access: 'public'`, en `app/api/evidencias/route.ts` y `app/api/ordenes/[id]/route.ts`):
  cualquiera con el link lee el archivo sin sesión. Finanzas necesita almacenamiento privado con
  descarga por ruta autenticada y auditada.

### No negociable

1. Nunca uses `hasModuleAccess()` para gatear Finanzas.
2. Nunca escribas una mutación de Finanzas sin su fila de auditoría en la misma transacción.
3. Nunca uses punto flotante para dinero.
4. Nunca devuelvas `bankAccountEnc` ni `User.password` en una respuesta de API.
5. Nunca hagas borrado duro de un `Employee` ni de una fila de `FinanceAuditLog`.
6. Nunca commitees `.env.local`, `backups/` ni la clave de cifrado.
7. Nunca marques una tarea como terminada con un comando del portón en rojo.

<!-- FINANZAS:FIN -->

---

_Última actualización: 2026-08-07_
