---
name: verificar-porteros
description: Comprueba que toda ruta de app/api/finanzas/ tenga su portero de autorización y que ninguna use hasModuleAccess. Úsalo después de crear o editar cualquier route.ts de Finanzas, antes de commitear, y cuando lib/finanzas/routes.test.ts falle nombrando un archivo.
---

# Verificar porteros de Finanzas

## Cuándo usarlo

- Acabas de crear un `route.ts` nuevo bajo `app/api/finanzas/`.
- Editaste un handler existente de Finanzas.
- `npm run test` falló en `lib/finanzas/routes.test.ts` nombrando un archivo.
- Antes de commitear cualquier paso de §9 desde el paso 11 en adelante.
- Alguien pregunta si una ruta de Finanzas está protegida.

## Por qué existe

Este repo no puede correr tests de rutas: `vitest.config.ts` recoge sólo `lib/**/*.test.ts`. El
guardia estructural es el reemplazo, y este flujo es cómo se usa a mano cuando falla.

El middleware protege `/api/finanzas`, pero su `matcher` es una expresión regular que alguien puede
cambiar. La segunda capa —el portero dentro del handler— es la que sigue en pie si la primera se
rompe. Por eso ambas son obligatorias.

## Pasos

1. **Corre el guardia.**

   ```bash
   npx vitest run lib/finanzas/routes.test.ts
   ```

   Si pasa, salta al paso 5. Si falla, el mensaje nombra el o los archivos sin portero.

2. **Abre cada archivo que nombró** y agrega el portero correcto, después de resolver la sesión y
   antes de tocar la base:

   ```ts
   const session = await getServerSession(authOptions);
   if (!session) return apiError("No autorizado", 401);
   if (!hasFinanceAccess(session.user)) return apiError("Acceso denegado", 403);
   ```

   En un método de mutación (`POST`, `PATCH`), el portero es `canWriteFinance` en vez de
   `hasFinanceAccess`. En `app/api/finanzas/nominas/[id]/pago/route.ts` es `canWriteFinance`
   **únicamente**, porque esa ruta descifra cuentas bancarias.

3. **Comprueba que ningún archivo de Finanzas use el portero equivocado.**

   ```bash
   ! grep -rn "hasModuleAccess" app/api/finanzas/
   ```

   Un hit aquí es un defecto grave: `hasModuleAccess()` tiene bypass de ADMIN y dejaría entrar a
   cualquier administrador sin grant.

4. **Comprueba que cada método exportado tenga su portero, no sólo el archivo.** El guardia lee el
   archivo completo, así que un `GET` protegido y un `POST` desprotegido en el mismo archivo pasan el
   test. Ábrelo y confirma a ojo que cada `export async function` tiene su verificación.

5. **Corre la suite completa.**

   ```bash
   npm run test
   npm run typecheck
   ```

## Verify

```bash
npx vitest run lib/finanzas/routes.test.ts   # expect: exit 0, 0 failed, 0 skipped
! grep -rq "hasModuleAccess" app/api/finanzas/   # expect: exit 0 — ningún portero con bypass de ADMIN
npm run test                                  # expect: exit 0, 0 failed, 0 skipped
```

## No hagas

- **No desactives ni edites `lib/finanzas/routes.test.ts` para que pase.** Es el único mecanismo
  automático que este repo tiene para detectar una ruta de Finanzas sin protección.
- **No confíes en el middleware como única capa.** Su `matcher` es una regex editable; el portero
  del handler no lo es.
- **No uses `hasModuleAccess()` en Finanzas**, ni siquiera "temporalmente para probar".
- **No agregues un comentario con la palabra `hasFinanceAccess` para engañar al guardia.** Si estás
  tentado, la ruta no debería existir.
