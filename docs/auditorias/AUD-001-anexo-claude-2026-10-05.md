# AUD-001 — Anexo de Claude (2026-10-05)

Para: Codex, como implementador. Complementa
[AUD-001-seguridad-y-calidad-2026-10-04.md](./AUD-001-seguridad-y-calidad-2026-10-04.md); no lo
reemplaza.

- **Base revisada:** `origin/security/aud001-remediation` @ `cb4e043` (incluye SEC-001..005,
  CAL-001 e INV-001).
- **Método:** barrido multiagente read-only de seguridad, POO y código limpio. Cada hallazgo de
  este anexo se **reconfirmó a mano** leyendo el código de `cb4e043`; lo que no se pudo
  reconfirmar no aparece como tarea.
- **No incluido:** cambios de código, ejecución de la app ni consultas a la base real.

Además de las tareas de seguridad, el usuario pidió dos mejoras de la pantalla de login (§3 y §4).

---

## 1. Hallazgos nuevos confirmados

| ID      | Severidad                  | Hallazgo                                                                                             | Ubicación                                                             |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| SEC-006 | **Alta**                   | `GET /api/finanzas/transacciones` devuelve la fila `Supplier` completa                               | `app/api/finanzas/transacciones/route.ts:46`                          |
| SEC-007 | Media                      | El visor de auditoría devuelve `before`/`after` crudos a `FINANZAS_LECTURA`                          | `app/api/finanzas/auditoria/route.ts:39-52`                           |
| SEC-008 | Media                      | Lost update en movimientos de stock                                                                  | `app/api/inventario/movimientos/route.ts` (lect. l.17, escr. l.30-33) |
| SEC-009 | Baja                       | El token de recuperación puede canjearse dos veces en paralelo                                       | `app/api/auth/recuperar/confirmar/route.ts:25-50`                     |
| SEC-010 | Baja → Media con LOGIN-001 | Cambiar la contraseña no revoca sesiones JWT vigentes                                                | `app/api/auth/recuperar/confirmar/route.ts`, `lib/auth.ts`            |
| SEC-011 | Baja                       | La neutralización de fórmulas CSV omite `\t` y `\r` iniciales                                        | `lib/finanzas/csv.ts:5`                                               |
| SEC-012 | Baja                       | `routes.test` valida porteros por archivo con substring, no por método HTTP                          | `lib/finanzas/routes.ts:38-46`                                        |
| SEC-013 | Info                       | AES-256-GCM descifra sin fijar `authTagLength` ni validar el largo de IV/tag                         | `lib/finanzas/crypto.ts:41-48`                                        |
| PWA-001 | Baja                       | `app/layout.tsx` declara `manifest: "/manifest.json"`, pero el archivo no existe (404 en cada carga) | `app/layout.tsx:10`, `public/` sólo tiene `uploads/`                  |

### Descartados al reconfirmar (no tocar)

- **Usuario desactivado conserva la sesión: falso.** El callback `jwt` de `lib/auth.ts:74-87`
  revalida `isActive`, `role` y `moduleAccess` contra la base en cada renovación.
- **El hash de la contraseña queda en `FinanceAuditLog`: falso.** `withAudit` redacta `password`
  y `bankAccountEnc` (`lib/finanzas/audit.ts:24`).
- **`OrderCounter` no atómico: falso en `cb4e043`.** Va dentro de `$transaction` con
  `increment` (`app/api/ordenes/route.ts:104-107`).

### Corrección al informe de 2026-10-04

En §«Autorización», el informe afirma que «Finanzas excluye `bankAccountEnc` del serializado».
Es cierto para empleados y proveedores, **no** para transacciones. Lo cubre SEC-006.

---

## 2. Tareas de seguridad

Orden sugerido: SEC-006 → SEC-008 → SEC-007 → SEC-011/012/013 (pequeñas, un PR) → SEC-009.
SEC-010 va junto con LOGIN-001.

### SEC-006 — No devolver la fila completa de `Supplier` en transacciones (Alta, S)

**Problema.** `include: { category: true, supplier: true }` devuelve todo `Supplier` a cualquier
usuario con `hasFinanceAccess`, incluida `FINANZAS_LECTURA`. Eso incluye `bankAccountEnc`
(ciphertext), `rut`, `email` y `phone`. Viola dos no negociables de CLAUDE.md §9: «nunca devuelvas
`bankAccountEnc`» y «ninguna entidad sale sin `serialize.ts`».

El export (`app/api/finanzas/export/route.ts:65`) usa el mismo `include` pero sólo escribe
`supplier.name` al CSV, así que no filtra datos. Igual conviene cambiarlo para no cargar columnas
cifradas sin necesidad.

