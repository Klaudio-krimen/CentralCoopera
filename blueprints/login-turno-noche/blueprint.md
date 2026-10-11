# Login «Turno de noche» — Blueprint (v2: escena 100 % por código)

> Tarea: **LOGIN-002** en `REGISTRO_TRABAJO.md`. Plan: Claude, 2026-10-11. Ejecución: **Codex**.
> Orden de construcción: `tasks.json`. **Referencia visual y funcional aprobada por el usuario:**
> `referencia/turno-de-noche.html` (prototipo autónomo, ábrelo en el navegador antes de empezar).
> Si este documento contradice el código vigente, el código gana y se corrige aquí.

**Cambio respecto de la v1:** el usuario aprobó el prototipo hecho solo con código. **No hay
pixel artist ni archivos de imagen**: fondo, personaje, lámpara, luz y partículas se dibujan
por código en un canvas. `brief-pixel-artist.md` queda en pausa como opción futura.

---

## 1. Visión

El login de escritorio de Central Coopera muestra **la bodega y el taller de pallets de Coopera
Pro, de noche**, en pixel art estilo videojuego de los 90. Una operaria entra a oscuras con una
linterna, busca y enciende una lámpara industrial; la luz revela el **cartel del taller** donde
está el formulario. Mientras el usuario escribe, ella reacciona. Al entrar, baja una palanca y se
encienden los tubos fluorescentes: «comienza el turno».

## 2. Decisiones cerradas (usuario)

| Tema                 | Decisión                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| Escenario            | Bodega y taller de pallets de Coopera, de noche                                   |
| Arte                 | **100 % por código** (canvas), según `referencia/turno-de-noche.html`             |
| Dispositivos         | **Sólo escritorio**: `(min-width: 1024px) and (pointer: fine)`                     |
| Reacciones           | **Desde la v1**                                                                   |
| Colores del cartel   | **Colores de Coopera Pro: fondo azul y botón verde** (§8)                         |
| Logo                 | **Emblema de Coopera Pro en pixel art pintado en el muro**; se ilumina al iniciar turno (§8.1) |

## 3. Non-goals

| No se hace                                   | Por qué |
| -------------------------------------------- | ------- |
| Escena en celular o tablet                   | Choferes y recepción entran en terreno; cero espera y cero bytes extra |
| Imágenes, sprites PNG o artista en la v1     | Decisión del usuario; todo es código versionado y testeable |
| Sonido                                       | Molesto en oficina; se revisa tras la v1 |
| Motor de juego o librerías nuevas            | Política del repo: cero dependencias nuevas |
| Cambios en autenticación                     | `signIn`, `remember`, límites de sesión, recuperación y revocación quedan idénticos |
| Animar otras pantallas del ERP               | El ERP es denso y sobrio (`PRODUCT.md`); la escena es sólo la puerta de entrada |

## 4. Principio rector: la escena acompaña, nunca bloquea

1. El formulario existe en el DOM desde el primer render y se puede usar en < 1 s.
2. **Cualquier tecla, clic o foco en un campo** salta la intro al estado iluminado.
3. Primera visita ≈ 5 s; visitas siguientes ≈ 1,5 s; con `prefers-reduced-motion`, escena estática iluminada.
4. Un ingreso correcto **nunca** se retrasa más de 800 ms por la animación.
5. Si la escena falla (excepción, canvas no disponible, rendimiento), el usuario ve el login actual.

## 5. Guion (igual al prototipo)

### Intro

| t (1.ª visita) | Estado      | Qué se ve |
| -------------- | ----------- | --------- |
| 0–1,0 s        | `OSCURO`    | Bodega apagada, sólo luz de luna por la ventana. Formulario al 35 % de opacidad |
| 1,0–3,0 s      | `ENTRA`     | Entra caminando con linterna encendida (cono de luz hacia adelante) |
| 3,0–3,8 s      | `BUSCA`     | Mira atrás, luego hacia arriba con la linterna; encuentra la cadena |
| 3,8–4,5 s      | `ENCIENDE`  | Guarda la linterna y tira de la cadena; la lámpara titila (≤ 3 destellos/s) |
| 4,5–5,3 s      | `REVELA`    | El radio de luz crece con easing; el formulario sube a 100 % |
| →              | `ILUMINADO` | Reposo: respira, parpadea, la lámpara oscila, polvo flotando en la luz |

