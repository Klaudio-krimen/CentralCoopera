# AUD-001 — Auditoría de seguridad, POO y código limpio

**Fecha:** 2026-10-04
**Responsable:** Codex
**Base revisada:** `43a08272012d0cd689a295cdcdf0371a67becd3c` (`master`)
**Alcance:** revisión de solo lectura. No se modificó código ni esquema.

## Resultado ejecutivo

**Riesgo global: crítico (100/100 según la escala Cyber Neo).** `npm audit --json` encontró 25 paquetes afectados en el árbol: 1 crítico, 20 altos, 3 moderados y 1 bajo. Aplicando la fórmula del skill a esos paquetes (`25 + 20×10 + 3×3 + 1`, con tope 100), el puntaje queda en 100. La revisión de código confirmó fallas de autorización en órdenes y evidencias, exposición innecesaria de datos de contacto y una carrera que permite perder incrementos del limitador de login. No se confirmó una credencial real en archivos versionados.

Las acciones prioritarias son actualizar Next.js a una línea LTS soportada y corregir sus dependencias vulnerables; aplicar autorización por rol/módulo y estado en cada handler operativo; y volver atómico el contador de intentos de autenticación.

El CVE-2026-75604 de Next.js requiere un servidor alojado sobre sistema de archivos Windows. La otra RCE crítica analizada requiere que el optimizador procese AVIF; el proyecto no configura AVIF explícitamente y no se confirmó esa ruta. Esto limita la conclusión de explotabilidad en producción, pero no elimina la necesidad de salir de Next 14, que está fuera de soporte y contiene avisos críticos/altos.

## Alcance y método

| Revisión                        | Resultado                                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reconocimiento                  | Next.js 14, React, TypeScript, Prisma/PostgreSQL, NextAuth y Vercel. 423 archivos fuera de dependencias y artefactos; revisión estática de 375 archivos de código y 52 handlers API.                                                                              |
| SCA                             | `npm audit --json`, con datos del registro consultados el 2026-10-04. Exit 1 por vulnerabilidades; 25 paquetes afectados: 1 crítico, 20 altos, 3 moderados, 1 bajo.                                                                                               |
| Integridad de dependencias      | `check_lockfiles.py`: cero hallazgos. `package-lock.json` está versionado; 628 paquetes resueltos con versión e integridad y coincide con el manifiesto.                                                                                                          |
| Secretos                        | `scan_secrets.py`: 390 archivos escaneados, 2 omitidos. Cinco coincidencias en archivos versionados: cuatro placeholders de `VARIABLES_ENTORNO.md` y un fixture en `lib/finanzas/audit.test.ts`; exposiciones reales confirmadas: cero. No se incluyeron valores. |
| Configuración e infraestructura | Sin Docker ni workflows de GitHub detectados. `.env.local` existe y está ignorado; su contenido no se abrió.                                                                                                                                                      |
| Herramientas externas           | npm 11.16.0, Node 24.18.0 y Python 3.14.2. Semgrep, Trivy y Gitleaks no disponibles.                                                                                                                                                                              |

No se levantó la aplicación, no se ejecutaron pruebas, build ni comandos contra la base de datos; tampoco se accedió a la configuración de Vercel, producción o sus logs. El análisis regex de secretos no sustituye una búsqueda especializada de todo el historial Git.

## Hallazgos de seguridad

### CN-001 — Next.js con avisos críticos de RCE y fuera de soporte

- **Severidad:** Critical — CWE-22 para CVE-2026-75604; OWASP A06:2025 Supply Chain Failures.
- **Evidencia:** `package.json:39` fija `next` en `^14.2.35`; `package-lock.json:6065` resuelve `14.2.35`.
- **Impacto:** Next 14 está fuera del soporte oficial. El aviso CVE-2026-75604 cubre App/Pages Router en servidores Windows; GHSA-2xp9-vwfh-vxw4 describe RCE del optimizador si procesa AVIF. npm también informa avisos de DoS, SSRF, caché y otras clases para la versión resuelta.
- **Recomendación:** planificar actualización a una versión LTS soportada y volver a revisar el árbol completo. Al 2026-10-04 Next.js publica `15.5.27` como Maintenance LTS y `16.3.8` como Active LTS. Validar compatibilidad con React, Prisma, middleware y despliegue; no aceptar un `npm audit fix --force` sin revisar el salto mayor. Confirmar con quien administra Vercel el runtime real y revisar si algún flujo habilita AVIF.
- **Condiciones:** no se verificó explotación en producción. La ruta AVIF no está configurada explícitamente; el advisory de Windows no afecta despliegues no alojados sobre Windows.

