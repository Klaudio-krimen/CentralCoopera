# Login «Alba» — Diseño (LOGIN-003)

> Evolución de LOGIN-002 «Turno de noche» (en producción desde `ffe07bd`). Este documento manda
> sobre `blueprints/login-turno-noche/blueprint.md` sólo en lo que cambia; todo lo demás del
> blueprint (principio rector, non-goals, CSP, accesibilidad) sigue vigente.
> Referencia visual aprobada por el usuario: [`2026-10-11-login-alba/maqueta.html`](2026-10-11-login-alba/maqueta.html).
> La maqueta fija el **ambiente y la luz**; las cifras de geometría de este documento mandan sobre ella.

## 1. Visión

El login de escritorio pasa de la noche al **comienzo del día**. En Coopera Pro se trabaja de día:
la bodega amanece mientras el usuario entra. Por la ventana, el cielo pasa del azul previo al alba
a rosa, durazno y dorado; el sol asoma detrás de la **cordillera de los Andes** y un rayo de luz
cálida entra en diagonal con polvo flotando. El formulario deja el cartel rectangular y vive en un
**disco de acceso** centrado bajo la lámpara, donde la luz es más clara, con el borde y los colores
del emblema de Coopera Pro.

## 2. Decisiones cerradas (usuario)

| Tema                       | Decisión                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Forma del acceso           | **Circular**, centrado en el halo de la lámpara                                                                         |
| Ventana                    | **Tonalidades del alba**; el amanecer avanza en vivo al cargar la página                                                |
| Nivel visual               | Técnicas de programación gráfica de alto impacto (rayos volumétricos, bloom, gradación, polvo), aprobadas en la maqueta |
| Todo lo demás de LOGIN-002 | Se conserva: sólo escritorio, 100 % código, marca, reacciones, fallback                                                 |

## 3. Non-goals

Los de LOGIN-002 §3 siguen vigentes (sin móvil, sin imágenes, sin sonido, sin dependencias, sin
cambios de autenticación). Además:

| No se hace                        | Por qué                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| WebGL o shaders                   | Canvas 2D alcanza el resultado aprobado; WebGL agrega una segunda ruta de render, contexto perdido y otro fallback |
| Hora real del día en la escena    | La escena es siempre «alba»: es la metáfora del inicio de jornada, no un reloj                                     |
| Rediseñar el login móvil/fallback | Queda idéntico                                                                                                     |

## 4. Enfoque elegido

| Opción                                         | Resultado                           | Riesgo                                      | Decisión                               |
| ---------------------------------------------- | ----------------------------------- | ------------------------------------------- | -------------------------------------- |
| **A. Pixel art + capa de luz HD en Canvas 2D** | El de la maqueta                    | Costo por frame → se cachean las capas      | **Elegida**                            |
| B. Post-proceso WebGL                          | Igual o mejor, más rápido           | Ruta de render nueva, más código y fallback | Descartada (non-goal)                  |
| C. Sólo pixel art (todo en tramado)            | Sin rayos, bloom ni gradación suave | Mínimo                                      | Descartada: pierde el impacto aprobado |

## 5. Composición (coordenadas lógicas 320×180)

| Elemento             | Antes (LOGIN-002)                     | Ahora                                                                                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Formulario           | Cartel `x 214–310, y 22–136`          | **Disco** `DISCO = { cx: 184, cy: 94, r: 50 }`                                                         |
| Lámpara              | Péndulo `L = 52`, ancla `x 184`       | Péndulo **`L = 20`**: cuelga sobre el disco, no dentro                                                 |
| Cadena de la lámpara | Hasta `y 124` (tapada por el disco)   | **Se retira**                                                                                          |
| Caja de control      | Palanca en `x 202–209`, ducto `x 205` | Caja en **`x 246–252, y 122–134`** con **interruptor** (intro) y **palanca** (éxito); ducto en `x 249` |
| Operaria `HOME`      | `185`                                 | **`262`**, mirando al disco                                                                            |
| Operaria `SEAT`      | `128` (cruzaría tras el disco)        | **`294`**, sobre una ruma baja de pallets nueva en `x 282–310`                                         |
| `LEVER_X`            | `199`                                 | **`243`**                                                                                              |
| Cartel del taller    | Muro derecho                          | **Se retira**                                                                                          |
| Cajas sobre el rack  | Tapan la ventana                      | Se corren: la ventana queda despejada                                                                  |
| Ventana              | `x 22–62, y 24–48`, luna y estrellas  | Mismo marco; **cielo vivo** (§6.1)                                                                     |

