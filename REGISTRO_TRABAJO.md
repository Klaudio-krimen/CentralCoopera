# Coopera Pro — registro compartido de trabajo

Documento de coordinación entre **Codex, Claude y el usuario**. Se mantiene en la raíz del
repositorio para que ambos agentes puedan leerlo desde el mismo workspace o desde GitHub.
Registra trabajo local, revisiones, decisiones, cambios de código, verificaciones, commits,
PR y despliegues. No sustituye las reglas de `AGENTS.md`, `CLAUDE.md` ni las specs.

Fechas de este registro: zona **America/Santiago**. Última actualización: **2026-10-05**.

## Protocolo de trabajo

1. **Al comenzar:** leer este registro, `AGENTS.md` y `CLAUDE.md`; revisar `git status`, rama,
   último commit y diferencias locales. Consultar el remoto con `git fetch` cuando corresponda;
   no hacer `pull`, `reset`, `stash` ni sobrescribir archivos con trabajo ajeno automáticamente.
2. **Antes de editar:** crear o tomar una tarea con ID estable, responsable, estado, rama y
   archivos previstos. Una propuesta en el backlog no implica autorización para implementarla.
3. **Trabajo simultáneo:** evitar editar los mismos archivos. Si hay cruce, registrar y resolver
   el reparto antes de continuar. Usar ramas o worktrees separados cuando sean checkouts distintos;
   no cambiar la rama del workspace mientras el otro agente lo utiliza.
4. **Durante el trabajo:** actualizar avances, decisiones y cambios de alcance. Distinguir
   hallazgos del código, resultados probados en navegador y supuestos pendientes de validar.
5. **Al cerrar:** registrar resultado, archivos afectados, comandos ejecutados y sus resultados,
   pendientes y referencia de commit/PR. Toda tarea debe pasar `typecheck`, tests y build para
   marcarse terminada. Si falla una compuerta, anotar el error y dejar la tarea abierta.
6. **Git:** incluir solo archivos de la tarea y comprobar el diff antes de commitear. Distinguir
   implementación local, commit, push y despliegue; no afirmar publicación ni despliegue sin
   verificarlo. Anotar rama, commit/PR cuando existan o el motivo de publicación pendiente.
7. **Historial:** conservar entradas anteriores; agregar correcciones con fecha, sin borrar
   decisiones ya registradas. Releer el documento antes de guardarlo para incorporar cambios
   del otro agente. Si ocurre un conflicto, conservar las entradas de ambos.
8. **Confidencialidad:** registrar nombres de variables y referencias técnicas, nunca valores
   secretos, cuentas bancarias, respaldos ni datos personales de clientes o trabajadores.

Estados: `PROPUESTA`, `EN CURSO`, `EN REVISIÓN`, `BLOQUEADA`, `TERMINADA`, `CANCELADA`.
Usar `BLOQUEADA` solo para un impedimento concreto y describir qué falta.

## Estado de referencia

Snapshot revisado el 2026-10-04; verificarlo nuevamente al iniciar otra sesión.