### CN-002 — APIs de órdenes omiten autorización por módulo/rol

- **Severidad:** High — CWE-862; OWASP A01:2025 Broken Access Control.
- **Evidencia:** `app/api/ordenes/route.ts:21-87` limita GET por propietario solo para CHOFER; otros roles autenticados pueden leer todas las órdenes. POST rechaza RECEPCION, pero permite crear órdenes a otros roles aunque la especificación limita la operación a CHOFER. `app/api/ordenes/[id]/route.ts:27-205` tiene verificaciones parciales: usuarios no CHOFER pueden leer registros ajenos y los handlers de recepción/edición no aplican la matriz documentada.
- **Impacto:** una cuenta CRM, BODEGA o Finanzas autenticada puede acceder o alterar información operativa ajena a su módulo.
- **Recomendación:** crear una matriz explícita rol/módulo/acción/estado; aplicarla en cada handler; limitar la consulta por `driverId` para CHOFER y cubrir por separado lectura, recepción, edición y cambios de estado. Añadir pruebas de acceso permitido y denegado por rol.

### CN-003 — Las APIs de evidencias no validan permisos por etapa

- **Severidad:** High — CWE-862; OWASP A01:2025.
- **Evidencia:** `app/api/evidencias/route.ts:13-32` permite subir evidencia a una orden a cualquier sesión autenticada que no sea un CHOFER de otra orden. `:106-138` permite borrar evidencia a todo usuario autenticado que no sea el propietario CHOFER. `route.spec.md` exige permisos según etapa, rol, propiedad y estado de la orden.
- **Impacto:** roles de otros módulos pueden alterar o borrar evidencia de operaciones.
- **Recomendación:** exigir rol y permiso operativo válidos, propiedad de orden para CHOFER, transición permitida por etapa y estado, y permiso explícito para borrar. Validar estos casos en handlers y pruebas.

### CN-004 — Datos de contacto de empresas visibles a roles sin permiso CRM

- **Severidad:** Medium — CWE-862/CWE-200; OWASP A01:2025.
- **Evidencia:** `app/api/empresas/route.ts:9-41` solo verifica sesión. Todo usuario distinto de CHOFER recibe `address`, `contactName` y `contactPhone`; la especificación restringe GET a CHOFER y ADMIN.
- **Impacto:** datos personales/de contacto quedan accesibles a roles sin necesidad operativa documentada.
- **Recomendación:** permitir CHOFER con selección mínima y usuarios con acceso CRM; denegar el resto. Alinear la especificación con las necesidades del CRM y mantener `select` con mínimo privilegio.

### CN-005 — El rate limit de login permite incrementos perdidos bajo concurrencia

- **Severidad:** Medium — CWE-307/CWE-362; OWASP A07:2025 Authentication Failures.
- **Evidencia:** `lib/finanzas/rate-limit.ts:44-71` lee el contador y luego hace `upsert` con un valor absoluto calculado desde la lectura previa. `lib/auth.ts:8-9,25-37` lo usa para limitar a cinco intentos por ventana de quince minutos.
- **Impacto:** solicitudes paralelas pueden leer el mismo valor y sobrescribirlo con el mismo siguiente contador; varias obtienen `ok: true` y el límite no representa el número real de intentos.
- **Recomendación:** resolver incremento, expiración y decisión con una operación atómica en la base de datos; cubrir creación concurrente y carreras de ventana con pruebas concurrentes. Evaluar además límites complementarios sin depender solo del correo.

### CN-006 — Nodemailer y su árbol de producción tienen avisos de severidad alta