Visita repetida: `OSCURO` 0,3 s (ya está bajo la lámpara) → `ENCIENDE` 0,52 s (un solo titileo) → `REVELA` 0,6 s.

### Reacciones (desde `ILUMINADO`)

| Evento                    | Estado      | Pose |
| ------------------------- | ----------- | ---- |
| Foco en correo            | `MIRA`      | Mira el cartel, cabeza arriba, se inclina |
| Foco en contraseña        | `TAPA_OJOS` | Se da vuelta y se tapa los ojos con ambas manos |
| Blur sin otro foco        | `ILUMINADO` | Reposo |
| Error (credenciales/red)  | `ERROR`     | Se rasca el casco 1,2 s; la lámpara baja 1 vez a 45 % |
| `result.ok`               | `EXITO`     | Camina a la palanca, la baja; los tubos se encienden de izq. a der.; navega en ≤ 800 ms |
| 30 s sin actividad        | `SENTADA`   | Camina al pallet bajo y se sienta; cualquier evento la levanta |

La escena **sólo recibe tipos de evento**. Nunca el correo, la contraseña, su largo ni las teclas.

## 6. Máquina de estados

```
OSCURO → ENTRA → BUSCA → ENCIENDE → REVELA → ILUMINADO
(repetida) OSCURO → ENCIENDE → REVELA → ILUMINADO
SALTAR (tecla, clic, foco) desde cualquier estado de intro → estado según foco (MIRA | TAPA_OJOS | ILUMINADO)
ILUMINADO ⇄ MIRA ⇄ TAPA_OJOS
ILUMINADO|MIRA|TAPA_OJOS → ERROR → estado según foco
cualquiera salvo EXITO → EXITO (terminal; la página navega)
ILUMINADO|MIRA|TAPA_OJOS → (30 s) → SENTADA → (cualquier evento) → estado según foco
REDUCIDO: arranca en ILUMINADO, sin titileo, sin balanceo, sin polvo, poses instantáneas
```

Tiempos exactos y reglas: los del prototipo (`update()` en la referencia). Codex los traslada a
una **función pura** `transicion()` + `paso(estado, dt)` en `lib/login-escena/maquina.ts`.

## 7. Arquitectura

### 7.1 Cómo está hecho el prototipo (y cómo se porta)

| Técnica del prototipo | Detalle | Destino en el repo |
| --- | --- | --- |
| Lienzo lógico 320×180 | Escalado por CSS con `image-rendering: pixelated` | `lib/login-escena/escala.ts` |
| Fondo pre-renderizado | Se dibuja una vez a un canvas fuera de pantalla con `fillRect` y líneas Bresenham | `lib/login-escena/fondo.ts` |
| Operaria por piezas | Piernas, torso, cabeza, casco y brazos con ángulo y largo; espejo según `face`; pose por estado | `lib/login-escena/operaria.ts` |
| Lámpara péndulo + cadena | Ángulo amortiguado, cadena que se estira al tirar | `lib/login-escena/lampara.ts` |
| Luz por píxel | Cada frame: lee el buffer, calcula intensidad (lámpara, linterna, luna), aplica tramado Bayer 4×4 y una tabla de sombreado por color en 4 niveles (oscuro, medio, lámpara cálida, luz plena) | `lib/login-escena/luz.ts` |
| Emisivos | Luna, ampolleta, lente de la linterna, tubos y polvo se pintan después de la luz | `lib/login-escena/luz.ts` |
| Bucle | Un solo `requestAnimationFrame`, `dt` limitado a 50 ms | `components/login-escena/EscenaBodega.tsx` |

**Diseño testeable:** los módulos de `lib/login-escena/` son **puros** y no tocan el DOM. Dibujan
sobre una interfaz mínima `Pincel { rect(x, y, w, h, color) }` y la luz opera sobre un
`Uint32Array`. Así Vitest prueba poses, límites, niveles de luz y tiempos sin navegador. Imports
relativos, sin `@/`, sin React (regla del repo para `lib/**`).