## 6. Arte y luz

### 6.1 Cielo vivo (`lib/login-escena/cielo.ts`, puro)

- `pintarCielo(pixels, alba, reloj)` pinta el paño de la ventana (excluye parteluces `x 41–42` e
  `y 35–36`) **después** de la luz, como emisivo.
- Degradado vertical de 6 paradas interpolado entre dos keyframes: «previo al alba»
  (`#121534 → #7c4468`) y «salida del sol» (`#39407c → #ffd596`), con curva `t^0.62` para que el
  horizonte cálido ocupe más paño.
- Cuantización a 16 niveles por canal con **tramado Bayer 4×4**: degradado suave con textura pixel.
- **Cordillera**: perfil determinista (suma de 3 senos); perspectiva aérea (se aclara con `alba`);
  la fila de cumbre se tiñe de **arrebol** rosado (`#ff9fa8`).
- **Sol**: disco `r 4.6` en `x 50`, sube de `y 50` a `y 39` detrás de la cordillera; resplandor
  de dispersión cálido alrededor.
- **Nubes**: tres estrías a la deriva (0,35 px/s), techo lavanda y base iluminada desde abajo.
- **Estrellas**: se apagan con tramado a medida que sube `alba`.

### 6.2 Progreso del alba

- Nuevo campo puro en el estado: `EstadoEscena.alba ∈ [0, 1]`, calculado en `paso()` desde `reloj`:
  `alba = 0.12 + 0.88 · smoothstep(0, 1, reloj / 14000)`.
- Movimiento reducido o escena congelada por rendimiento: `alba = 1` (amanecer completo, estático).
- En `EXITO` el alba completa su recorrido dentro de `SUCCESS_MS`: `alba = máx(alba, alba₀ + (1 − alba₀) · e / SUCCESS_MS)` (el día «empieza» al entrar).

### 6.3 Luz pixel (`luz.ts`)

- Tabla de sombreado de **5 niveles (índices 0–4)**: los 4 actuales recalibrados al alba (sombras
  lavanda en vez de azul noche) y un nivel 4 **cálido durazno** para el rayo de la ventana:
  `0: [0.36,0.30,0.44] · 1: [0.80,0.66,0.70] · 2: [1,0.92,0.76] (lámpara) · 3: [1,1,1] · 4: [1,0.72,0.56]`.
- El mapa de la ventana (hoy `mapaLuna`) sigue igual en geometría; donde `nivelLuz` da 1 dentro de
  ese mapa se usa el nivel 4.
- La luna se retira de los emisivos; el sol vive en el cielo.

### 6.4 Disco de acceso (`fondo.ts` + emisivo en `luz.ts`)

- Se pinta **en el fondo**, igual que el cartel de hoy, y la lámpara lo revela en la intro.
- **Luz uniforme**: los píxeles del disco no usan su propio nivel, sino el nivel de luz del
  **centro del disco** (sin tramado sobre el texto). Con la lámpara en `L = 20` el centro está a
  47,6 px efectivos: queda oscuro mientras la lámpara parpadea en `ENCIENDE` (`R = 40`) y aparece
  cuando el halo crece en `REVELA`. Encendido, el centro da nivel 2.
- **Colores pre-compensados**: el cuerpo se pinta con `marca / nivel2` para que bajo el nivel 2
  (`[1, 0.92, 0.76]`) quede exactamente en el azul de marca `#2a344d`. La sensación de luz cenital
  (más claro arriba) la dan el degradado propio del disco y el toque de la capa HD (§6.5 paso 5).
- Borde `#1a2132` de 2 px; **filo superior iluminado** de 1 px; **aro verde** interior a `r − 5`.
- **Sombra proyectada** sobre el muro: el mismo círculo desplazado `(+3, +5)`, multiplicado por 0,58.
- **Destello** que recorre el aro (una vuelta cada 2,6 s): emisivo pintado después de la luz;
  estático en movimiento reducido.

### 6.5 Capa de luz HD (`components/login-escena/capaLuz.ts` + `lib/login-escena/atmosfera.ts`)

