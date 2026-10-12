# Capa de luz Alba

## Contrato

`crearCapaLuz()` crea recursos Canvas2D decorativos sólo en escritorio. `presentar(ctx,
buffer, estado, escala)` compone el buffer pixel 320×180 sobre el canvas de presentación
320×escala por 180×escala. No lee campos, no usa React y no instala listeners, temporizadores
ni requestAnimationFrame. El componente propietario decide cuándo renderizar y aisla cualquier
excepción de esta capa conservando la escena pixel y el formulario.

## Composición y cachés

- Vecino cercano para el arte; gradación soft-light, rayo/bruma screen, viñeta multiply,
  bloom lighter y grano overlay fijo de 2,2 %. La intensidad del rayo depende del alba.
- Gradación, rayo ancho, charco, bruma, viñeta y bloom de ventana se regeneran sólo cuando
  cambia la escala o el alba avanza 0,02. El final exacto alba=1 actualiza la caché.
- Canvases suaves a 2 px por píxel lógico limitan memoria incluso en escala12. La salida
  tiene la resolución CSS final. Los siete rayos finos y el cono/halo son caches locales.
- Por frame: composición de las caches, siete intensidades lentas y 90 motas escala1,
  alineadas a la grilla. Semillas, posiciones por reloj y grano son deterministas.
- El bloom extrae únicamente el paño de ventana y descarta luminancia≤168. La ampolleta
  usa un halo local precalculado. No se difuminan personaje, vestuario, aro ni textos.
- `ctx.filter` ausente implica caches sin desenfoque; el resto de la capa sigue operativo.
- El paño de ventana se repone después de la gradación. El disco completo se repone al final
  desde el buffer para preservar exactamente #2a344d y evitar texturas sobre el formulario.
- El estado reducido usa reloj fijo0 para los rayos y el polvo, sin animaciones propias;
  el componente renderiza sólo ante eventos. El mismo contrato sirve a congelación por lentitud.
- `destruir()` libera los backing stores; llamadas posteriores no dibujan.

## Verificación

Las curvas, geometría del haz, partículas, períodos de rayos y decisiones de cache viven en
`lib/login-escena/atmosfera.ts` y se prueban sin DOM. La escena integrada necesita QA de
escala3/4/6, azul del disco, movimiento reducido, ausencia de filtros, excepción de capa,
coste de composición y lazy loading móvil. La meta ≤4 ms se mide en el navegador; las caches
no equivalen a una garantía de rendimiento en cualquier equipo.