| Asunto                      | Estado observado                                                                  |
| --------------------------- | --------------------------------------------------------------------------------- |
| Workspace                   | `C:\dev\CentralCoopera`                                                           |
| Repositorio                 | [Klaudio-krimen/CentralCoopera](https://github.com/Klaudio-krimen/CentralCoopera) |
| Rama al iniciar             | `master`                                                                          |
| Commit base revisado        | `7a70dbb` — paso 12, vista de llamadas y navegación                               |
| Remoto al revisar           | `HEAD` y `origin/master` sin diferencias después de `git fetch origin`            |
| Módulos presentes en código | Operaciones, Inventario, CRM y Finanzas                                           |
| Radar Pallets               | 12 tareas marcadas `done`; no se verificó la importación en la BD                 |
| Outreach actual             | SMTP vía `nodemailer`, host SiteGround; Hostinger en evaluación (ver DOC-002)     |
| Validación técnica inicial  | Typecheck OK; 22 archivos de tests, 281 tests OK; build OK                        |
| Validación de interfaz      | Revisión estática; pendiente recorrido autenticado en navegador                   |

**Cambios locales preexistentes, fuera de las tareas de Codex de esta sesión:**

- `blueprints/importacion-radar-pallets/blueprint.md`.
- `blueprints/importacion-radar-pallets/workspace/.claude/settings.json`.

Autor y propósito no confirmados. Preservarlos; no incluirlos en commits de otras tareas.

## Tareas compartidas

| ID        | Tarea                                                               | Prioridad | Responsable | Estado      | Rama / alcance previsto                                                                                               |
| --------- | ------------------------------------------------------------------- | --------- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| COORD-001 | Crear registro y enlazar las instrucciones de ambos agentes         | Alta      | Codex       | TERMINADA   | `master`; este documento, `AGENTS.md`, `CLAUDE.md`                                                                    |
| REV-001   | Familiarización con arquitectura, módulos y Git                     | Alta      | Codex       | TERMINADA   | Revisión sobre `7a70dbb`; sin cambios de código                                                                       |
| REV-002   | Revisión de interfaz con `emil-design-eng`                          | Alta      | Codex       | TERMINADA   | Revisión estática sobre `7a70dbb`; sin cambios de código                                                              |
| UX-001    | Navegación adaptable del panel administrativo                       | Alta      | Codex       | TERMINADA   | `components/ui/AdminSidebar.tsx`, `app/(admin)/layout.tsx`                                                            |
| UX-002    | Diálogos de usuarios/inventario y scroll CRM (primera fase)         | Alta      | Codex       | TERMINADA   | Modal compartido, dos formularios, diálogo CRM y specs                                                                |
| UX-003    | Permitir zoom y mejorar contraste de botones                        | Alta      | Codex       | TERMINADA   | `app/layout.tsx`, `app/globals.css`                                                                                   |
| UX-004    | Corregir y anunciar la sección activa del menú                      | Media     | Codex       | TERMINADA   | `components/ui/AdminSidebar.tsx`                                                                                      |
| UX-005    | Enlaces accesibles en lista de llamadas                             | Media     | Claude      | TERMINADA   | `master`; `components/crm/ListaLlamadas.tsx` y su spec                                                                |
| UX-006    | Mantener tamaño y foco del selector durante guardado                | Media     | Claude      | TERMINADA   | `master`; `components/crm/CallStatusSelect.tsx` y su spec                                                             |
| UX-007    | Movimiento reducido y animación según frecuencia de uso             | Media     | Sin asignar | PROPUESTA   | CSS, dashboard y nueva orden del chofer, primitivas de UI                                                             |
| UX-008    | Sustituir transiciones generales por propiedades explícitas         | Baja      | Sin asignar | PROPUESTA   | Botones, formularios y navegación                                                                                     |
| DOC-001   | Actualizar afirmaciones antiguas de la documentación                | Media     | Claude      | TERMINADA   | `master`; `README.md`, `CLAUDE.md`, `PROSPECCION_OUTREACH.md`, `ARQUITECTURA.md`, `PRODUCT.md`                        |
| UX-009    | Migrar los demás modales manuales al diálogo compartido             | Media     | Sin asignar | PROPUESTA   | Otros formularios de Operaciones/Inventario; asignar archivos antes de editar                                         |
| DOC-002   | Alinear documentos con el proveedor de correo real                  | Baja      | Sin asignar | PROPUESTA   | Esperar decisión Hostinger/SiteGround; `PROSPECCION_OUTREACH.md`, `VARIABLES_ENTORNO.md`, specs                       |
| AUD-001   | Auditoría de seguridad (Cyber Neo), POO y código limpio; solo plan  | Alta      | Codex       | TERMINADA   | Revisión de solo lectura sobre `43a0827`; [informe y plan](docs/auditorias/AUD-001-seguridad-y-calidad-2026-10-04.md) |
| SEC-001   | Corregir dependencias críticas/altas y actualizar Next.js           | Alta      | Codex       | EN REVISIÓN | Código/CI9d validados; Preview y Production READY. Nuevas ejecuciones GitHub en cola; seguimiento DEP-001             |
| SEC-002   | Cerrar brechas de autorización en APIs operativas                   | Alta      | Codex       | TERMINADA   | Órdenes, evidencias y empresas; matriz por rol/módulo/estado y specs                                                  |
| SEC-003   | Hacer atómico el rate limit de autenticación                        | Alta      | Codex       | TERMINADA   | `lib/finanzas/rate-limit.ts`; incremento atómico y prueba de concurrencia                                             |
| SEC-004   | Exigir STARTTLS en SMTP                                             | Media     | Codex       | TERMINADA   | `lib/outreach/smtp.ts`; puertos y TLS validados con pruebas                                                           |
| SEC-005   | Endurecer webhook, CSP, logs, errores y exclusiones                 | Media     | Codex       | EN REVISIÓN | Implementado; revisar `unsafe-inline` y retirar `?secret=` tras migrar integraciones                                  |
| CAL-001   | Modularizar pantallas grandes y reducir casts inseguros             | Media     | Codex       | TERMINADA   | Nueva orden, inventario y fronteras API/vistas con tipos                                                              |
| INV-001   | Agregar categoría EPP y clasificar artículos de protección personal | Alta      | Codex       | TERMINADA   | Schema y backfill aplicados con respaldo: 22 artículos EPP; cero pendientes. Ver INVENTARIO_EPP.md                    |
| AUD-002   | Anexo AUD-001: verificación extra y plan de login y logo            | Alta      | Claude      | TERMINADA   | Solo lectura sobre `cb4e043`; `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md`                                    |
| SEC-006   | No devolver Supplier completo (bankAccountEnc) en transacciones     | Alta      | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2                                                               |
| SEC-007   | Serializar el visor de auditoría de Finanzas                        | Media     | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2; decisión del usuario                                         |
| SEC-008   | Movimientos de stock atómicos (lost update)                         | Media     | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2                                                               |
| SEC-009   | Canje único del token de recuperación                               | Baja      | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2                                                               |
| SEC-010   | Revocar sesiones al cambiar contraseña                              | Media     | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2; requiere `db push` con respaldo                              |
| SEC-011   | CSV tab/CR, porteros por método y authTagLength (SEC-011..013)      | Baja      | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2                                                               |
| LOGIN-001 | Casilla «Mantener sesión iniciada» en el login                      | Media     | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §3; depende de SEC-010                                           |
| BRAND-001 | Logo de Coopera Pro en lugar del ícono de reciclaje                 | Media     | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §4                                                               |
| PWA-001   | Crear el manifest declarado en el layout (hoy 404)                  | Baja      | Codex       | TERMINADA   | `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` §2                                                               |

| UX-010 | Corregir cascada del reset Tailwind4 y recarga ESM | Alta | Codex | TERMINADA | app/globals.css, tailwind.config.ts y QA de login/cabeceras |

| DEP-001 | Publicar mejoras en producción y verificar dominio real | Alta | Codex | TERMINADA | master b935b9d; Vercel READY, evidencia docs/qa/DEP-001.md |

## Historial de sesiones y entregas

### 2026-10-04 — REV-001 — Codex

- **Solicitud:** conocer el ERP y prepararse para trabajar en local y en el repositorio.
- **Revisión:** instrucciones, esquema Prisma, autenticación, permisos, rutas, scripts, documentos
  de GPS/outreach, configuración y estado Git. Remoto actualizado mediante `git fetch origin`.
- **Resultado:** cuatro módulos implementados; proyecto Next.js 14/TypeScript/Prisma/PostgreSQL;
  GPS gobernado por turnos y permisos financieros explícitos, sin bypass de ADMIN.
- **Verificación:** `npm run typecheck`, `npm run test` y `npm run build` pasaron;
  22 archivos de tests, 281 tests. Variables requeridas por Prisma cargadas en el proceso
  desde `.env.local`, sin imprimir valores.
- **Entrega:** revisión en conversación; sin commit, push, despliegue ni cambios de esquema.

### 2026-10-04 — REV-002 — Codex

- **Solicitud:** aplicar `emil-design-eng` para revisar el proyecto.
- **Skill:** `C:\Users\krmlo\.agents\skills\emil-design-eng\SKILL.md`.
  El archivo pertenece al entorno local; su disponibilidad en otros equipos no está garantizada.
- **Alcance:** layouts, estilos globales, navegación, modales, tablas, selectores y animaciones.
  Revisión estática; no se verificaron flujos autenticados, dispositivos ni lectores de pantalla.
- **Hallazgos y propuestas:**

| Before                                                                                      | After propuesto                                                | Why                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Sidebar oculto debajo de 1024 px sin alternativa en el layout administrativo                | Menú adaptable, selector de módulos y cierre de sesión         | Restablecer navegación en pantallas pequeñas       |
| Modales de usuarios/inventario con portales manuales sin gestión completa de foco ni Escape | Diálogo compartido con semántica, foco y retorno al disparador | Operación accesible con teclado                    |
| DialogContent sin límite de altura ni scroll vertical                                       | Altura limitada al viewport y scroll interno                   | Mantener acciones accesibles en formularios largos |
| `maximumScale: 1` en viewport                                                               | Permitir zoom                                                  | Facilitar lectura ampliada                         |
| Blanco sobre `emerald-500`: contraste calculado 2,54:1                                      | Evaluar `emerald-700`: 5,48:1                                  | Mejorar legibilidad de botones                     |
| `startsWith` marca Resumen en todas las subsecciones financieras                            | Igualdad para Resumen y `aria-current`                         | Ubicación inequívoca en el menú                    |
| Filas de llamadas navegan solo con onClick                                                  | Enlace real en nombre de empresa                               | Teclado y apertura en otra pestaña                 |
| Selector de 150 px sustituido por spinner de 14 px al guardar                               | Conservar control, ancho, foco y anunciar guardado             | Evitar desplazamientos y pérdida de contexto       |
| Sin adaptación encontrada a movimiento reducido; fade-up de 450 ms en uso frecuente         | Reducir movimiento y entradas decorativas frecuentes           | Comodidad y respuesta inmediata                    |
| Uso extendido de `transition-all`                                                           | Propiedades explícitas y duraciones por interacción            | Evitar animación accidental                        |

- **Criterio de diseño:** conservar Geist, números tabulares, etiquetas de estado y primitivas
  Base UI. Mantener Finanzas sobrio, con los permisos vigentes y sin animar orden/filtros de tablas.
- **Verificación:** se ejecutó nuevamente el portón: typecheck OK, 281 tests OK y build OK.
- **Entrega:** recomendaciones en conversación, incorporadas ahora a este registro;
  no implementadas. Cambios locales preexistentes conservados.

### 2026-10-04 — COORD-001 — Codex

- **Solicitud:** mantener un documento que Codex y Claude puedan revisar para coordinar todo
  trabajo local y del repositorio.
- **Archivos:** `REGISTRO_TRABAJO.md`, `AGENTS.md`, `CLAUDE.md`.
- **Cambios:** protocolo común, responsables y estados, backlog de revisión, historial inicial
  y enlaces desde las instrucciones de ambos agentes.
- **Decisión:** separar revisiones terminadas de propuestas pendientes; el registro documenta
  el trabajo y no autoriza por sí mismo la implementación del backlog.
- **Verificación:** typecheck OK; 22 archivos de tests, 281 tests OK; build OK.
- **Entrega Git:** [commit `d1c4dd8`](https://github.com/Klaudio-krimen/CentralCoopera/commit/d1c4dd83baae506eb07f81275d9ee486db25f8c9),
  publicado en `origin/master`; `git ls-remote origin refs/heads/master` confirmó ese hash.
  Incluye únicamente los tres documentos de esta tarea. El commit posterior que contiene este
  cierre se identifica con `git log -1 -- REGISTRO_TRABAJO.md`.
- **Despliegue / BD:** sin despliegue manual ni cambios de esquema; estado de Vercel no verificado.

### 2026-10-04 — UX-001 / UX-002 / UX-003 / UX-004 — Codex

- **Solicitud:** usuario autoriza comenzar las mejoras de código recomendadas.
- **Responsable / rama / base:** Codex, `master`, `364e63a`.
- **Alcance:** menú administrativo móvil, navegación activa, modal compartido accesible para
  NuevoUsuarioModal e ItemFormModal, scroll del diálogo CRM, zoom y contraste de botones base.
- **Archivos previstos:** AdminSidebar y su spec, Modal y su spec, modales de usuarios/inventario
  y sus specs, diálogo CRM y su spec, layouts global/administrativo, app/globals.css y este registro.
- **Límites:** otros modales manuales se registrarán como una continuación; no se cambia middleware,
  permisos, endpoints ni BD. Cambios preexistentes de blueprints conservados.
- **Implementación:** menú móvil y escritorio comparten enlaces y permisos; módulos como enlaces
  y sección activa anunciada. Se elimina el doble resaltado de Finanzas y se prueba la lógica pura
  en `lib/navigation.test.ts`. Modal compartido Base UI: captura/retorno de foco, Escape, scroll,
  etiquetas de campos y guardado que impide cierre. Texto auxiliar y errores con contraste mejorado.
  Zoom habilitado; botones base con contraste mayor, foco visible y transiciones explícitas.
- **QA en navegador:** skill `agent-browser`, Chromium aislado, servidor local y pantalla temporal
  con componentes reales/datos ficticios. Probados 320x568, 390x600, 390x844 y 1440x900; sin
  overflow horizontal. Menú cierra al navegar y pasar a escritorio; Escape devuelve foco.
  Permisos visuales: ADMIN sin Finanzas, ADMIN con FINANZAS_LECTURA y VENTAS solo CRM.
  Inventario conserva ancho de 512 px en escritorio y scroll en viewport pequeño. Movimiento
  reducido verificado en drawer, modal compartido y diálogo CRM; acción final accesible con foco.
  POST simulado en navegador: una petición, cierre bloqueado durante guardado, error anunciado,
  datos conservados y reintento disponible. Sin escritura real de usuarios/inventario.
- **Accesibilidad automática:** axe sin incidencias en los subárboles revisados de navegación,
  modal de inventario y modal de usuario (incluido error simulado), después de corregir contraste.
  No equivale a validación con lector de pantalla físico ni prueba de todos los flujos autenticados.
- **Limpieza:** pantalla temporal retirada antes del build; browser y servidor QA propios cerrados.
- **Verificación final:** `npm run typecheck`, `npm run test` y `npm run build` OK;
  23 archivos, 284 tests. Build final sin advertencias de las curvas CSS añadidas.
- **Entrega Git:** [commit `c48df7a`](https://github.com/Klaudio-krimen/CentralCoopera/commit/c48df7ae023ae35fb4cdc620f16a96a87e279d5d),
  publicado en `origin/master`; hash confirmado con `git ls-remote`. Incluye únicamente los 17
  archivos de esta tanda. El commit posterior de cierre documental se identifica con
  `git log -1 -- REGISTRO_TRABAJO.md`.
- **Continuación:** UX-009 recoge los demás modales. UX-007, UX-008 y DOC-002 siguen como
  propuestas pendientes; esta entrega no implica que se hayan implementado.
- **Despliegue / BD:** sin operaciones de esquema ni despliegue manual; estado Vercel no verificado.

### 2026-10-04 — UX-005 / UX-006 / DOC-001 — Claude

- **Solicitud:** el usuario autoriza tomar las tres tareas propuestas tras releer el registro.
- **Responsable / rama / base:** Claude, `master`, `894d249`.
- **Archivos afectados:** `components/crm/ListaLlamadas.tsx` (+ spec nueva, no existía),
  `components/crm/CallStatusSelect.tsx` y su spec; `README.md`, `CLAUDE.md`, `ARQUITECTURA.md`,
  `PRODUCT.md`, `PROSPECCION_OUTREACH.md`; este registro.
- **UX-005:** el nombre de la empresa es un `<Link>` real a la ficha (teclado, clic medio, otra
  pestaña); el `onClick` de la fila se conserva como atajo de mouse y el enlace hace
  `stopPropagation` para evitar un doble push. Búsqueda con `aria-label`; filtros en
  `role="group"` con `aria-pressed`.
- **UX-006:** el `<Select>` ya no se desmonta al guardar: queda con `readOnly` (conserva foco y
  ancho de 150 px), el spinner reemplaza al chevron, `role="status"` anuncia el guardado y el
  trigger lleva `aria-label` y `aria-busy`. Un segundo cambio durante el guardado se ignora.
  `readOnly` se comprobó leyendo el código de Base UI (bloquea apertura y selección, no pone
  `disabled`); **no** se probó en navegador.
- **DOC-001:** corregido lo que el código contradice: Graph → SMTP/Hostinger (`CLAUDE.md` §7 y
  texto de la iniciativa, comentario de `messageId`), estado de `PROSPECCION_OUTREACH.md`
  («sin implementar» → implementado en código), SQLite y `/public/uploads` → Postgres y Vercel
  Blob (`README.md`, `ARQUITECTURA.md`), roles `VENTAS`/`BODEGA`, Finanzas como cuarto módulo
  sin bypass de ADMIN (`README.md`, `CLAUDE.md` §1, `PRODUCT.md`, `ARQUITECTURA.md`). Se reescribió
  `README.md`: su sección «Cómo empezar (para Claude Code)» pedía construir lo que ya existe.
- **Hallazgos sin resolver:** `ESQUEMA_BASE_DATOS.md`, `ESPECIFICACION_API.md` y
  `FLUJOS_DE_USUARIO.md` solo describen Operaciones (enum `CHOFER RECEPCION ADMIN`); quedan
  señalados en el README, no reescritos. `PROSPECCION_OUTREACH.md` §11 cita el host SMTP
  `gtxm1185.siteground.biz` mientras todo el texto dice Hostinger. El uso de Outlook en
  `PROSPECCION_OUTREACH.md` §1 se dejó: describe el trabajo humano, no el mecanismo de envío.
- **Respuestas del usuario (2026-10-04):** (1) la compra de Hostinger está en evaluación, sin
  decidir; hoy el host SMTP es SiteGround. Se corrigieron solo las dos frases nuevas de
  `CLAUDE.md` para no afirmar proveedor; las menciones antiguas a Hostinger quedan en DOC-002.
  (2) Los tres documentos que solo cubren Operaciones no se reescriben salvo necesidad.
  (3) El usuario probó UX-005/UX-006 en navegador: funcionan bien. (4) Autoriza el commit.
- **Formato:** `README.md`, `ARQUITECTURA.md` y `REGISTRO_TRABAJO.md` pasaron por prettier; los dos
  primeros no estaban formateados antes, por eso el diff es mayor que el cambio de contenido (el
  hook de pre-commit lo habría hecho igual).
- **Verificación:** `npm run typecheck` OK; `npm run test` 23 archivos, 284 tests OK;
  `npm run build` OK. Prueba en navegador de UX-005/UX-006 hecha por el usuario, sin
  incidencias; Claude no ejecutó QA de navegador.
- **Entrega Git:** commit local en `master` con los archivos de esta tarea; se identifica con
  `git log -1 -- components/crm/ListaLlamadas.spec.md`. **Sin push** (no solicitado). Los dos
  archivos de `blueprints/` preexistentes siguen sin tocar y quedaron fuera del commit.
- **Despliegue / BD:** no aplica; sin cambios de esquema ni despliegue.
- **Pendientes / siguiente responsable:** push a `origin/master` cuando el usuario lo autorice;
  DOC-002 (proveedor de correo) queda como propuesta sin asignar.

### 2026-10-04 — AUD-001 — Codex

- **Solicitud y continuidad:** actualizar el estado de Claude y completar su auditoría Cyber Neo,
  POO y código limpio, manteniendo la revisión en modo de solo lectura sobre la base `43a0827`.
- **Revisión:** SCA con `npm audit`, SAST estático de 375 archivos/52 handlers API, escaneo de
  secretos, configuración/infraestructura y supply chain/CI. No se ejecutó la aplicación ni se
  inspeccionó producción. La auditoría identificó dependencias con avisos críticos/altos, brechas
  de autorización en órdenes/evidencias y debilidades adicionales de rate limit y SMTP; no confirmó
  secretos reales versionados. El detalle, evidencia, condiciones y límites están en
  `docs/auditorias/AUD-001-seguridad-y-calidad-2026-10-04.md`.
- **Calidad/POO:** TypeScript tiene `strict: true`; se propone modularizar tres pantallas extensas,
  reducir gradualmente 86 usos de `any`/casts/supresiones y mantener las reglas puras. No se
  recomienda convertir componentes funcionales a clases sin una necesidad de estado/ciclo de vida.
- **Cambios:** informe y plan compartidos en `docs/`; no se editó código, dependencias ni esquema.
  Los archivos locales de blueprint de terceros se conservaron fuera de esta tarea.
- **Verificación:** `check_lockfiles.py` sin hallazgos; escáner de secretos con cinco falsos
  positivos versionados revisados y cero exposiciones reales confirmadas; `npm audit` termina con
  hallazgos (1 crítico, 20 altos, 3 moderados, 1 bajo). Typecheck, tests y build no aplican a esta
  auditoría read-only y no se ejecutaron.
- **Entrega Git:** commit `d38ae93` (`docs: cerrar auditoria de seguridad AUD-001`) publicado en
  `origin/master`; `git fetch` y `git ls-remote` confirmaron el hash completo
  `d38ae93a635e47959fceec5bd68bb5d35f960448`. Solo incluye informe y registro; los blueprints
  locales quedaron fuera.
- **Despliegue / BD:** no aplica; configuración efectiva de Vercel y base de datos no verificada.
- **Siguiente paso:** priorizar SEC-001 a SEC-003 antes de CAL-001; SEC-004/SEC-005 quedan como
  hardening propuesto. Las tareas de implementación continúan sin asignar.

### 2026-10-04 - SEC-001..SEC-005 / CAL-001 - Codex

- **Solicitud:** el usuario autorizo implementar todos los hallazgos y mejoras propuestos en
  AUD-001, continuando el trabajo local y dejando trazabilidad para Claude.
- **Responsable / rama / base:** Codex, `security/aud001-remediation`, `fff720c`.
- **Alcance registrado antes de editar codigo:** dependencias y compuerta de CI; autorizacion de
  ordenes/evidencias/empresas; rate limit concurrente; STARTTLS; webhook, CSP, logs, errores y
  exclusiones; refactor de las tres pantallas extensas y reduccion inicial de casts inseguros.
- **Archivos previstos:** `package.json`, `package-lock.json`, `.github/workflows/ci.yml`,
  `app/api/ordenes/**`, `app/api/evidencias/**`, `app/api/empresas/**`,
  `lib/finanzas/rate-limit.*`, `lib/outreach/smtp.*`, `app/api/configuracion/webhook/**`,
  `app/api/webhooks/leads/**`, `components/crm/WebhookSettings.*`, `next.config.mjs`, `.gitignore`,
  `app/api/contactos/import/**`, `lib/auth.ts`,
  `app/(chofer)/chofer/nueva-orden/page.tsx`, `components/inventario/TablaInventario.tsx`,
  `components/inventario/ItemFormModal.tsx`, sus specs pertinentes, el informe AUD-001 y este
  registro.
- **Alcance ampliado tras el primer build:** Next.js 15 vuelve asincronos `params` y
  `searchParams` de paginas y handlers dinamicos; adaptar los puntos existentes en CRM,
  Operaciones, Inventario y Finanzas. Tailwind 4 requiere referencia al CSS global para el CSS
  scoped del CRM. Se incluira el ajuste `target` generado por Next en `tsconfig.json` si se
  confirma necesario.
- **Archivos adicionales previstos:** `app/**/[id]/**`, `app/api/finanzas/**`,
  `app/api/inventario/[id]/route.ts`, rutas/paginas dinamicas existentes de CRM, Operaciones y
  Finanzas, `app/globals.css`, `app/(admin)/admin/crm/crm.css`, `postcss.config.js` y
  `tsconfig.json`.
- **Decisiones iniciales:** mantener acceso CRM de VENTAS al listado de empresas, bajo su
  portero de modulo; conservar que el receptor acepte `x-webhook-secret` y `?secret=` para no
  romper integraciones existentes, pero dejar de emitir secretos dentro de URLs generadas.
  No acceder a valores de `.env.local`, no ejecutar cambios de esquema/BD y no desplegar.
- **Verificacion prevista:** pruebas nuevas de permisos y concurrencia junto al porton
  `npm run typecheck && npm run test && npm run build`; repetir `npm audit` tras actualizar el lock.
- **Estado:** implementacion iniciada. Los archivos locales de `blueprints/` observados al inicio
  no pertenecen a esta tarea y quedan fuera de cualquier commit.

#### Ampliación CAL-001 — tipado de producción

- Antes de ampliar el alcance se actualiza esta entrada: además de las tres pantallas registradas,
  revisar y tipar los usos de `any`/casts/supresiones en handlers y vistas de producción de
  Operaciones, CRM, usuarios, autenticación y reportes. Fixtures de tests quedan fuera salvo que
  bloqueen un tipo de producción. El propósito es cerrar fronteras de datos con tipos de Prisma,
  enums validados y `unknown` en errores, sin cambiar contratos de API ni comportamiento visual.
- Archivos adicionales previstos: `lib/auth.ts`, handlers de `contactos`, `discrepancias`,
  `posiciones`, `reportes`, `usuarios`, `webhooks/leads` y vistas relacionadas de órdenes,
  discrepancias, choferes y CRM. Revisar cada cambio con typecheck, tests y build.

#### Cierre de implementación — 2026-10-04

- **Cambios completados:** se implementó el alcance de SEC-001..SEC-005 y CAL-001 descrito en el
  informe AUD-001. También se corrigió el selector de empresas para que CHOFER solo pueda
  consultar empresas activas, aunque solicite `active=false`.
- **Verificación:** `npm ci --legacy-peer-deps`, `npm audit --audit-level=low`,
  `npm run typecheck`, `npm run test` (24 archivos, 292 pruebas), `npm run build` (76 páginas) y
  `git diff --check` completaron sin fallos. El build usó URL ficticia local; el intento de
  conexión Prisma a `127.0.0.1` falló durante prerender, pero Next generó las páginas y terminó
  con código 0. No se usó una BD real.
- **Límites de verificación:** no se ejecutó CI en GitHub, preview de Vercel ni QA autenticado de
  navegador. No se hizo `db push`, migración ni despliegue.
- **Riesgos residuales:** CSP conserva `unsafe-inline` hasta probar nonce/hash en navegador; el
  receptor de webhook conserva `?secret=` por compatibilidad; `eslint-config-next` permanece en
  14.2.35 por la cadena vulnerable transitiva del 15 y Next runtime está en 15.5.27. La CI usa
  `npm ci --legacy-peer-deps` por el peer opcional de Nodemailer de NextAuth 4.
- **Colaboración:** las modificaciones preexistentes de Claude en `blueprints/` se preservan y
  quedan fuera de los commits de esta tarea.
- **Entrega Git:** implementación en commit `0767792475f8f4efaf539ea386f6ff5c37b6c92c`
  (`security: remediate AUD-001 findings`), publicada en
  `origin/security/aud001-remediation`. `git ls-remote` confirmó ese mismo hash en el remoto.
  El hook de precommit repitió typecheck y las 292 pruebas; ambos pasaron. No se abrió PR ni se
  mezcló con `main`/`master`.

### 2026-10-04 — INV-001 — Codex

- **Solicitud:** agregar `EPP — Elementos de Protección Personal` al Inventario y clasificar allí
  antiparras, ropa reflectante, tapones auditivos, cascos, zapatos de seguridad y artículos afines.
- **Responsable / rama / base:** Codex, `security/aud001-remediation`, HEAD al iniciar
  `bd0ccca3c79c5892d130986cb209939e94befe05`.
- **Archivos previstos:** `prisma/schema.prisma`, `prisma/schema.spec.md`,
  `components/inventario/types.ts`, formulario/listado/importación, rutas API de inventario,
  `lib/inventario/category.ts` y su prueba, script de backfill opcional con modo dry-run, y este
  registro compartido.
- **Decisión inicial:** asignar EPP por nombre validado en servidor tanto en altas como en cambios e
  importaciones; conservar cantidades y demás datos existentes. No ejecutar `db push` ni tocar la
  base de datos sin el respaldo verificado que exige AGENTS.md.
- **Estado:** en curso; revisar posibles artículos existentes y documentar el procedimiento seguro
  de actualización de esquema y clasificación de datos.

#### Cierre de implementación INV-001

- **Cambios completados:** se agregó `EPP` al enum de inventario; filtros, formulario, importación,
  tabla, exportación CSV y APIs aceptan la categoría. El servidor fuerza EPP por nombre para altas,
  cambios e importaciones; la importación conserva también las categorías legibles exportadas. El
  formulario incluye sugerencias para antiparras, cascos, protección auditiva, ropa reflectante,
  calzado de seguridad, guantes, respiradores y otros EPP frecuentes.
- **Clasificación de filas existentes:** se agregó `scripts/backfill-epp-inventario.ts`, que por
  defecto sólo lista coincidencias y sólo actualiza con `--apply`. No se inspeccionó la base real ni
  se ejecutó el backfill.
- **Documentación:** catálogo y procedimiento en `INVENTARIO_EPP.md`; reglas de esquema, APIs,
  formulario y backfill en sus `*.spec.md`.
- **Verificación:** Prisma `validate` y `generate` OK (URL ficticia, sin conexión a BD);
  `npm run typecheck` OK; `npm run test` OK (25 archivos, 315 pruebas); `npm run build` OK (76
  páginas); `git diff --check` OK. El build prerenderizó contra la URL ficticia y registró errores
  de autenticación Prisma en `127.0.0.1`, sin impedir la compilación ni tocar una base real.
- **Pendiente de base de datos:** antes de `npm run db:push`, crear y verificar respaldo según
  `AGENTS.md`; luego revisar `npm run backfill:epp-inventario -- --dry-run` y aplicar sólo tras
  confirmar sus coincidencias con `npm run backfill:epp-inventario -- --apply`. No se crearon ítems
  ni se inventaron cantidades.
- **Entrega Git:** commit `a93e7e0c1ea550128520352817c0f5cc17c7439c`
  (`feat: add EPP inventory category`) publicado en
  `origin/security/aud001-remediation`; `git ls-remote` confirmó el mismo hash. Los dos cambios
  previos de Claude en `blueprints/` continúan preservados y fuera de staging.

### 2026-10-05 — AUD-002 — Claude

- **Solicitud:** ponerse al día tras el trabajo de Codex; dejar listo para Codex el plan de los
  hallazgos pendientes, una casilla «recordar contraseña» en el login y el logo de Coopera Pro en
  lugar del ícono de reciclaje.
- **Responsable / rama / base:** Claude, worktree `C:\dev\CentralCoopera-claude`, rama
  `claude/aud001-anexo` creada desde `origin/security/aud001-remediation` @ `cb4e043`, para no
  editar la rama que Codex tiene abierta en `C:\dev\CentralCoopera`.
- **Archivos:** `docs/auditorias/AUD-001-anexo-claude-2026-10-05.md` (nuevo) y este registro.
  Sin cambios de código, dependencias, esquema ni BD.
- **Verificación:** se reconfirmaron a mano en `cb4e043` los hallazgos de un barrido multiagente
  que quedó incompleto por límite de sesión. Confirmados: SEC-006..SEC-013 y PWA-001. Descartados:
  sesión de usuario desactivado (el `jwt` revalida en BD), hash de contraseña en el log de
  auditoría (`withAudit` redacta) y `OrderCounter` no atómico (ya va en transacción). El resto de
  candidatos de POO y código limpio de ese barrido no se reverificó y no se convierte en tareas;
  CAL-001 de Codex cubre la parte principal.
- **Corrección al informe AUD-001:** la afirmación «Finanzas excluye `bankAccountEnc` del
  serializado» no vale para `GET /api/finanzas/transacciones` (ver SEC-006).
- **Corrección al registro:** los dos cambios locales de `blueprints/importacion-radar-pallets/`
  **no** son de Claude; ya estaban antes de la primera sesión de Claude (2026-10-04) y su autor
  sigue sin confirmar.
- **Typecheck/tests/build:** no aplican (solo documentación).
- **Entrega Git:** commit en la rama local `claude/aud001-anexo`, sin push (el usuario no lo pidió);
  la rama es visible desde el repositorio local compartido. Al integrar, aplicar sobre
  `security/aud001-remediation`; si el registro de esa rama cambió entretanto, conservar las
  entradas de ambos.
- **Siguiente responsable:** Codex, empezando por SEC-006. Las decisiones del usuario están listadas
  en el §5 del anexo.
- **Decisiones (2026-10-05):** el usuario aprobó todas las recomendaciones; quedan fijadas en el §6
  del anexo, junto con el orden de trabajo. Codex puede implementar sin volver a consultar.

### 2026-10-05 — SEC-006..SEC-013 / BRAND-001 / PWA-001 / LOGIN-001 — Codex

- **Solicitud:** actualizar contexto y ejecutar las tareas preparadas por Claude en AUD-002.
- **Responsable / rama / base:** Codex, `security/aud001-remediation`, `503e688`; anexo y decisiones
  aprobadas ya integrados localmente. Se preservan ambos archivos ajenos de `blueprints/`.
- **Alcance registrado antes de editar:** proyecciones seguras en transacciones/export de Finanzas,
  serialización del visor de auditoría y fechas, movimientos de inventario concurrentes, CSV,
  guardia por método HTTP y cifrado GCM; canje atómico de recuperación; logo oficial y manifest;
  revocación de sesiones al cambiar contraseña y casilla de sesión recordada.
- **Archivos previstos:** APIs de Finanzas (`transacciones`, `export`, `auditoria`),
  `lib/finanzas/{serialize,routes,csv,crypto,reset}.*`, página del visor de auditoría,
  `lib/inventario/movimiento.*`, APIs de movimientos/PATCH de inventario, `lib/auth-session.*`,
  `lib/auth.ts`, `types/next-auth.d.ts`, `prisma/schema.prisma`, APIs de recuperación y usuarios,
  login y su spec, `components/ui/{BrandLogo,AdminSidebar,ChoferHeader,RecepcionNav}.*`,
  `scripts/generate-brand-assets.*`, derivados de marca, layout, manifest, package y este registro.
- **Decisiones vigentes:** aplicar §6 del anexo sin nuevas consultas; no modificar `middleware.ts`.
  Intentar producir y verificar respaldo `pg_dump` antes del cambio de BD autorizado; comprobar el
  diff de schema y no aceptar cambios destructivos o ajenos a esta tarea.
- **Verificación prevista:** pruebas puras y de regresión, gate completo, revisión visual del login
  en 320/390/1440 px y comprobación del logo/manifest. Registrar límites de QA autenticado/BD.

### 2026-10-05 — cierre AUD-002 / INV-001 / UX-010 — Codex

- **Cambios y decisiones:** SEC-006..013, LOGIN-001, BRAND-001 y PWA-001 implementadas según
  decisiones aprobadas. EPP completado en BD; UX-010 corrigió cascada del reset y recarga ESM;
  raíz resuelve rol FINANZAS con permiso explícito. Descripción y capturas en
  [QA AUD-002](docs/qa/AUD-002.md). Specs actualizadas; nuevos componentes/rutas/scripts con spec.
- **Gate final:** npm run typecheck OK, npm run test OK (29 archivos, 349 pruebas),
  npm run build OK (79 páginas), git diff --cached --check OK. Build contra PostgreSQL QA
  aislado; no consultas de prerender a datos reales. Queda aviso no bloqueante del loader ESM
  del archivo TS de Tailwind; ya no falla su recarga por require.
- **Concurrencia real:** npm run qa:security-concurrency OK; PostgreSQL18 local, 20 entradas,
  12 salidas (6 conflictos), ajustes/entradas e historial decimal, 10 canjes (un ganador).
- **HTTP real:** plazos y exp fijo; revocación por recuperación y PATCH admin; nuevos logins con
  contraseña cambiada; permisos financieros, proyecciones y privacidad API/SSR, rango inválido,
  PATCH/POST concurrentes; cinco canjes (un ganador y una auditoría), manifest200.
- **UI:** Chromium 320/390/1440 px y login autenticado ADMIN/CHOFER/RECEPCION/FINANZAS con
  fixtures; logos cargan; teclado Space, labels, alertas y localStorage vacío. Sin hardware real.
- **BD configurada:** respaldo y diff previamente anotados; schema y 22 reclasificaciones
  aplicados/verificados. Sin cambios de cantidades ni movimientos. QA sólo usa datos sintéticos.
- **Git:** código preparado para commit/push en security/aud001-remediation y PR borrador.
  Se registrarán hashes y URL al verificar publicación. Los dos archivos ajenos de blueprints
  quedan preservados, fuera de staging; middleware y secretos/respaldos también fuera del commit.
- **Despliegue:** no se mergea a master ni se despliega producción. CI remota/preview pendiente
  hasta publicar PR. SEC-001 y SEC-005 conservan sus verificaciones externas pendientes.

### 2026-10-05 — UX-010 — corrección detectada en QA del login — Codex

- **Responsable / rama:** Codex / `security/aud001-remediation`, EN CURSO.
- **Antes de editar:** `app/globals.css` y spec. El reset universal sin capa CSS vence las
  utilidades de Tailwind 4: navegador confirma padding 0 y campos de 22 px pese a `py-3`.
  Mover sólo ese reset a `@layer base` restaura espaciado y áreas táctiles previstos en toda
  la aplicación. Conservar valores y tokens existentes; verificar 320/390/1440 px y navegaciones.
- **Extensión antes de editar:** `tailwind.config.ts`: al recargar CSS, el compilador intentó
  evaluar el archivo como ESM y falló `require is not defined`. Usar import del mismo plugin
  `tailwindcss-animate`, sin cambiar dependencias ni comportamiento.

### 2026-10-05 — alcance adicional LOGIN-001 — Codex

- Al preparar QA se detectó que `/` no resolvía el rol `FINANZAS`, pese a existir en esquema y
  shell administrativo. Añadir destino financiero con `hasFinanceAccess` en `app/page.tsx` y
  su spec permite completar el login para ese rol. No se modifica middleware ni se otorga acceso
  implícito a Finanzas por rol; sigue requiriendo permiso explícito.

### 2026-10-05 — avance y validación AUD-002 / INV-001 — Codex

- **BD:** respaldo `backups/pre-aud002-2026-10-05-1791217724374.dump`, 129974 bytes;
  SHA256 `2e81d36237b24d5528a0630153f09c94f17f5011b5b4a7f3158f02ed5d4767ad`.
  `pg_restore --list` y lectura completa del archivo verificados. Respaldo excluido de Git.
  Diff previo limitado a agregar `InventoryCategory.EPP` y `User.passwordChangedAt`;
  `db push` sin aceptar pérdida de datos, diff posterior vacío y cliente regenerado.
- **INV-001:** ampliación registrada para sinónimos `AUDIFONOS TAPONES/CASCOS` en
  `lib/inventario/category.*`. Revisadas las 22 coincidencias del dry-run; backfill aplicado
  a 22 filas. Segundo dry-run: cero pendientes. Únicamente categoría y timestamp de actualización;
  no se crearon artículos ni movimientos, ni se modificaron cantidades.
- **Validación ampliada antes de editar:** añadir `scripts/verify-security-concurrency.ts` y spec,
  comando optativo de QA contra PostgreSQL local aislado. Se rechazarán URLs remotas y nombres
  ajenos a `coopera_qa_*`. Pruebas concurrentes reales de stock y canje de token.
  Revisión autenticada con usuarios sintéticos en esa misma BD, sin correos externos.
- **Specs previstas:** actualizar autenticación, login, esquema, APIs/páginas de Finanzas e
  inventario y navegación; registrar evidencia visual y resultados en `docs/qa/AUD-002.md`.

### 2026-10-05 — entrega Git AUD-002 — Codex

- **Commit de código:** 2ab57f9fe62e2cabc7a18ab63fba665877c2c0ed; hook Prettier/typecheck/
  349 pruebas también pasó. Push a origin/security/aud001-remediation confirmado con ls-remote:
  mismo hash. Sólo permanecen modificados los dos blueprints ajenos al trabajo.
- **PR borrador:** [#1](https://github.com/Klaudio-krimen/CentralCoopera/pull/1), base master;
  contiene AUD-001/AUD-002 e INV-001. Sin merge ni publicación de producción.
- **CI remota:** [ejecución del código](https://github.com/Klaudio-krimen/CentralCoopera/actions/runs/37344408041)
  completada SUCCESS sobre 2ab57f9; instalación, npm audit (nivel low), typecheck, tests y build
  pasaron. El próximo commit sólo registra esta entrega y puede generar otra ejecución de CI.
- **Vercel:** preview automático reporta FAILURE. No se pudo obtener log de compilación:
  vercel inspect responde «The specified token is not valid». La causa del fallo del deployment
  no está confirmada; requiere restaurar acceso válido a Vercel para diagnosticarlo.
  [Deployment reportado](https://vercel.com/claudio-nunezs-projects/track-residuos/9ygxvpcukorMap33ofcsTWCfnvC8).
  SEC-001 sigue EN REVISIÓN por preview pendiente. No se modifica ni se versiona la credencial.
- **QA cerrado:** navegador y servidor Next local detenidos; PostgreSQL de QA detenido. Respaldo
  de la BD configurada conservado en backups/, fuera de Git. Datos de pruebas sólo en BD temporal.
- **Siguiente revisión:** Claude puede revisar PR/QA/specs; acceso a Vercel pendiente del entorno.

### 2026-10-05 — DEP-001 — publicación de las mejoras — Codex

- **Solicitud:** publicar las mejoras en producción tras «entonces?»; continuar hasta verificar
  versión pública. Responsable Codex, rama security/aud001-remediation, base 9d32486.
- **Estado:** EN CURSO. Antes de editar: registro, configuración de despliegue si el diagnóstico
  identifica un defecto concreto, .env.example/.gitignore si hay omisiones reales y sus specs.
  No tocar datos de usuarios ni repetir db push/backfill ya verificados.
- **Estado verificado:** PR1 abierto/borrador, mergeable, CI SUCCESS para 9d32486. Último commit
  sólo incorpora los dos blueprints ajenos que ya fueron revisados y guardados por el usuario.
- **Despliegue:** preview Vercel FAILURE sin URL pública; credenciales locales inexistentes según
  vercel whoami. Se pidió al usuario completar npx vercel login, sin compartir secretos.
  Diagnosticar preview, lograr health check y luego integrar/publicar; no forzar despliegue fallido.
- **Skill:** all-deploy; proyecto Next15 existente track-residuos, sin crear otro proyecto.
  Autorización vigente para publicar; validaciones antes de la integración y producción.

### 2026-10-05 — DEP-001 — entorno y BD verificados antes de publicar

- Corrección de diagnóstico: la lista de Production no mostraba los overrides de la rama.
  Preview ya tenía DATABASE_URL/DATABASE_URL_UNPOOLED para otra BD. No se sobrescribieron.
  Se añadieron sólo DIRECT_URL (desde ese UNPOOLED) y NEXTAUTH_SECRET independiente/sensible,
  scoped a security/aud001-remediation; sin tocar variables de Production ni protección SSO.
- Production/local apuntan a la misma BD: Prisma diff vacío, campo passwordChangedAt disponible
  y 22 filas EPP. No hay migración ni backfill adicional de Production.
- Preview DB tiene exactamente dos cambios aditivos pendientes: enum EPP y User.passwordChangedAt.
  Antes de db push: respaldo pg_dump verificado, hash/lectura completa y diff limitado a esos
  cambios. Sin reclasificar filas de pruebas ni tocar datos de usuarios.
- Gate local de esta entrega: typecheck, 349 tests y build79 páginas OK contra configuración
  Production, cargada en procesos sin imprimir secretos. Config y template son los únicos cambios
  nuevos; el código de AUD-002 conserva su QA autenticado y concurrente anterior.

### 2026-10-05 — DEP-001 — Preview preparado

- Respaldo Preview: backups/pre-preview-dep001-1791232349841.dump, 130821 bytes,
  SHA256 3deb7daf4a90901a2a6f5a78cd57dcc5cbe567cb13a30d380cbc6ea5bbeb8805; lista y lectura completa pg_restore verificadas.
  db push limitado a EPP/passwordChangedAt aplicado; diff posterior vacío. Archivo fuera de Git.
- Configuración revisable: vercel.json cambia sólo installCommand a npm ci --legacy-peer-deps;
  spec y CLAUDE.md explican el peer opcional. No hay cambio de código de auth/SMTP ni downgrade.
- Validar despliegue automático del siguiente commit y health protegido usando vercel curl,
  sin desactivar protección del preview. Después publicar por integración GitHub a master.

### 2026-10-05 — DEP-001 — causa confirmada y corrección prevista

- Vercel autenticado; log de 9d32486 confirma ERESOLVE: peer opcional Nodemailer7 de
  NextAuth4 frente a Nodemailer10. CI ya instala con npm ci --legacy-peer-deps. Antes de editar:
  vercel.json/spec y CLAUDE.md: fijar el mismo installCommand, sin degradar dependencias.
- Entorno Preview carece de DATABASE_URL/DIRECT_URL/NEXTAUTH_SECRET. Configurar sólo el preview
  de esta rama con conexiones ya existentes y secreto independiente; conservar autenticación
  Vercel del preview. No modificar claves, variables ni credenciales de Production.
- Descargar env de Production únicamente en backups/ (ignorado), comparar esquema real antes
  de integrar; no repetir migraciones/backfill si el diff ya está vacío. Proyecto existente y
  dominios confirmados: intranet.cooperapro.cl y track-residuos.vercel.app.
- Producción anterior Ready: dpl_DZ4gX6XNQkh9wvMMaYGYBMrxxphn, commit fff720c.
  Referencia de reversión; no mover alias antes de preview saludable.

### 2026-10-05 — DEP-001 — preparación y auditoría

- Scope registrado: añadir `.env.example` sin valores reales; el auditor detectó su ausencia.
  Incluye claves detectadas y SMTP_HOST/USER/PASSWORD recibidas mediante configuración dinámica.
  No cambia variables remotas, claves de cifrado ni passwords. El único dirty era este registro;
  se commiteará antes de desplegar. Avisos Python (`.venv`, `__pycache__`) no aplican al servidor
  Next.js y no bloquean. Auditor ejecutado completo en Windows resolviendo npm a npm.cmd,
  sin desactivar ninguna comprobación. CI completa sobre 9d32486 ya verificada SUCCESS.

### 2026-10-05 — DEP-001 — publicación verificada (Codex)

- **Estado:** TERMINADA. Antes de guardar evidencia: docs/qa/DEP-001.md y capturas públicas
  docs/qa/DEP-001/; únicamente pantalla de login anónima, sin datos personales ni credenciales.
- **PR1 integrado:** merge b935b9dd9fe47e12445c0496958b40bcae719c53, 2026-10-05 17:38 Chile.
  Corrección de instalación: 56a8317; template de entorno: a9e0237. Local sincronizado por
  fast-forward, sin cambiar de rama ni sobrescribir trabajo ajeno.
- **Preview:** dpl_EmKsiWDTRiznziSP75TPezLSsrTf READY. Health mediante vercel curl con protección
  mantenida: login200, manifest200 y sesión anónima200; logo y checkbox presentes.
- **Production:** dpl_vD2foHBSmYvFBZTpwoP8ywbEJpXU READY, commit b935b9d.
  https://intranet.cooperapro.cl/login y https://track-residuos.vercel.app/login: 200 y nuevo logo/
  checkbox; manifest200, imagen46009 bytes idéntica al archivo versionado, sesión anónima200 sin
  usuario, ruta administrativa sin sesión307. No se cambió DNS ni claves de Production.
- **Visual real:** Chromium sobre dominio público390x844 y1440x900; imagen completa48/56px,
  campos46px, casilla desmarcada y labels accesibles. En móvil ancho/scroll390, sin overflow.
  Capturas y comparación antes/después en docs/qa/DEP-001.md; navegador de QA cerrado.
- **BD:** Production sin diff y22 EPP, sin nuevos cambios esta sesión. Preview separado actualizado
  con respaldo/hash ya registrados. Copias locales temporales de env remotos se eliminarán al cerrar;
  se conservan los respaldos y las variables originales de Vercel/.env.local.
- **Validaciones:** typecheck/349 tests/build79 páginas local OK; npm audit nivel low:0 hallazgos;
  auditor all-deploy sin bloqueos (avisos Python no aplican a Next). Builds Preview/Production OK.
  CI sobre9d32486 SUCCESS; ejecuciones nuevas56a8317/b935b9d siguen QUEUED en GitHub. No se
  afirma que esas ejecuciones pasaron ni se deshabilitó la CI. SEC-001 conserva seguimiento de cola.
- **Reversión verificada:** vercel rollback dpl_DZ4gX6XNQkh9wvMMaYGYBMrxxphn --yes. No ejecutada.
- **Entrega documental:** este cierre y evidencia se publicarán a master como documentación;
  cualquier build adicional asociado tendrá el mismo código de producción ya verificado.

## Plantilla para próximas entradas

Copiar esta plantilla al historial y actualizar también la tabla de tareas.

```markdown
### AAAA-MM-DD — ID-TAREA — Codex / Claude

- Solicitud y alcance:
- Responsable, rama y commit base:
- Archivos previstos / afectados:
- Cambios y decisiones:
- Verificación: comandos, resultados y límites de lo comprobado.
- Entrega Git: commit, PR, push verificado o motivo de publicación pendiente.
- Despliegue / BD: realizado y verificado, pendiente, o no aplica.
- Pendientes y siguiente responsable:
```
