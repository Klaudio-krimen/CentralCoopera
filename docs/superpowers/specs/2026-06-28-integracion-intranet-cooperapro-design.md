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

## Contexto descubierto

- El sitio principal `cooperapro.cl` es **HTML estático** (Tailwind por CDN + AOS),
  hecho a mano por KODE_, alojado en **Hostinger**. Archivo: `cooperapro-industrial/index.html`.
- El "ERP" es el archivo `portal-erp.html`, enlazado en `index.html` (línea 120)
  como botón **"Intranet"**. Es una subpágina estática, no un sistema real.
- El sitio **ya usa subdominios**: el botón "Aula Virtual" apunta a
  `https://aula.cooperapro.cl` (línea 119), que es una instalación de **Moodle**
  (subdominio interno de Hostinger, NO Vercel). Por lo tanto `intranet` será el
  **primer subdominio que apunta a un host externo** (Vercel) — mismo lugar (zona
  DNS de Hostinger) pero registro `CNAME` a Vercel en vez de un subdominio interno.
- El sitio estático se subió por el **File Manager del hPanel** de Hostinger.
- **TrackResiduos** es una app Next.js 14 desplegada en **Vercel**, con base de
  datos **Neon** y almacenamiento **Vercel Blob**. Funcionando.

## Decisiones tomadas (brainstorming)

1. **Subdominio:** `intranet.cooperapro.cl` (calza con el texto del botón "Intranet").
2. **Enfoque:** Subdominio → Vercel vía DNS de Hostinger. La app **sigue en Vercel**;
   no se migra a Hostinger. Mismo patrón que `aula.cooperapro.cl`.
   - Descartado: hostear en Hostinger (requiere VPS/Node, mucho trabajo, pierde
     deploys automáticos de Vercel).
   - Descartado: subcarpeta con reverse-proxy (frágil con Next.js basePath/auth).

---

## Sección 1 — DNS y dominio en Vercel

**En Vercel** (proyecto `track-residuos` → Settings → Domains):
- Add → `intranet.cooperapro.cl`.
- Vercel muestra el registro DNS a crear (normalmente `CNAME` → `cname.vercel-dns.com`).

**En Hostinger** (hPanel → Dominios → Zona DNS de `cooperapro.cl`):
- Crear registro **CNAME**: nombre `intranet`, destino `cname.vercel-dns.com`
  (el valor exacto que indique Vercel).

Tras propagar el DNS (minutos a ~2 h), Vercel emite el certificado SSL automático
y `https://intranet.cooperapro.cl` sirve la app. No se toca el servidor de Hostinger,
solo se agrega un registro en la zona DNS.

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

## Sección 3 — Edición del sitio web

En `cooperapro-industrial/`:

1. **Cambiar el botón "Intranet"** en `index.html` (línea 120):
   - De: `href="portal-erp.html"`
   - A: `href="https://intranet.cooperapro.cl"`
   - Se mantiene texto, clases y la flecha. Permanece en la misma pestaña
     (comportamiento actual; sin `target="_blank"`).

2. **Eliminar `portal-erp.html`** — local y en Hostinger.

3. **Re-subir `index.html`** (y aplicar el borrado de `portal-erp.html`) a Hostinger
   vía File Manager del hPanel o FTP.

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

- No se migra la app a Hostinger.
- No se unifican logins entre el sitio estático y la app (el sitio es público,
  la app tiene su propio login).
- No se rediseña el sitio estático más allá del cambio del enlace.
- Single Sign-On entre `aula.cooperapro.cl` e `intranet.cooperapro.cl` (no requerido).

## Notas

- Requiere acceso del usuario al panel de **Vercel** (dominios + env vars) y al
  **hPanel de Hostinger** (zona DNS + File Manager). Estos pasos son manuales;
  el plan los detallará como checklist guiado.
- El único cambio de código/archivo es en `cooperapro-industrial/index.html` y el
  borrado de `portal-erp.html`.