### 7.2 Piezas

| Pieza | Ubicación | Notas |
| --- | --- | --- |
| Formulario (sin cambios de comportamiento) | `components/login/LoginForm.tsx` + `.spec.md` | Extraído de `page.tsx`; prop opcional `onEscenaEvento(tipo)` |
| Página | `app/(auth)/login/page.tsx` + `page.spec.md` | Layout actual en móvil/fallback; layout escena en escritorio |
| Máquina de estados | `lib/login-escena/maquina.ts` + test | Pura |
| Escalado y cartel | `lib/login-escena/escala.ts` + test | Escala entera `min(floor(vw/320), floor(vh/180))`, mínimo 3, letterbox centrado |
| Paleta | `lib/login-escena/paleta.ts` | Colores de la escena + marca (§8) |
| Fondo, operaria, lámpara, emblema | `lib/login-escena/{fondo,operaria,lampara,emblema}.ts` + tests | Puros sobre `Pincel` |
| Luz | `lib/login-escena/luz.ts` + test | Bayer, tabla de sombreado, niveles |
| Componente | `components/login-escena/EscenaBodega.tsx` + `.spec.md` | Canvas, bucle, eventos, fallback |

### 7.3 Carga

- **SSR:** en `lg` la página renderiza por CSS el contenedor oscuro de la escena (sin salto de
  layout al hidratar); en móvil, el layout actual. Nada de la escena se carga en móvil.
- **Cliente:** `EscenaBodega` vía `next/dynamic` con `ssr: false`, sólo si
  `matchMedia("(min-width: 1024px) and (pointer: fine)")`.
- `prefers-reduced-motion: reduce` → escena estática iluminada (un solo render, sin bucle).
- Si `getContext('2d')` falla o el componente lanza → layout actual (error boundary).
- Si el promedio de frame supera 50 ms durante 2 s → congelar en estático iluminado.
- Primera visita: `localStorage["login-escena-vista"]` con `try/catch`; sin almacenamiento =
  visita repetida.
- Pausa natural del bucle con la pestaña oculta (rAF); al volver, `dt` limitado.

### 7.4 Montaje del formulario

- El cartel ocupa el rectángulo lógico `x 214–310, y 22–136`; el formulario se posiciona en el
  área útil `x 221, y 28, w 82, h 102` multiplicada por la escala, con `font-size =
  clamp(11px, escala × 4.3px, 16px)`.
- En escritorio (≥ 1024 px) la escala mínima es 3, así que el formulario siempre va sobre el cartel.
- Fuente pixel **sólo** en el título del cartel: «Press Start 2P» autoalojada con
  `next/font/local` desde `components/login-escena/fonts/` (licencia OFL; cumple `font-src 'self'` y el build no
  depende de Google Fonts). El resto, Geist como hoy.

### 7.5 Seguridad y CSP

- Sin imágenes externas ni nuevas: todo es canvas. La CSP de `next.config.mjs` no se modifica.
- `LoginForm` emite sólo tipos de evento; la escena no ve valores.
- No cambian `signIn`, `remember`, mensajes de error, límites de sesión ni la navegación a `/`.

### 7.6 Accesibilidad

- Canvas con `aria-hidden="true"`; la escena no tiene elementos enfocables.
- El formulario conserva etiquetas, `role=alert`, foco visible y contraste AA (§8).
- Titileo ≤ 3 destellos por segundo (WCAG 2.3.1); sin titileo en modo reducido.

## 8. Colores del cartel de login (marca Coopera Pro)

Tomados del logo oficial `public/brand/coopera-pro-logo.png`. **Fondo azul y botón verde.**

| Token                | Valor     | Uso |
| -------------------- | --------- | --- |
| `--brand-blue`       | `#2a344d` | Fondo del cartel (también en el canvas) |
| `--brand-blue-deep`  | `#1c2438` | Fondo de los campos |
| (borde de campo)     | `#5d6a8c` | Borde de inputs |
| `--brand-green`      | `#5bbd2f` | Botón «Iniciar turno», título del cartel, casilla |
| `--brand-green-shadow` | `#3b8a1a` | Sombra inferior del botón (efecto tecla) |
| `--brand-ink`        | `#15203a` | Texto del botón |
| (texto)              | `#eef2f8` / `#d5dbe8` | Campos y etiquetas |
| (error)              | `#ff8a73` | Mensaje de error sobre azul |
| (foco)               | `#f2c230` | Contorno de foco (amarillo seguridad) |