**Archivos:**

- `app/api/finanzas/transacciones/route.ts`
- (`transacciones/[id]/route.ts` no usa `include`: verificado, no requiere cambio)
- `app/api/finanzas/export/route.ts`
- `lib/finanzas/routes.ts` y `lib/finanzas/routes.test.ts`

**Pasos:**

1. Cambiar a `supplier: { select: { id: true, name: true } }` y `category: { select: { id: true, name: true } }`.
   Si la UI necesita más datos del proveedor, pasarlos por `serializeSupplier()`.
2. Agregar a `lib/finanzas/routes.ts` un guardia mecánico puro, `inclusionesCrudas(dir)`. Debe
   detectar en `app/api/finanzas/**/route.ts` las líneas `supplier: true` y `employee: true`.
   Se prueba en `routes.test.ts`.
3. Revisar en el navegador que la lista de transacciones sigue mostrando el nombre del proveedor.

**Aceptación:**

- El test nuevo falla sobre `cb4e043` y pasa tras el cambio.
- `rg "supplier: true|employee: true" app/api/finanzas` no devuelve nada.
- El portón está verde.

### SEC-007 — Serializar el visor de auditoría (Media, M)

**Problema.** `GET /api/finanzas/auditoria` devuelve `FinanceAuditLog` tal cual. `before` y
`after` llevan RUT, correo, teléfono y dirección de empleados y proveedores, visibles para
`FINANZAS_LECTURA`.

Además, DESVINCULAR purga los datos de contacto del `Employee`, pero sus copias siguen para siempre
en el log append-only. Eso es un tema de la Ley 19.628.

**Pasos:**

1. Crear `serializeAuditLog(fila, user)` en `lib/finanzas/serialize.ts`, con su test:
   - Para `FINANZAS_LECTURA`, enmascarar en `before`/`after` las claves `rut`, `email`, `phone`,
     `address` y `bankAccountLast4`. El RUT queda como `12.***.***-K`.
   - Para `FINANZAS`, mismo enmascarado si la entidad está desvinculada (`purgedAt` no nulo).
2. Usarlo en la ruta.
3. Validar `desde`/`hasta` antes de `new Date()`. Hoy una fecha inválida produce un error de Prisma
   (500).

**Decisión del usuario:** ¿se deja de guardar datos de contacto en `before`/`after` desde ahora
(redactarlos al escribir en `withAudit`)? Eso reduce el valor del log como evidencia. La
recomendación es enmascarar al leer y no cambiar la escritura. Nunca se actualizan filas
existentes, porque el log es append-only.

**Aceptación:** tests de `serializeAuditLog` para los dos roles y para una entidad purgada. El
portón está verde.

### SEC-008 — Movimientos de stock atómicos (Media, M)

**Problema.** El handler lee `item.quantity` fuera de la transacción (l.17) y luego escribe un
valor absoluto (`data: { quantity: newQuantity }`). Con dos movimientos simultáneos se pierde uno.
Además usa `parseFloat(quantity)` sin validar que sea finito y mayor que 0.

**Pasos:**

1. Crear una función pura `calcularMovimiento({ tipo, cantidad, actual })` en
   `lib/inventario/movimiento.ts`, con su test. Valida tipo, número finito, cantidad > 0 y que una
   SALIDA no deje stock negativo.
2. En el handler, usar `prisma.$transaction(async tx => …)`. Dentro:
   - Para SALIDA, `tx.inventoryItem.updateMany({ where: { id, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } })`.
     Si `count === 0`, responder 409 con «stock insuficiente».
   - Para ENTRADA, usar `increment`.
   - Leer después la fila actualizada para `quantityBefore`/`quantityAfter`.
3. Mismo patrón en cualquier AJUSTE que escriba un valor absoluto.

**Aceptación:**

- Test unitario de `calcularMovimiento`.
- Revisión manual: dos `fetch` simultáneos de SALIDA sobre el mismo ítem dejan un stock coherente
  y dos `InventoryMovement` consistentes.
- El portón está verde.

### SEC-009 — Canje único del token de recuperación (Baja, S)

**Pasos:**

1. Dentro de la transacción, marcar el token con
   `tx.passwordResetToken.updateMany({ where: { id: fila.id, usedAt: null }, data: { usedAt: new Date() } })`.
   Si `count !== 1`, abortar con `MENSAJE_INVALIDO`.
2. En la misma transacción, invalidar los demás tokens vivos del usuario.

**Aceptación:** la lógica de decisión queda en `lib/finanzas/reset.ts`, con un test que cubre el
segundo canje.

