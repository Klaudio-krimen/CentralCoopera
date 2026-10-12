# Maqueta de referencia — LOGIN-003 «Alba»

Maqueta aprobada por el usuario el 2026-10-11. Fija el **ambiente y la luz**; la geometría
definitiva está en [`../2026-10-11-login-alba-design.md`](../2026-10-11-login-alba-design.md).

- `maqueta.html` — abrir en el navegador. Botones: Noche (actual) / Alba (propuesta) / ↻ Amanecer.
  Hash `#t=6000` congela el amanecer en ese instante (ms); `#noche` abre la vista actual.
- `maqueta.js` — bundle de la maqueta (esbuild) con copias modificadas de `lib/login-escena/`.
- `alba.ts.txt` — fuente (TypeScript; extensión .txt para que el typecheck del repo no la compile) del motor de la maqueta: cielo vivo, disco, capa de luz HD. Referencia de
  técnicas; no se importa desde la app.