### 8.1 Emblema de Coopera Pro en el muro

El logo oficial aparece **pintado en el muro de la bodega**, en el mismo pixel art de la escena
(sobre la ruma de pallets, centro en `(106, 36)`, radio 21 px lógicos):

- Círculo azul `#2a344d` con borde `#1a2132`, como el logo.
- **Ícono de reciclaje** reducido a una grilla de 18×18 desde `public/brand/coopera-pro-logo.png`
  (matriz `ICON` en la referencia), en verde `#5bbd2f`.
- Palabra **COOPERAPRO** en la fuente pixel de 3×5: «COOPERA» en crema `#efe9cf` y «PRO» en verde.
- Debajo, el rótulo «BODEGA 2» en amarillo seguridad.
- **Comportamiento:** a oscuras casi no se ve; la luz de la lámpara lo revela a medias con el
  tramado; en `EXITO`, cuando el barrido de luces lo alcanza, se enciende como letrero (halo verde
  de 1 px e ícono verde brillante `#8ae85a`). Sin parpadeo.
- El tagline («Recicla, coopera, prospera») **no** se incluye: es ilegible a esta resolución.
- Vive en `lib/login-escena/emblema.ts` (puro, sobre `Pincel`), con la matriz del ícono como dato.

Contrastes a verificar en la QA (objetivo AA): verde sobre azul ≈ 5:1; texto del botón sobre
verde ≈ 5:1; texto claro sobre azul > 10:1. El marco del cartel sigue siendo madera.

## 9. Criterios de aceptación

- WHEN el viewport es < 1024 px o el puntero no es fino THE SYSTEM SHALL mostrar el login actual sin cargar el chunk de la escena.
- WHEN se carga `/login` en escritorio THE SYSTEM SHALL permitir escribir en el correo en < 1 s.
- WHEN el usuario presiona una tecla, hace clic o enfoca un campo durante la intro THE SYSTEM SHALL pasar al estado según foco en el siguiente frame.
- WHEN `prefers-reduced-motion: reduce` está activo THE SYSTEM SHALL mostrar la escena iluminada estática.
- WHEN `signIn` devuelve `ok` THE SYSTEM SHALL navegar a `/` en ≤ 800 ms.
- WHEN la escena lanza un error THE SYSTEM SHALL mostrar el login actual con el formulario operativo.
- WHEN la escena recibe eventos THE SYSTEM SHALL recibir sólo tipos de evento.
- WHEN se mide el chunk de la escena THE SYSTEM SHALL pesar ≤ 40 KB gzip y mantener ~60 fps en un PC de oficina.
- WHEN se compara con `referencia/turno-de-noche.html` THE SYSTEM SHALL reproducir guion, poses, luz y colores del cartel.
- WHEN `npm run typecheck && npm run test && npm run build` corre THE SYSTEM SHALL salir 0.
- Cada componente o módulo nuevo tiene su `*.spec.md` o test; `app/(auth)/login/page.spec.md` se actualiza.

## 10. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Costo por frame del bucle de luz (57.600 píxeles) | Tabla de sombreado cacheada, sin `sqrt` innecesarios fuera del radio; congelar si > 50 ms |
| Salto de layout al hidratar | Contenedor de escena por CSS desde SSR |
| Regresión del login (UX-010, LOGIN-001) | Extraer el formulario sin cambiar comportamiento; `page.spec.md` como contrato |
| «Taparse los ojos» leído como vigilancia | Reacciona al foco, no al contenido |
| Personaje simple | Aprobado así; un artista puede pulirlo después sin cambiar la arquitectura (sólo `operaria.ts`) |

## 11. Decisiones abiertas

1. Si `EXITO` se muestra siempre o sólo en la primera entrada del día.
2. Sonido: fuera de v1.
