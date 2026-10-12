# QA LOGIN-005 — Integración del login «Alba» con Elizabeth

Fecha: 2026-10-12 (America/Santiago). Implementación: Codex (rama aislada
`codex/login-alba-elizabeth`). Cierre, verificación y traspaso al checkout principal: Claude.
Diseño: [`docs/superpowers/specs/2026-10-11-login-alba-design.md`](../superpowers/specs/2026-10-11-login-alba-design.md);
revisión gráfica: [`LOGIN-004.md`](LOGIN-004.md).

## Portón

Ejecutado en `C:\dev\CentralCoopera`, rama `feat/login-alba`, sobre `9d692de` con los cambios
de LOGIN-005 sin commit.

| Comando                                | Resultado                                                  |
| -------------------------------------- | ---------------------------------------------------------- |
| `npm run typecheck`                    | exit 0                                                     |
| `npx vitest run`                       | 38 archivos, 413 pruebas OK (antes 35 / 393)               |
| `npm run build` (variables sintéticas) | exit 0; 79/79 páginas; `/login` 9,53 kB, First Load 127 kB |

Los `prisma:error` del build son esperados: la base es sintética y otras páginas consultan datos
al generarse. No se usó la base real ni cuentas reales.

## Recorrido en navegador

Servidor `next start` local con el build anterior; Chrome headless controlado por DevTools Protocol
([`LOGIN-005/interaccion.json`](LOGIN-005/interaccion.json)). Autenticación sin base: el intento
de ingreso devuelve el error de credenciales.

| Caso                                            | Resultado                                                                               | Evidencia                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Escritorio escala 4, movimiento reducido        | Alba completa estática; disco, Elizabeth, caja de control y ruma según spec             | [`escena-escala4-reducido.png`](LOGIN-005/escena-escala4-reducido.png) |
| Escritorio escala 3 (1100×700)                  | Todo el formulario dentro del disco; la casilla ocupa 2 líneas                          | [`escena-escala3-reducido.png`](LOGIN-005/escena-escala3-reducido.png) |
| Animado, al cargar                              | Intro `BUSCA` → `ILUMINADO`; `alba` avanza 0,26 → 0,91 en ~10 s; efectos `hd`           | `interaccion.json`                                                     |
| Foco en correo                                  | Fase `MIRA`                                                                             | `interaccion.json`                                                     |
| Foco en contraseña                              | Fase `TAPA_OJOS`: Elizabeth se da vuelta y se tapa los ojos                             | [`interaccion-foco-clave.png`](LOGIN-005/interaccion-foco-clave.png)   |
| Credenciales incorrectas                        | «Correo o contraseña incorrectos» dentro del disco; el saludo se oculta                 | [`interaccion-error.png`](LOGIN-005/interaccion-error.png)             |
| Móvil 390×844                                   | Login clásico sin escena; idéntico a producción (misma captura byte a byte)             | [`movil-clasico.png`](LOGIN-005/movil-clasico.png)                     |
| Costo de la capa HD (`data-hd-ms`, 30 muestras) | Mediana 0,2 ms; p95 0,3 ms; máx. observado 4,4 ms en un cuadro de regeneración de caché | `interaccion.json`                                                     |

## Límites de lo comprobado

- **Sin flujo autenticado real** ni navegación a `/` tras un ingreso correcto (`EXITO ≤ 800 ms`
  se cubre con pruebas unitarias de la máquina y la maqueta de LOGIN-004, no con una cuenta).
- **Rendimiento** medido en Chrome headless con render por software; no reemplaza una medición de
  60 fps en un PC de oficina real. El monitor de la escena congela en alba completa si no da.
- **Ancho 1024–1039 px**: en Chrome headless la escena no se monta (`data-scene-enabled=false`)
  aunque el CSS ya aplica el layout de escritorio; el formulario sigue operativo dentro del disco
  de respaldo. La detección (`matchMedia` en `page.tsx`) no cambió en LOGIN-005; queda como
  observación para revisar en un navegador real.
- Recorrido de Firefox: el de Codex en [`LOGIN-005/firefox-results.json`](LOGIN-005/firefox-results.json)
  quedó incompleto (`final_debug.state: null`); el recorrido válido es el de Chrome de esta página.