### SEC-010 — Revocar sesiones al cambiar la contraseña (Baja; Media si se hace LOGIN-001, M)

**Problema.** Hoy una sesión robada sigue válida hasta 8 horas después del reset. Con LOGIN-001
las sesiones pasan a durar días, así que hay que hacerlas juntas.

**Pasos:**

1. Agregar `User.passwordChangedAt DateTime?` en `prisma/schema.prisma`. Es un cambio aditivo,
   pero exige `db push` con respaldo `pg_dump` verificado.
2. Escribir el campo en la recuperación y en cualquier cambio de contraseña desde
   `/api/usuarios`.
3. En el callback `jwt` (donde ya se consulta `dbUser`), invalidar el token si
   `passwordChangedAt > token.iat`. Usar la misma vía que hoy usa un usuario inactivo: limpiar
   `role` y `moduleAccess`.

La regla de comparación va como función pura en `lib/auth-session.ts` (ver LOGIN-001), con su
test.

**Decisión del usuario:** autorizar el cambio de schema y el `db push`.

### SEC-011 / SEC-012 / SEC-013 — Endurecimientos menores (Baja/Info, S; un solo PR)

- **SEC-011:** agregar `"\t"` y `"\r"` a `CARACTERES_FORMULA` en `lib/finanzas/csv.ts`, con test.
  `lib/csv.ts` reutiliza `escaparCampoCsv`, así que el fix cubre los exports de CRM, Inventario y
  Finanzas.
- **SEC-012:** cambiar `rutasSinPortero()` en `lib/finanzas/routes.ts` para que separe cada
  `export async function (GET|POST|PUT|PATCH|DELETE)` y exija un portero dentro del cuerpo de cada
  método. Test con un fixture de un archivo con `GET` protegido y `DELETE` sin portero, que debe
  fallar.
- **SEC-013:** usar `createDecipheriv(ALGORITMO, clave, iv, { authTagLength: 16 })` y rechazar IV
  ≠ 12 bytes o tag ≠ 16 bytes antes de descifrar. Test con un tag truncado que debe lanzar.

### PWA-001 — Manifest inexistente (Baja, S; puede ir con BRAND-001)

Hay que crear `app/manifest.ts` (convención de Next) o `public/manifest.json` con:

- `name: "Central Coopera"`, `short_name: "Coopera"` y `display: "standalone"`.
- Los íconos de BRAND-001.
- `theme_color` alineado con la marca.

Si se decide no tener PWA, quitar `manifest` de `metadata`.

---

## 3. LOGIN-001 — Casilla «Recordar sesión» en el login (pedido del usuario)

**Interpretación.** El usuario pidió una casilla «recordar contraseña». Guardar la contraseña es
trabajo del gestor de contraseñas del navegador, y el formulario ya lo permite
(`autoComplete="email"` / `"current-password"`). La app **nunca** debe guardar la contraseña en
`localStorage` ni en cookies.

La casilla controla cuánto dura la sesión. **Etiqueta sugerida:** «Mantener sesión iniciada en
este equipo». Si el usuario prefiere el texto literal «Recordar contraseña», usarlo, pero con el
mismo comportamiento.

**Diseño:**

1. **UI** (`app/(auth)/login/page.tsx`):
   - Checkbox debajo de la contraseña, **desmarcado por defecto**. Los celulares de choferes
     pueden ser compartidos.
   - Etiqueta `<label>` asociada y área táctil de 44 px o más (regla mobile-first).
   - Pasar `remember: remember ? "1" : "0"` a `signIn("credentials", …)`.
2. **Servidor** (`lib/auth.ts`):
   - Agregar `remember` a `credentials`. `authorize` lo devuelve en el objeto user.
   - En `jwt`, en el login (`if (user)`), fijar `token.sessionExpiresAt = ahora + duración`.
     Usar la hora del servidor (regla de timestamps).
   - En cada renovación, si `Date.now() > token.sessionExpiresAt`, invalidar como hoy se invalida
     a un usuario inactivo (limpiar `role` y `moduleAccess`).
   - Subir `session.maxAge`/`jwt.maxAge` a la duración larga, para que la cookie sobreviva. El
     límite real lo impone `sessionExpiresAt`.
3. **Lógica pura** en `lib/auth-session.ts`, nuevo, con imports relativos y sin Prisma ni
   `process.env` al importar:
   - `calcularVencimiento({ ahora, recordar, moduleAccess })`
   - `sesionVencida({ ahora, sessionExpiresAt, passwordChangedAt, iat })`

   Ambas con su `lib/auth-session.test.ts`.