- **Severidad:** High — OWASP A06:2025; CWEs según advisory, entre ellos CWE-1333/CWE-407.
- **Evidencia:** `package.json:41` declara `nodemailer`; el lock resuelve `7.0.13` (`package-lock.json:6214`). GHSA-v53p-9fqp-m79j cubre DoS algorítmico y npm reporta además avisos de parser, destinatarios, SMTP/TLS y acceso a contenido.
- **Impacto:** degradación o agotamiento de recursos al procesar direcciones y contenido; la aplicación construye correos con contactos importados y los envía en lotes. La explotabilidad de cada advisory por esa ruta no fue probada.
- **Recomendación:** actualizar Nodemailer a versión corregida (npm sugiere `10.0.14`; el mínimo para GHSA-v53p-9fqp-m79j es `10.0.6`), revisar cambio mayor y compatibilidad con NextAuth 4 y `@types/nodemailer`; no cambiar NextAuth al sugerido por npm sin migración explícita.

### CN-007 — Sharp y decodificadores nativos vulnerables

- **Severidad:** High — CWE-122 para desbordamiento de memoria en la cadena libheif; OWASP A06:2025.
- **Evidencia:** `package.json:46` declara `sharp`; el lock resuelve `0.33.5` (`package-lock.json:7382`). GHSA-f88m-g3jw-g9cj agrupa cuatro CVE de libvips y GHSA-rgj7-g3m4-5g8c advierte sobre libheif.
- **Impacto:** riesgo al decodificar imágenes no confiables. `/api/evidencias` usa Sharp y acepta HEIC/HEIF; el alcance exacto de cada advisory respecto de los bytes aceptados requiere validación después de actualizar.
- **Recomendación:** subir a versión corregida (`0.35.5` según npm), revisar compatibilidad del binario nativo y probar imágenes válidas, corruptas y límites de tamaño.

### CN-008 — Otros paquetes de producción y desarrollo pendientes de parche

- **Severidad:** High, Medium y Low según tabla; OWASP A06:2025.
- **Evidencia y remediación:**

| Alcance                       | Paquetes/advisories destacados                                                                                                                                                                                                                       | Versión indicada por npm/advisory                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producción o grafo compartido | `postcss@8.4.31` (XSS/path traversal y disclosure), `undici@6.28.0`, `tailwindcss@3.4.19` y transitivos `braces@3.0.3`, `chokidar@3.6.0`, `fast-glob@3.3.3`, `micromatch@4.0.8`; también `postcss-selector-parser@6.1.2`                             | PostCSS `>=8.5.23`, Undici `>=6.28.1`, selector parser `>=6.1.3`. Revisar cadena Tailwind: el cambio sugerido a Tailwind 4 es mayor y `braces` no tenía versión parcheada en el advisory revisado. |
| Tooling / solo desarrollo     | `eslint-config-next@14.2.5`, `@next/eslint-plugin-next@14.2.5`, `@typescript-eslint/parser`/`typescript-estree@7.2.0`, `glob@10.3.10`, `globby@11.1.0`, `minimatch@9.0.3`, `brace-expansion` en varias ramas, `browserslist@4.28.2`, `js-yaml@4.3.1` | `glob >=10.5.0`, `minimatch >=9.0.7`, `brace-expansion >=1.1.21/2.1.7`, `browserslist >=4.28.7`, `js-yaml >=4.3.2`; actualizar tooling compatible y confirmar todas las instancias del lock.       |
| Pruebas / desarrollo          | `vitest@4.1.9`, `@vitest/mocker@4.1.9`, `baseline-browser-mapping@2.10.34`                                                                                                                                                                           | Vitest/mocker `>=4.1.11`, baseline mapping `>=2.11.0`.                                                                                                                                             |

Los nombres exactos, advisories y versiones se obtuvieron de `npm audit` y su árbol resuelto. En Tailwind, ESLint y paquetes compartidos debe comprobarse si el componente vulnerable procesa entrada no confiable; alcance en el árbol no demuestra por sí solo ejecución en requests. El resultado completo debe repetirse tras cualquier cambio del lock.

### CN-009 — STARTTLS no se exige para puertos distintos de 465

