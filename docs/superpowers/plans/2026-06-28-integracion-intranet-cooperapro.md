# Integración Intranet cooperapro.cl — Implementation Plan

> **For agentic workers:** Esta es una tarea de configuración de infraestructura, no de código de app. Mezcla pasos **manuales del usuario** (paneles de Vercel y SiteGround) con un paso **ejecutable por el agente** (editar el sitio + git push). Los pasos usan checkbox `- [ ]`. No hay TDD; cada tarea se cierra con una verificación concreta.

**Goal:** Servir TrackResiduos en `https://intranet.cooperapro.cl` y reemplazar el enlace del botón "Intranet" del sitio (hoy apunta al falso `portal-erp.html`) para que lleve a la app real.

**Architecture:** Tanto el sitio estático (`cooperapro-web`) como la app (`track-residuos`) ya están en Vercel. Se agrega `intranet.cooperapro.cl` como dominio del proyecto `track-residuos`, se crea un CNAME en la zona DNS de SiteGround, se ajusta `NEXTAUTH_URL`, y se actualiza el enlace del sitio por git push.

**Tech Stack:** Vercel (2 proyectos), SiteGround DNS, Next.js 14 + NextAuth, sitio estático HTML en repo `cooperapro-web`.

**Spec:** `docs/superpowers/specs/2026-06-28-integracion-intranet-cooperapro-design.md`

**Orden de seguridad:** primero se configura y verifica el subdominio (Tasks 1-4); solo cuando `intranet.cooperapro.cl` carga y el login funciona se apunta el botón público hacia él (Task 5). Así el botón del sitio nunca lleva a un dominio roto.

---

## Task 1: Agregar el dominio en Vercel (MANUAL — usuario)

**Dónde:** vercel.com → proyecto **`track-residuos`** → Settings → Domains.

- [ ] **Step 1: Agregar el dominio**

En el campo de dominio, escribir `intranet.cooperapro.cl` y pulsar **Add**.

- [ ] **Step 2: Anotar el registro DNS que pide Vercel**

Vercel mostrará una instrucción de configuración. Para un subdominio normalmente es:
- Tipo: `CNAME`
- Name/Host: `intranet`
- Value/Target: `cname.vercel-dns.com`

Anotar el **valor exacto** que muestre Vercel (puede variar). El dominio quedará en estado "Invalid Configuration" / "Pending" hasta crear el DNS en la Task 2 — es lo esperado.

- [ ] **Step 3: Verificación**

En la lista de Domains aparece `intranet.cooperapro.cl` con un aviso de configuración pendiente (aún no resuelto). Correcto por ahora.

---

## Task 2: Crear el CNAME en SiteGround (MANUAL — usuario)

**Dónde:** SiteGround → Site Tools del sitio de `cooperapro.cl` → **Domain → DNS Zone Editor**.

- [ ] **Step 1: Crear el registro CNAME**

Agregar un nuevo registro:
- Tipo: **CNAME**
- Name / Host: **`intranet`** (SiteGround completa el dominio solo; NO escribir `intranet.cooperapro.cl` completo si el panel ya agrega el dominio)
- Points to / Value: **`cname.vercel-dns.com`** (o el valor exacto de la Task 1, Step 2)
- TTL: el que venga por defecto (ej. 3600).

Guardar.

- [ ] **Step 2: Verificación de propagación**

Desde una terminal (esperar de minutos a ~2 h tras guardar):
```bash
nslookup intranet.cooperapro.cl
```
Expected: ya NO dice "Non-existent domain"; resuelve a una IP/host de Vercel (ej. un CNAME a `cname.vercel-dns.com` o una IP `216.198.79.x`).

- [ ] **Step 3: Verificación en Vercel**

En Vercel → `track-residuos` → Settings → Domains, `intranet.cooperapro.cl` pasa a estado **"Valid Configuration"** y Vercel emite el certificado SSL automáticamente. Abrir `https://intranet.cooperapro.cl` debe mostrar la pantalla de **login** de TrackResiduos sin error de certificado.

---

## Task 3: Configurar NEXTAUTH_URL + redeploy (MANUAL — usuario)

**Dónde:** Vercel → proyecto **`track-residuos`** → Settings → Environment Variables.

- [ ] **Step 1: Fijar la variable**

