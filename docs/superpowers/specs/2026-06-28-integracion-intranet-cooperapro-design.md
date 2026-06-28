# Diseño — Integrar TrackResiduos como Intranet de cooperapro.cl

**Fecha:** 2026-06-28
**Proyecto:** TrackResiduos (Coopera Pro) + sitio web cooperapro.cl
**Estado:** Aprobado por el usuario — pendiente de plan de implementación

---

## Objetivo

Reemplazar el portal ERP falso del sitio de Coopera Pro (un archivo estático
`portal-erp.html` que "no hace nada", enlazado en el menú como botón "Intranet")
por la app real TrackResiduos, sirviéndola en el subdominio
`intranet.cooperapro.cl`.

## Contexto descubierto (infraestructura real, verificada por DNS)

> El supuesto inicial ("sitio en Hostinger, subido por File Manager") resultó
> incorrecto al verificar los registros reales. La infraestructura viva es:

- El sitio principal `cooperapro.cl` es **HTML estático** (Tailwind por CDN + AOS),
  hecho a mano por KODE_. Vive en un **repo git** (`github.com/Klaudio-krimen/cooperapro-web`,
  carpeta local `cooperapro-industrial/`) y está **desplegado en Vercel** (proyecto
  `cooperapro-web`). El apex `cooperapro.cl` resuelve a `216.198.79.1` (IP de Vercel).
  Se actualiza con **git push** → deploy automático, NO por File Manager.
- El **DNS del dominio se gestiona en SiteGround** (`ns1.siteground.net` /
  `ns2.siteground.net`), no en Hostinger.
- El "ERP" es el archivo `portal-erp.html`, enlazado en `index.html` (línea 120)
  como botón **"Intranet"**. Es una subpágina estática, no un sistema real. El ERP
  real se marca como **"Rciklo"** en `PRODUCT.md` y en la landing — es decir,
  TrackResiduos es Rciklo.
- El botón "Aula Virtual" apunta a `https://aula.cooperapro.cl` (línea 119), una
  instalación de **Moodle en Google Cloud** (`34.174.206.92`).
- **TrackResiduos** es una app Next.js 14 desplegada en **Vercel** (proyecto
  `track-residuos`), con base de datos **Neon** y almacenamiento **Vercel Blob**.
  Funcionando. Mismo equipo/org de Vercel que el sitio.
- Como apex y app ya están en Vercel, la integración queda **toda en Vercel + git**.

## Decisiones tomadas (brainstorming)

1. **Subdominio:** `intranet.cooperapro.cl` (calza con el texto del botón "Intranet").
2. **Enfoque:** Subdominio → Vercel vía registro CNAME en la zona DNS de SiteGround.
   La app **sigue en Vercel**. Todo el cambio del sitio se hace por **git push** al
   repo `cooperapro-web` (deploy automático en Vercel).
   - Descartado: hostear en otro lado (requiere servidor Node; pierde deploys de Vercel).
   - Descartado: subcarpeta con reverse-proxy (frágil con Next.js basePath/auth).

---

## Sección 1 — DNS y dominio en Vercel

**En Vercel** (proyecto `track-residuos` → Settings → Domains):
- Add → `intranet.cooperapro.cl`.
- Vercel muestra el registro DNS a crear (normalmente `CNAME` → `cname.vercel-dns.com`).

**En SiteGround** (Site Tools → Domain → DNS Zone Editor de `cooperapro.cl`):
- Crear registro **CNAME**: nombre `intranet`, destino `cname.vercel-dns.com`
  (el valor exacto que indique Vercel).

Tras propagar el DNS (minutos a ~2 h), Vercel emite el certificado SSL automático
y `https://intranet.cooperapro.cl` sirve la app. Solo se agrega un registro en la
zona DNS de SiteGround; nada más cambia.

## Sección 2 — Autenticación con el dominio nuevo (crítico)

NextAuth usa `NEXTAUTH_URL` para construir las URLs de callback tras el login. Al
cambiar de la URL `*.vercel.app` al dominio propio, hay que actualizar la variable
o el login redirige mal ("callback mismatch").

**En Vercel** (Settings → Environment Variables):
- `NEXTAUTH_URL` = `https://intranet.cooperapro.cl` (entorno Production).
  Crear si no existe; actualizar si apunta al dominio viejo.
- **Redeploy** para que tome el cambio.

**No se toca** (ya quedó correcto en la auditoría de seguridad):
- `NEXTAUTH_SECRET` — el valor generado se mantiene.
- Cookies — `__Secure-next-auth.session-token` con `secure: true` funciona en el
  dominio HTTPS propio; la cookie queda atada a `intranet.cooperapro.cl`.
- `DATABASE_URL` / `DIRECT_URL` / Blob — intactos.

## Sección 3 — Edición del sitio web (repo `cooperapro-web`)

En el repo local `cooperapro-industrial/` (remoto `cooperapro-web` en GitHub,
deploy automático a Vercel):

1. **Cambiar el botón "Intranet"** en `index.html` (línea 120):
   - De: `href="portal-erp.html"`
   - A: `href="https://intranet.cooperapro.cl"`
   - Se mantiene texto, clases y la flecha. Permanece en la misma pestaña
     (comportamiento actual; sin `target="_blank"`).

2. **Eliminar `portal-erp.html`** (`git rm`).

3. **Commit + push** a `cooperapro-web` → Vercel despliega automáticamente. No hay
   File Manager: el deploy es por git. (Este paso lo puede ejecutar el agente
   directamente, ya que el repo está local.)

## Sección 4 — Verificación

En orden, tras configurar todo:
1. **DNS + SSL:** `https://intranet.cooperapro.cl` carga la pantalla de login de
   TrackResiduos sin error de certificado.
2. **Login:** entrar como ADMIN redirige correctamente al dashboard (confirma que
   `NEXTAUTH_URL` quedó bien).
3. **Botón del sitio:** desde `cooperapro.cl`, "Intranet" lleva a la app.
4. **ERP viejo eliminado:** `cooperapro.cl/portal-erp.html` devuelve 404.

---

## Fuera de alcance (YAGNI)

- No se cambia el hosting (todo sigue en Vercel).
- No se unifican logins entre el sitio estático y la app (el sitio es público,
  la app tiene su propio login).
- No se rediseña el sitio estático más allá del cambio del enlace.
- Single Sign-On entre `aula.cooperapro.cl` e `intranet.cooperapro.cl` (no requerido).
- No se renombra la app a "Rciklo" en esta etapa (solo se enlaza); el rebrand
  visual queda para un trabajo aparte si se desea.

## Notas

- **Pasos manuales del usuario** (requieren su panel): agregar el dominio
  `intranet.cooperapro.cl` en el proyecto Vercel `track-residuos`, crear el CNAME
  en la **zona DNS de SiteGround**, y fijar/redeploy `NEXTAUTH_URL`. El plan los
  detalla como checklist guiado.
- **Pasos que ejecuta el agente:** la edición de `index.html` + borrado de
  `portal-erp.html` + commit/push al repo `cooperapro-web`.