- **Severidad:** Medium, condicionado a que `SMTP_PORT` sea 587/25 y a una degradación/intermediario — CWE-319; OWASP A02:2025 Security Misconfiguration.
- **Evidencia:** `lib/outreach/smtp.ts:45-55` usa `secure: port === 465`; no configura `requireTLS`. Nodemailer confirma que `requireTLS` por defecto es `false`; `secure: false` permite STARTTLS oportunista.
- **Recomendación:** restringir los puertos admitidos y exigir el upgrade STARTTLS en 587/25; mantener la validación predeterminada del certificado TLS. Confirmar puerto/proveedor actual antes del cambio.

### CN-010 — Credencial de webhook incluida en una URL

- **Severidad:** Low, hardening preventivo — CWE-598; OWASP A02:2025.
- **Evidencia:** `app/api/configuracion/webhook/route.ts:8-24` devuelve URL con secreto; `app/api/webhooks/leads/route.ts:172-177` también acepta el secreto de query. No se verificó que producción registre o filtre esa URL.
- **Recomendación:** preferir `x-webhook-secret` y devolver una URL sin credencial cuando la integración permita header. Si una plataforma solo acepta URL, limitar el secreto a esa integración, permitir rotación y confirmar redacción de query en logs e historial de monitoreo.

### CN-011 — CSP reduce defensa ante XSS

- **Severidad:** Low, hardening preventivo — OWASP A02:2025.
- **Evidencia:** `next.config.mjs:22-28` configura `script-src 'unsafe-inline' 'unsafe-eval'` globalmente. No se encontró XSS explotable durante SAST.
- **Recomendación:** inventariar scripts inline/eval requeridos, eliminar `unsafe-eval` en producción y evaluar CSP con nonce/hash y modo de reporte; probar el comportamiento real de Next antes de endurecerla.

### CN-012 — Errores y logs revelan más contexto del necesario

- **Severidad:** Low — CWE-209/CWE-532; OWASP A09:2025 Logging and Alerting Failures y A10:2025 Mishandling of Exceptional Conditions.
- **Evidencia:** `app/api/contactos/import/route.ts:173-180` retorna `e.message` por fila. `lib/auth.ts:32-60,125` escribe email/ID de usuarios y el objeto de error completo en logs. No encontré contraseñas, tokens de sesión ni claves en esos logs.
- **Recomendación:** responder con mensaje genérico y correlation ID; conservar logs estructurados, sanitizados, con controles de acceso y retención definidos. Pseudonimizar email/ID cuando no sean necesarios para operar.

### CN-013 — Reglas de exclusión preventiva incompletas

- **Severidad:** Low, sin exposición actual confirmada — OWASP A02:2025.
- **Evidencia:** `.gitignore:10-11,53` cubre `.env` y `.env*.local`, pero no cubre nombres como `.env.production`, `.env.development`, `credentials.json`, `service-account.json` ni `*.keystore`. No hay archivos con esos nombres entre los versionados.
- **Recomendación:** añadir patrones de exclusión y excepciones seguras para plantillas. Mantener una comprobación de secretos sobre staging y el historial; no guardar valores en documentación.

## Controles que sí se observaron

- NextAuth configura sesión `HttpOnly`, `SameSite=Lax` y `Secure` en producción, con duración de ocho horas.
- `next.config.mjs` declara X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, CSP y Permissions-Policy.
- El cron falla cerrado cuando falta `CRON_SECRET`; el webhook tiene secreto aleatorio y bandera `enabled`.
- Las rutas CRM y Finanzas revisadas sí usan sus porteros; Finanzas excluye `bankAccountEnc` del serializado y registra las mutaciones dentro de transacción.
- No se encontraron SQL raw, `eval`, `new Function`, ejecución de comandos ni `dangerouslySetInnerHTML`. Los valores dinámicos de las plantillas HTML de outreach se escapan.
- `package-lock.json` está comprometido y no se encontró dependencia Git, URL local ni paquete interno sin scope. No hay workflows CI en el commit revisado; Vercel no se inspeccionó.

## Evaluación de POO y código limpio