Se compone en un **canvas de presentación** a `320·escala` px CSS (`image-rendering: pixelated`).
El canvas 320×180 actual pasa a ser un buffer fuera de pantalla. Orden:

1. Escena pixel escalada con vecino más cercano.
2. **Gradación** (`soft-light`): lavanda arriba → cálido abajo; se calienta con `alba`.
3. **Rayo volumétrico** (`screen`): polígono del haz de la ventana con bordes difusos + 7 haces
   finos con parpadeo lento (períodos ≥ 1,9 s) + charco de luz elíptico en el piso. Intensidad
   `smoothstep(0.3, 1, alba)`.
4. **Polvo**: 90 motas que suben con deriva browniana, visibles sólo dentro del haz, dibujadas
   como cuadrados de 1 px lógico **alineados a la grilla**.
5. **Lámpara**: cono difuso y halo de la ampolleta (`lighter`), recortados fuera del disco (la luz
   cae sobre él sin lavarlo); dentro del disco, sólo un toque cenital de 16 %.
6. **Bruma** baja cálida y **viñeta** suave con tinte de alba.
7. El paño de la ventana se repone sin gradación ni viñeta (es fuente de luz).
8. **Bloom** sólo de fuentes conocidas (ventana y ampolleta): recorte reducido a 1/2 y 1/4,
   desenfocado y sumado (`lighter`).
9. **Grano** de película fijo pre-calculado, 5 % `overlay`.

**Presupuesto:** gradación, viñeta, bruma, haz y cono se pre-renderizan a canvases en caché al
cambiar la escala y cuando `alba` avanza ≥ 0,02 (≈ 45 regeneraciones durante el amanecer, cero
después). Por frame sólo hay `drawImage`, 7 haces y las motas. Meta: **≤ 4 ms por frame** de la capa
en un PC de oficina. Si `ctx.filter` no existe (Safari antiguo), las capas se pre-renderizan sin
desenfoque. Si la capa lanza, se desactiva y queda la escena pixel (la escena no cae al fallback por
la capa).

## 7. Guion (cambios respecto de LOGIN-002 §5)

| Fase                 | Cambio                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENTRA`              | Camina de `x −14` a `HOME 262`; en la oscuridad el disco aún no se ve                                                                       |
| `BUSCA`              | Igual (mira la lámpara)                                                                                                                     |
| `ENCIENDE`           | Acciona el **interruptor** de la caja (`brazo → (251, 124)`) en lugar de tirar la cadena; parpadeo de la lámpara igual                      |
| `REVELA`             | Igual: el halo crece y revela el disco                                                                                                      |
| `ILUMINADO` / `MIRA` | `face = −1`: mira el disco                                                                                                                  |
| `TAPA_OJOS`          | `face = 1`: se da vuelta y se tapa los ojos (no mira la contraseña)                                                                         |
| `SENTADA`            | Camina a `SEAT 294` y se sienta en la ruma nueva                                                                                            |
| `EXITO`              | Camina a `LEVER_X 243`, baja la palanca (`brazo → (251, 120 + 14·lever)`), se encienden los tubos y el emblema en neón; el alba se completa |

## 8. Formulario en el disco

- Área útil centrada en `(cx, cy)`, ancho `62` lógicos; `font-size = max(12px, escala × 4.1px)`
  **sin tope superior**, para que la composición escale entera con el disco.
- Contenido, de arriba abajo: título pixel «CENTRAL COOPERA» · saludo con ícono de sol · Correo ·
  Contraseña · «Mantener sesión iniciada en este equipo» (texto actual; puede ocupar 2 líneas) ·
  botón · mensaje de error.
- **Presupuesto vertical**: todo cabe dentro de la cuerda del círculo a `r − 6`. Cuando aparece el
  error (`role=alert`), el saludo se oculta para no salir del disco.
- **Saludo**: «Buenos días, equipo» si la hora local es antes de las 12:00; «Buenas tardes,
  equipo» después. Se calcula en cliente tras el montaje (sin desajuste de hidratación).
- **Botón**: conserva «INICIAR TURNO» (texto actual).
- Estilo pixel: campos con bisel de 2 px y foco dorado `#f2c230`; botón verde de marca con relieve
  que se hunde al presionar. Contraste AA igual que LOGIN-002 §8.
- `LoginForm.tsx` **no cambia de comportamiento**; sólo cambian CSS de la página, el saludo y el
  contenedor.