4. **`middleware.ts` no se toca** (regla del repo). El rechazo funciona igual que el de usuario
   inactivo: rol vacío → el middleware redirige las páginas a `/login` y los handlers responden
   401/403.

**Decisiones del usuario** (dar un valor por defecto si no responde):

| Decisión                                                   | Recomendación                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Duración con la casilla marcada                            | 7 días (sin marcar: 8 h, igual que hoy)                               |
| ¿Quién con `FINANZAS`/`FINANZAS_LECTURA` puede «recordar»? | Nadie: tope de 8 h aunque marque la casilla (datos de remuneraciones) |
| Texto de la etiqueta                                       | «Mantener sesión iniciada en este equipo»                             |

**Depende de:** SEC-010. Con sesiones largas, un reset de contraseña debe cerrar las sesiones
abiertas.

**Aceptación:**

- Tests de `calcularVencimiento` y `sesionVencida`, que cubran recordar/no recordar, el tope de
  Finanzas y la contraseña cambiada después de `iat`.
- Revisión manual: sin casilla, la sesión expira a las 8 h. Se puede simular bajando la constante
  en local, sin commitear el cambio.
- La spec `app/(auth)/login/page.spec.md` queda actualizada. Hoy está desfasada: dice «Email o
  contraseña incorrectos» y «Logo de Coopera Pro», cosa que la página no tiene.
- El portón está verde.

**Observación.** `/api/auth/recuperar` existe, pero no hay página de «¿Olvidaste tu contraseña?».
Queda fuera de alcance salvo que el usuario lo pida. Si se agrega, va como enlace bajo el
formulario.

---

## 4. BRAND-001 — Logo de Coopera Pro en lugar del ícono de reciclaje (pedido del usuario)

**Fuente.** `C:\dev\cooperapro-web\img\cooperaproultraaltacirculo.png`. Es un PNG RGBA de
**6250×6250 px y 7,2 MB**. Muestra un círculo azul marino con las flechas verdes de reciclaje,
el texto «CooperaPro» y el lema «Recicla, coopera, prospera». **No se puede usar tal cual:**

- **Peso.** Pesa 7,2 MB para mostrarse a 32–96 px. Hay que generar derivados.
- **Bordes sucios.** Tiene píxeles verdes sueltos fuera del círculo: arriba a la izquierda, a la
  derecha y abajo a la izquierda. Se ven sobre fondo oscuro. Hay que aplicar una máscara circular
  limpia (alpha 0 fuera del radio).
- **Legibilidad.** Por debajo de ~48 px el texto y el lema son ilegibles. El usuario pidió
  reemplazar el ícono de reciclaje por el logo, así que se usa el logo circular en todos lados. En
  tamaños chicos se lee como un sello azul con las flechas verdes, que sigue siendo reconocible.
  Si se quiere más legibilidad a 32 px, la alternativa es un recorte «isotipo» (sólo las flechas,
  sobre el mismo círculo). Eso queda como decisión del usuario; por defecto, logo completo.

**Archivos derivados.** Se generan con `sharp`, que ya es dependencia: **cero dependencias
nuevas**. El script es `scripts/generate-brand-assets.ts`, con su `.spec.md` y alias
`npm run brand:assets`. Recibe la ruta de origen como argumento y nunca la tiene hardcodeada.

| Salida                                 | Tamaño           | Uso                                      |
| -------------------------------------- | ---------------- | ---------------------------------------- |
| `public/brand/coopera-pro-logo.png`    | 512×512, ≤ 80 KB | Login (hero) y fuente de `next/image`    |
| `public/brand/coopera-pro-logo-96.png` | 96×96            | Opcional, si no se usa `next/image`      |
| `app/icon.png`                         | 512×512          | Favicon (convención de archivos de Next) |
| `app/apple-icon.png`                   | 180×180          | iOS                                      |

Sólo se commitean los derivados. El original de 7,2 MB **no** entra al repo.

**Componente.** Crear `components/ui/BrandLogo.tsx` con su `BrandLogo.spec.md`:

- `next/image`, `src="/brand/coopera-pro-logo.png"`, `alt="Coopera Pro"`.
- Prop `size` en px. `priority` sólo en el login.
- Sin caja de fondo `bg-emerald-*`: el logo ya es un círculo con su propio fondo.
- Si junto al logo ya se muestra el texto «Central Coopera», usar `alt=""` y `aria-hidden` para
  no anunciarlo dos veces. El componente recibe una prop `decorative` para eso.

**Reemplazos.** Son cinco: el `<Recycle>` y su caja `bg-emerald-*`, en estos lugares:

| Archivo                                                   | Línea actual | Tamaño sugerido |
| --------------------------------------------------------- | ------------ | --------------- |
| `app/(auth)/login/page.tsx` (panel izquierdo, escritorio) | 58-60        | 56 px           |
| `app/(auth)/login/page.tsx` (cabecera móvil)              | 109-111      | 48 px           |
| `components/ui/AdminSidebar.tsx`                          | 261-268      | 32 px           |
| `components/ui/ChoferHeader.tsx`                          | 30-32        | 32 px           |
| `components/ui/RecepcionNav.tsx`                          | 21-23        | 32 px           |

- Quitar el import de `Recycle` de los cuatro archivos si queda sin uso.
- Actualizar el `.spec.md` de cada componente tocado.
- Opcional, a decidir por el usuario: un logo grande (96–120 px) sobre el formulario del login en
  escritorio, porque es la pantalla de marca.

**Color.** El fondo del círculo es `#29354B`, medido en el archivo. Hoy `viewport.themeColor` es
`#22c55e` en `app/layout.tsx`. Proponer al usuario usar `#29354B`, que es el color de la barra del
navegador en móvil. No cambiar la paleta emerald de la app sin pedirlo: el pedido es sólo el logo.

**CSP.** Las imágenes de `/brand/` son `'self'` y ya están permitidas por `img-src`. `next/image`
local no necesita `remotePatterns`.

**Aceptación:**

- `public/brand/coopera-pro-logo.png` pesa 80 KB o menos y no tiene píxeles opacos fuera del
  círculo (el script lo verifica).
- `rg "Recycle" app components` devuelve sólo usos que no son logo, o nada.
- Revisión visual a 320, 390 y 1440 px de ancho, en login, panel admin, chofer y recepción.
- El portón está verde.

---

## 5. Resumen para el registro

| ID           | Prioridad | Esfuerzo | Depende de | Decisión del usuario                       |
| ------------ | --------- | -------- | ---------- | ------------------------------------------ |
| SEC-006      | Alta      | S        | —          | —                                          |
| SEC-008      | Media     | M        | —          | —                                          |
| SEC-007      | Media     | M        | —          | ¿redactar contacto al escribir el log?     |
| SEC-011..013 | Baja      | S        | —          | —                                          |
| SEC-009      | Baja      | S        | —          | —                                          |
| SEC-010      | Media     | M        | —          | autorizar `db push` (`passwordChangedAt`)  |
| LOGIN-001    | Media     | M        | SEC-010    | duración, tope de Finanzas, texto          |
| BRAND-001    | Media     | M        | —          | ¿isotipo a 32 px? ¿`themeColor` `#29354B`? |
| PWA-001      | Baja      | S        | BRAND-001  | ¿PWA sí o no?                              |

Portón para todas: `npm run typecheck && npm run test && npm run build`. Cada ruta, componente o
script nuevo lleva su `*.spec.md`.

## 6. Decisiones aprobadas por el usuario (2026-10-05)

El usuario aprobó las recomendaciones de este anexo. Codex puede implementar sin volver a
preguntar:

| Tema                                 | Decisión aprobada                                                        |
| ------------------------------------ | ------------------------------------------------------------------------ |
| LOGIN-001: duración con casilla      | 7 días; sin casilla, 8 h como hoy                                        |
| LOGIN-001: usuarios de Finanzas      | Tope de 8 h aunque marquen la casilla (`FINANZAS` o `FINANZAS_LECTURA`)  |
| LOGIN-001: texto                     | «Mantener sesión iniciada en este equipo», desmarcada por defecto        |
| SEC-010: `User.passwordChangedAt`    | Autorizado; `db push` sólo con respaldo `pg_dump` verificado (`test -s`) |
| SEC-007: datos de contacto en el log | Enmascarar al leer; no cambiar la escritura ni tocar filas existentes    |
| BRAND-001: tamaño chico              | Logo circular completo en todos los tamaños (sin isotipo)                |
| BRAND-001: `themeColor`              | `#29354B` (azul del logo); la paleta emerald de la app no cambia         |
| PWA-001                              | Crear el manifest con los íconos de BRAND-001                            |

**Orden de trabajo:**

1. SEC-006
2. SEC-008
3. SEC-007
4. SEC-011..013
5. SEC-009
6. BRAND-001 + PWA-001
7. SEC-010 + LOGIN-001, que requieren `db push` y van al final

El `db push` de SEC-010 se ejecuta sólo con el respaldo verificado. Si falta, se deja la tarea en
`BLOQUEADA` con el motivo.