El repositorio tiene TypeScript `strict: true` y separa reglas puras de infraestructura en áreas como Finanzas y Outreach. Conviene preservar esos límites. No recomiendo convertir páginas, componentes React ni reglas puras en clases solo para aumentar el uso de POO; reservar clases/interfaces de servicio para adaptadores con estado y ciclo de vida real (SMTP, almacenamiento o integraciones externas).

Trabajo de mantenibilidad propuesto, posterior a cerrar los riesgos de acceso y dependencias:

1. Descomponer por responsabilidad `app/(chofer)/chofer/nueva-orden/page.tsx` (~650 líneas), `components/inventario/TablaInventario.tsx` (~455) e `components/inventario/ItemFormModal.tsx` (~434), manteniendo componentes pequeños y pruebas por flujo.
2. Reducir los 86 usos encontrados de `any`/casts/supresiones, empezando por handlers y fronteras de datos; preferir schemas validados y tipos de Prisma/DTO. Tratar fixtures y mocks de pruebas por separado.
3. Consolidar una matriz de autorización comprobable y un servicio pequeño para ejecutar las decisiones de dominio; mantener acceso a Prisma en el handler/repositorio y lógica de reglas en funciones puras cuando eso permita pruebas deterministas.
4. Añadir una compuerta reproducible de SCA para producción y desarrollo, junto con gates existentes de typecheck, tests y build. No hay configuración CI en el repo actual.

## Plan compartido para continuar

Estas tareas quedan propuestas; esta auditoría no las implementa:

| ID      | Prioridad | Tarea                                                                                    | Criterio de cierre                                                                                                                    |
| ------- | --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-001 | Alta      | Actualizar Next.js desde 14 y corregir los avisos críticos/altos de producción y tooling | Líneas LTS soportadas, `npm audit` revisado en todo el árbol y en producción, typecheck/tests/build y preview desplegado verificados. |
| SEC-002 | Alta      | Corregir autorización por rol/módulo/estado en órdenes, evidencias y listado de empresas | Matriz acordada, handlers responden 401/403 según rol; pruebas positivas/negativas para cada método.                                  |
| SEC-003 | Alta      | Hacer atómico el rate limit de login                                                     | Carrera de incremento/expiración corregida y prueba concurrente que no excede el límite.                                              |
| SEC-004 | Media     | Exigir STARTTLS para puertos de actualización SMTP                                       | Puertos validados, transporte falla sin TLS y tests cubren 465/587.                                                                   |
| SEC-005 | Media     | Endurecer configuración de webhook, CSP, logging, errores y `.gitignore`                 | Credenciales fuera de URL cuando sea posible; errores de API sin detalles internos; reglas de exclusión cubiertas.                    |
| CAL-001 | Media     | Modularizar pantallas grandes y reducir casts inseguros                                  | Refactor incremental con contratos tipados, sin cambio funcional y con pruebas existentes más casos por flujo.                        |

## Fuentes consultadas