## 9. Piezas y archivos

| Archivo                                                  | Cambio                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/login-escena/escala.ts` (+test)                     | `CARTEL` → `DISCO`; `calcularEscala().formulario` devuelve la caja del disco                          |
| `lib/login-escena/maquina.ts` (+test)                    | `HOME`, `SEAT`, `LEVER_X`; `alba`; interruptor en `ENCIENDE`; caras de `ILUMINADO`/`MIRA`/`TAPA_OJOS` |
| `lib/login-escena/fondo.ts`                              | Sin cartel; cajas corridas; caja de control nueva; ruma de asiento; disco y su sombra                 |
| `lib/login-escena/lampara.ts`                            | `L = 20`; sin cadena; interruptor y palanca en la caja nueva                                          |
| `lib/login-escena/luz.ts` (+test)                        | 5 niveles; nivel cálido de ventana; luz uniforme del disco; sin luna; destello del aro                |
| `lib/login-escena/cielo.ts` (+test)                      | **Nuevo**: cielo vivo puro                                                                            |
| `lib/login-escena/atmosfera.ts` (+test)                  | **Nuevo**: geometría pura del haz, cono, motas, curvas de intensidad                                  |
| `lib/login-escena/paleta.ts`                             | Colores de alba, disco pre-compensado                                                                 |
| `components/login-escena/capaLuz.ts` (+`.spec.md`)       | **Nuevo**: capa HD con cachés (DOM, Canvas 2D)                                                        |
| `components/login-escena/EscenaBodega.tsx` (+`.spec.md`) | Buffer fuera de pantalla + canvas de presentación + capa                                              |
| `app/(auth)/login/login.css`, `page.tsx`, `page.spec.md` | Disco, saludo, tipografía escalada                                                                    |

Reglas del repo: `lib/**` puro, imports relativos, sin React; cada módulo nuevo con test o
`*.spec.md`; cero dependencias nuevas; la CSP no cambia.

## 10. Criterios de aceptación

Los de LOGIN-002 §9 siguen vigentes (móvil sin chunk, escribir en < 1 s, saltar intro, reducido
estático, `EXITO` ≤ 800 ms, fallback, sólo tipos de evento, ≤ 40 KB gzip, portón verde). Además:

- WHEN carga `/login` en escritorio THE SYSTEM SHALL mostrar el amanecer avanzando de `alba 0,12` a `1` en ~14 s.
- WHEN `prefers-reduced-motion: reduce` THE SYSTEM SHALL mostrar el alba completa, estática, sin motas en movimiento ni destello.
- WHEN la escala va de 3 a 12 THE SYSTEM SHALL contener título, campos, casilla, botón y error dentro del disco.
- WHEN aparece un error de credenciales THE SYSTEM SHALL ocultar el saludo y mantener el error dentro del disco.
- WHEN la lámpara está encendida THE SYSTEM SHALL mostrar el cuerpo del disco en `#2a344d` (± 1 nivel de cuantización) en la zona de texto.
- WHEN el usuario enfoca la contraseña THE SYSTEM SHALL mostrar a la operaria dándose vuelta y tapándose los ojos.
- WHEN corre en un PC de oficina THE SYSTEM SHALL mantener ~60 fps con la capa HD (capa ≤ 4 ms/frame); si no, congelar en alba completa.
- WHEN la capa HD lanza THE SYSTEM SHALL seguir mostrando la escena pixel y el formulario operativo.
- Titileo: ningún efecto supera 3 destellos/s (WCAG 2.3.1).

## 11. Riesgos

| Riesgo                                                 | Mitigación                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Costo de la capa HD en equipos modestos                | Cachés por escala/alba; por frame sólo composición; monitor existente congela  |
| `ctx.filter` ausente en Safari antiguo                 | Pre-render sin desenfoque                                                      |
| Formulario no cabe en el disco con error o en escala 3 | Presupuesto vertical §8; QA con capturas en escalas 3, 4 y 6 con y sin error   |
| DPR no entero (1,25 / 1,5)                             | El canvas de presentación trabaja en px CSS y escala con `pixelated`, como hoy |
| Regresión del guion                                    | Tests de `maquina.ts` para nuevas posiciones y caras                           |
| Tramado sobre el texto                                 | Luz uniforme del disco (nivel de su centro) y colores pre-compensados          |