Buscar `NEXTAUTH_URL`:
- Si existe: editar su valor a `https://intranet.cooperapro.cl` (entorno **Production**).
- Si no existe: crearla — Key `NEXTAUTH_URL`, Value `https://intranet.cooperapro.cl`, entorno Production.

Guardar.

- [ ] **Step 2: Redeploy**

Vercel → `track-residuos` → Deployments → en el último deployment de Production, menú **⋯ → Redeploy** (sin caché si lo ofrece). Esto hace que la app tome el nuevo `NEXTAUTH_URL`.

- [ ] **Step 3: Verificación de login**

En `https://intranet.cooperapro.cl`, iniciar sesión como ADMIN (`admin@cooperapro.cl`).
Expected: el login redirige correctamente al dashboard de admin (sin quedarse en la página de login ni mostrar error de callback). Esto confirma que `NEXTAUTH_URL` quedó bien.

> Si el login redirige mal: revisar que `NEXTAUTH_URL` no tenga barra final ni `http://`, y que el redeploy haya terminado.

---

## Task 4: Verificar el subdominio antes de tocar el sitio (GATE)

- [ ] **Step 1: Confirmar las tres condiciones**

Antes de continuar a la Task 5, confirmar que TODO lo siguiente es verdadero:
1. `https://intranet.cooperapro.cl` carga el login sin error de certificado.
2. El login como ADMIN entra al dashboard (Task 3, Step 3).
3. El mapa y las secciones de la app funcionan en el dominio nuevo.

Si algo falla, NO avanzar: resolverlo en las Tasks 1-3. El botón público solo debe apuntar a un subdominio que ya funciona.

---

## Task 5: Actualizar el sitio web (AGENTE — repo cooperapro-web)

**Working directory:** `C:\Users\krmlo\OneDrive\Documentos\Proyecto Coopera Pro\Coopera Pro\cooperapro-industrial`
**Repo:** `cooperapro-web` (remoto en GitHub, deploy automático a Vercel).

**Files:**
- Modify: `index.html` (línea 120 — el enlace del botón "Intranet")
- Delete: `portal-erp.html`

- [ ] **Step 1: Cambiar el enlace del botón "Intranet"**

En `index.html`, reemplazar exactamente:
```html
                <a href="portal-erp.html" class="btn-main btn-nav-cta text-[10px] font-black px-5 py-2.5 rounded-full text-white uppercase">
```
por:
```html
                <a href="https://intranet.cooperapro.cl" class="btn-main btn-nav-cta text-[10px] font-black px-5 py-2.5 rounded-full text-white uppercase">
```
(Solo cambia el `href`; se mantienen texto, clases y la flecha. Queda en la misma pestaña.)

- [ ] **Step 2: Eliminar el portal falso**

Run:
```bash
git rm portal-erp.html
```
Expected: `rm 'portal-erp.html'`.

- [ ] **Step 3: Confirmar que ningún otro archivo enlaza a portal-erp.html**

Run:
```bash
grep -rn "portal-erp.html" . --include=*.html
```
Expected: sin resultados (solo se referenciaba desde `index.html`, ya cambiado). Si aparece otro archivo (ej. `indexOld.html`), es una versión vieja no servida — dejar como está salvo que el usuario indique lo contrario, y anotarlo.

- [ ] **Step 4: Commit + push (deploy automático)**

Run:
```bash
git add index.html
git commit -m "feat: apuntar boton Intranet a intranet.cooperapro.cl y quitar portal-erp falso"
git push origin HEAD
```
Expected: push exitoso. Vercel inicia un deploy automático del sitio `cooperapro-web`.

- [ ] **Step 5: Verificación**

Tras el deploy de Vercel (1-2 min):
1. Abrir `https://cooperapro.cl`, clic en el botón **"Intranet"** del menú → lleva a `https://intranet.cooperapro.cl` (login de la app).
2. Abrir `https://cooperapro.cl/portal-erp.html` → debe dar **404** (ya no existe).

---

## Notas

- **`demo-erp.html`** sigue en el repo y no se toca en este plan; si es un mockup que
  ya no se usa, su limpieza es un trabajo aparte.
- **Rebrand a "Rciklo":** la app se enlaza como "Intranet"; renombrarla visualmente a
  Rciklo (logos, títulos) queda fuera de alcance — trabajo separado si se desea.
- **Reversibilidad:** si algo falla, revertir el botón es un `git revert` del commit de
  la Task 5; el subdominio en Vercel se puede quitar desde Domains sin afectar el resto.