- [Next.js: política de soporte](https://nextjs.org/support-policy)
- [Next.js: Security Release de septiembre 2026](https://nextjs.org/blog/september-2026-security-release)
- [Next.js GHSA-p293-qw3h-jr36 — RCE en servidores Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- [Next.js GHSA-2xp9-vwfh-vxw4 — RCE en optimización AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
- [Nodemailer GHSA-v53p-9fqp-m79j](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-v53p-9fqp-m79j) · [opciones SMTP/TLS](https://nodemailer.com/smtp)
- [sharp GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) · [sharp GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)
- [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Implementación de SEC-001..SEC-005 y CAL-001 — 2026-10-04

La auditoría anterior fue de solo lectura. Esta sección registra una implementación posterior
autorizada por el usuario en la rama `security/aud001-remediation`, basada en `fff720c`. El informe
histórico, su evidencia y sus cifras corresponden a la base `43a0827`; los estados de abajo reflejan
el árbol actualizado después de los cambios.

| Hallazgo        | Resultado de la implementación                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CN-001 / CN-008 | Next.js `15.5.27`, Tailwind `4.3.3`, Sharp `0.35.5`, Nodemailer `10.0.14`; overrides corrigen PostCSS y tooling. `npm audit --audit-level=low` reporta cero vulnerabilidades. CI fija Node 24, requiere Node `>=20.9` y ejecuta audit, typecheck, tests y build.                                                         |
| CN-002          | GET/POST/PATCH de órdenes aplica acceso a Operaciones, propiedad y autorización de acción/estado. La creación de código y orden queda en transacción; los datos recibidos se validan en servidor.                                                                                                                        |
| CN-003          | Carga y borrado de evidencia validan módulo, rol, etapa, dueño y estado; enums y coordenadas se validan antes de persistir.                                                                                                                                                                                              |
| CN-004          | Empresas: CHOFER recibe selección mínima; usuarios CRM reciben campos comerciales; otros roles reciben 403.                                                                                                                                                                                                              |
| CN-005          | El límite de intentos usa `updateMany` para expirar y un upsert con incremento atómico; la prueba concurrente confirma que no se excede el límite.                                                                                                                                                                       |
| CN-006          | SMTP valida el puerto, usa TLS implícito en 465 y exige STARTTLS en otros puertos permitidos. NextAuth 4 mantiene un peer opcional que declara Nodemailer 7; el proyecto solo habilita CredentialsProvider y `npm ci` usa `--legacy-peer-deps`. Revisar antes de habilitar EmailProvider.                                |
| CN-007          | Sharp se actualizó a `0.35.5`; `npm audit` cubre el lock completo. No se probó el despliegue ni una matriz de archivos de imagen contra producción.                                                                                                                                                                      |
| CN-009          | Puerto SMTP y opciones TLS tienen validación y pruebas para 465/587/25 y entradas inválidas. El proveedor/puerto real no se volvió a consultar en esta tarea.                                                                                                                                                            |
| CN-010          | GET del webhook no retorna el secreto; rotar lo devuelve una sola vez, con `no-store`, fuera de la URL. El receptor mantiene `?secret=` por compatibilidad, además del header.                                                                                                                                           |
| CN-011          | En producción CSP ya no incluye `unsafe-eval`; se añadieron `object-src 'none'`, `base-uri 'self'` y `form-action 'self'`. `unsafe-inline` permanece para scripts de Next.js: falta una prueba de navegador para migrar a nonce/hash sin romper renderizado.                                                             |
| CN-012 / CN-013 | Auth no registra email/ID ni el objeto de error; la importación devuelve mensajes genéricos por fila. `.gitignore` cubre env files, credenciales y keystores.                                                                                                                                                            |
| CAL-001         | Orden nueva, tabla/fila y formulario de inventario quedaron divididos en componentes con specs. Las fronteras API y vistas relacionadas usan enums/tipos Prisma; el barrido final no encontró `any`, `as any` ni `@ts-ignore` en `app`, `components` o `lib` de producción. Se conservan dos casts en fixtures de tests. |

La actualización a Next.js 15 también convirtió `params` y `searchParams` a promesas en páginas y
handlers dinámicos existentes. La migración Tailwind 4 conserva los tokens CRM y el CSS scoped usa
`@reference` al tema global. Se actualizaron `AGENTS.md`, `CLAUDE.md` y `README.md`.

### Verificación de la implementación

- `npm ci --legacy-peer-deps`: OK; el proceso de instalación y `npm audit` encontraron cero
  vulnerabilidades.
- `npm audit --audit-level=low`: cero vulnerabilidades.
- `npm run typecheck`: OK.
- `npm run test`: 24 archivos y 292 tests aprobados.
- `npm run build`: OK; Next compiló y generó las 76 páginas. Durante prerender intentó consultas a
  Prisma usando el URL ficticio local de CI y registró fallos de autenticación contra `127.0.0.1`;
  no se leyó ni escribió una BD real y el comando terminó con código 0.
- La CI está definida, pero aún no se verificó una ejecución en GitHub ni un preview de Vercel.
  Tampoco se ejecutó QA autenticado en navegador, `db push`, migración ni despliegue. La verificación
  local completa y los riesgos residuales quedan registrados en `REGISTRO_TRABAJO.md`. La
  implementación se publicó en la rama `security/aud001-remediation`, commit
  `0767792475f8f4efaf539ea386f6ff5c37b6c92c`; el registro compartido conserva el resultado de la
  verificación contra el remoto.
